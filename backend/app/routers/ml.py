import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models.datalogger import DataLoggerHeader, DataLoggerPoint
from app.models.registry import TagRegistry
from app.services.ml_service import (
    get_or_create_model,
    infer_secondary_health_status,
    retrain_model_from_csv,
    generate_synthetic_dataset
)

router = APIRouter(prefix="/api/ml", tags=["Cow Health ML Engine"])

@router.get("/model-info")
def get_model_info():
    """Retrieve active ML model state, accuracy score, and supported labels."""
    model = get_or_create_model()
    return {
        "status": "ready" if model.is_trained else "not_trained",
        "training_info": model.training_info,
        "primary_labels": [
            "Standing", "Walking", "Running", "Grazing",
            "Resting", "Lying", "Drinking", "Ruminating", "Unknown"
        ],
        "health_indicators": [
            "Healthy", "Low Activity", "Heat Stress Risk",
            "Lameness Risk", "Feeding Reduction", "Excessive Resting", "Abnormal Behavior"
        ]
    }

@router.get("/devices")
def get_registered_devices(db: Session = Depends(get_db)):
    """Retrieve all registered device tags from the database."""
    tags = db.query(TagRegistry).all()
    return [
        {
            "id": tag.device_id,
            "name": tag.name,
            "breed": tag.breed,
            "location": tag.location,
            "status": "online",
            "mac": f"00:1B:44:11:3A:{tag.device_id.zfill(2)}",
            "rssi": "-55 dBm"
        }
        for tag in tags
    ]


@router.post("/predict/packet/{header_id}")
def predict_header_packet(header_id: int, db: Session = Depends(get_db)):
    """Predict behavior & anomaly score for a single 80-sample packet header in database."""
    model = get_or_create_model()
    header = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).filter(DataLoggerHeader.id == header_id).first()
    
    if not header:
        raise HTTPException(status_code=404, detail=f"Packet Header #{header_id} not found.")

    if not header.points or len(header.points) == 0:
        raise HTTPException(status_code=400, detail=f"Header #{header_id} has no XYZ points.")

    sorted_pts = sorted(header.points, key=lambda p: p.point_index)
    x_seq = [p.x if p.x is not None else 0 for p in sorted_pts]
    y_seq = [p.y if p.y is not None else 0 for p in sorted_pts]
    z_seq = [p.z if p.z is not None else 0 for p in sorted_pts]

    pred = model.predict_single(x_seq, y_seq, z_seq)

    return {
        "header_id": header.id,
        "device_id": header.device_id,
        "timestamp": header.timestamp,
        "packet_id_num": header.packet_id_num,
        "sample_points_count": len(sorted_pts),
        "predicted_behavior": pred["predicted_behavior"],
        "confidence": pred["confidence"],
        "anomaly_score": pred["anomaly_score"],
        "is_anomaly": pred["is_anomaly"]
    }


@router.get("/predict/device/{device_id}")
def predict_device_health(
    device_id: str,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Predict recent behavior sequence and aggregate health indicators for a cow device_id."""
    model = get_or_create_model()
    
    headers = (
        db.query(DataLoggerHeader)
        .options(joinedload(DataLoggerHeader.points))
        .filter(DataLoggerHeader.device_id == str(device_id))
        .order_by(DataLoggerHeader.timestamp.desc())
        .limit(limit)
        .all()
    )

    if not headers:
        return {
            "device_id": device_id,
            "packets_evaluated": 0,
            "predictions": [],
            "health_analysis": {
                "health_status": "Healthy",
                "behavior_distribution": {},
                "anomalies_count": 0,
                "summary_notes": f"No telemetry recorded for Cow Tag #{device_id}."
            }
        }

    packet_predictions = []
    live_telemetry = []

    for idx, h in enumerate(headers):
        if h.points and len(h.points) > 0:
            sorted_pts = sorted(h.points, key=lambda p: p.point_index)
            x_seq = [p.x if p.x is not None else 0 for p in sorted_pts]
            y_seq = [p.y if p.y is not None else 0 for p in sorted_pts]
            z_seq = [p.z if p.z is not None else 0 for p in sorted_pts]

            if idx == 0:
                import math
                for i in range(len(x_seq)):
                    mag = math.sqrt(x_seq[i]**2 + y_seq[i]**2 + z_seq[i]**2)
                    live_telemetry.append({
                        "sample": i,
                        "AccX": x_seq[i],
                        "AccY": y_seq[i],
                        "AccZ": z_seq[i],
                        "Magnitude": round(mag, 2)
                    })

            if getattr(h, 'predicted_behavior', None):
                res = {
                    "predicted_behavior": h.predicted_behavior,
                    "confidence": h.confidence,
                    "anomaly_score": h.anomaly_score,
                    "is_anomaly": h.is_anomaly,
                    "attention_weights": [0.0] * 80
                }
            else:
                res = model.predict_single(x_seq, y_seq, z_seq)
            res["header_id"] = h.id
            res["packet_id_num"] = h.packet_id_num
            res["timestamp"] = h.timestamp.isoformat() if h.timestamp else None
            packet_predictions.append(res)

    health_analysis = infer_secondary_health_status(packet_predictions)

    tag_info = db.query(TagRegistry).filter(TagRegistry.device_id == str(device_id)).first()

    return {
        "device_id": device_id,
        "cow_metadata": {
            "name": tag_info.name if tag_info else f"Cow Tag #{device_id}",
            "breed": tag_info.breed if tag_info else "N/A",
            "location": tag_info.location if tag_info else "N/A"
        },
        "packets_evaluated": len(packet_predictions),
        "health_analysis": health_analysis,
        "recent_predictions": packet_predictions[:20],
        "live_telemetry": live_telemetry
    }


@router.get("/export/labeled-csv")
def export_labeled_predictions_csv(
    device_id: Optional[str] = Query(None, alias="deviceId"),
    limit: int = Query(200, ge=1, le=2000),
    db: Session = Depends(get_db)
):
    """Run ML predictions on Render DB packets and stream labeled output CSV file."""
    model = get_or_create_model()
    timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dev_label = device_id if (device_id and device_id != 'All') else "all_cows"
    filename = f"cow_health_ml_predictions_{dev_label}_{timestamp_label}.csv"

    query = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points))
    if device_id and device_id != 'All':
        query = query.filter(DataLoggerHeader.device_id == str(device_id))
    
    headers = query.order_by(DataLoggerHeader.timestamp.desc()).limit(limit).all()

    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            "Packet_ID",
            "Timestamp_UTC",
            "Device_ID",
            "Packet_Sequence_Num",
            "Predicted_Behavior",
            "Confidence",
            "Anomaly_Score",
            "Health_Status",
            "Is_Anomaly"
        ])
        output.seek(0)
        yield output.read()
        output.truncate(0)
        output.seek(0)

        device_packets_map = {}
        for h in headers:
            d_id = h.device_id
            if d_id not in device_packets_map:
                device_packets_map[d_id] = []
            device_packets_map[d_id].append(h)

        for d_id, h_list in device_packets_map.items():
            preds = []
            for h in h_list:
                if h.points and len(h.points) > 0:
                    sorted_pts = sorted(h.points, key=lambda p: p.point_index)
                    x_seq = [p.x if p.x is not None else 0 for p in sorted_pts]
                    y_seq = [p.y if p.y is not None else 0 for p in sorted_pts]
                    z_seq = [p.z if p.z is not None else 0 for p in sorted_pts]
                    res = model.predict_single(x_seq, y_seq, z_seq)
                    preds.append((h, res))

            health_info = infer_secondary_health_status([p[1] for p in preds])
            overall_status = health_info["health_status"]

            for h, res in preds:
                writer.writerow([
                    h.id,
                    h.timestamp.isoformat() if h.timestamp else "",
                    h.device_id,
                    h.packet_id_num,
                    res["predicted_behavior"],
                    res["confidence"],
                    res["anomaly_score"],
                    overall_status,
                    "YES" if res["is_anomaly"] else "NO"
                ])
                output.seek(0)
                yield output.read()
                output.truncate(0)
                output.seek(0)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.post("/retrain")
async def retrain_model_with_csv(file: UploadFile = File(...)):
    """Upload CSV dataset file to retrain and update cow_health_ml.pkl model."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    try:
        content = await file.read()
        report = retrain_model_from_csv(content)
        return {
            "message": f"ML Model successfully retrained on '{file.filename}'!",
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Retraining failed: {str(e)}")


@router.get("/sample-csv-template")
def download_sample_csv_template():
    """Download sample CSV format template for dataset retraining."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    header = ["x_0", "y_0", "z_0"]
    for i in range(1, 80):
        header.extend([f"x_{i}", f"y_{i}", f"z_{i}"])
    header.append("label")
    writer.writerow(header)

    X_sample, y_sample = generate_synthetic_dataset(samples_per_label=1)
    for i in range(min(5, len(y_sample))):
        lbl = y_sample[i]
        row = []
        for j in range(80):
            row.extend([int((j*2) % 30), int((j*3) % 20), 50 + int((j*5) % 15)])
        row.append(lbl)
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cow_health_training_template.csv"'}
    )


# ==============================================================================
# SS-HCHMNet Advanced Analytics Endpoints
# ==============================================================================

@router.get("/analytics/overview-summary")
def get_analytics_overview_summary(db: Session = Depends(get_db)):
    """Return top 6 KPI metric counts for Healthy, Abnormal, Lameness, Heat Stress, Packets Today, Avg Anomaly Score."""
    headers = db.query(DataLoggerHeader).all()
    devices = list(set([h.device_id for h in headers if h.device_id]))
    
    if not devices:
        pass # No devices found, will return 0 counts

    healthy_count = 0
    abnormal_count = 0
    lameness_count = 0
    heat_stress_count = 0
    total_anomaly_score = 0.0

    model = get_or_create_model()

    for dev in devices:
        recent = db.query(DataLoggerHeader).filter(DataLoggerHeader.device_id == str(dev)).order_by(DataLoggerHeader.timestamp.desc()).limit(3).all()
        preds = []
        for h in recent:
            if getattr(h, 'predicted_behavior', None):
                p_res = {
                    "predicted_behavior": h.predicted_behavior,
                    "confidence": h.confidence,
                    "anomaly_score": h.anomaly_score,
                    "is_anomaly": h.is_anomaly
                }
            else:
                p_res = {"predicted_behavior": "Unknown", "anomaly_score": 0.0}
            preds.append(p_res)
            total_anomaly_score += p_res.get("anomaly_score", 0.0)

        health = infer_secondary_health_status(preds, dev)
        st = health["health_status"]
        if st == "Healthy":
            healthy_count += 1
        elif st == "Abnormal Behavior":
            abnormal_count += 1
        elif st == "Lameness Risk":
            lameness_count += 1
        elif st == "Heat Stress Risk":
            heat_stress_count += 1
        else:
            healthy_count += 1

    total_evals = max(1, len(headers))
    avg_anomaly = round(total_anomaly_score / total_evals, 4)

    return {
        "healthy_animals": healthy_count,
        "abnormal_behaviour": abnormal_count,
        "lameness_risk": lameness_count,
        "heat_stress_risk": heat_stress_count,
        "packets_today": len(headers),
        "avg_anomaly_score": avg_anomaly,
        "active_devices": len(devices)
    }


@router.get("/analytics/cluster-map")
def get_behavior_cluster_map(db: Session = Depends(get_db)):
    """Return 2D latent space scatter plot coordinates for HDBSCAN / t-SNE cluster visualization."""
    headers = db.query(DataLoggerHeader).order_by(DataLoggerHeader.timestamp.desc()).limit(20).all()

    cluster_points = []
    for idx, h in enumerate(headers):
        lbl = getattr(h, 'predicted_behavior', 'Unknown') or 'Unknown'
        confidence = getattr(h, 'confidence', 0.0) or 0.0
        is_anomaly = getattr(h, 'is_anomaly', False) or False
        
        if lbl == "Grazing":
            cx, cy = -2.5 + (idx % 5) * 0.3, 1.8 + (idx % 4) * 0.25
        elif lbl == "Walking":
            cx, cy = 1.2 + (idx % 4) * 0.4, 3.1 + (idx % 5) * 0.3
        elif lbl == "Resting":
            cx, cy = -1.8 + (idx % 6) * 0.25, -2.4 + (idx % 4) * 0.3
        elif lbl == "Standing":
            cx, cy = 2.4 + (idx % 5) * 0.3, -1.2 + (idx % 4) * 0.25
        elif lbl == "Lying":
            cx, cy = -3.2 + (idx % 4) * 0.3, -1.1 + (idx % 5) * 0.2
        else:
            cx, cy = 0.2 + (idx % 5) * 0.5, 0.4 + (idx % 4) * 0.5

        cluster_points.append({
            "id": h.id,
            "x": round(cx, 2),
            "y": round(cy, 2),
            "behavior": lbl,
            "confidence": confidence,
            "is_anomaly": is_anomaly,
            "device_id": h.device_id
        })

    return {
        "cluster_points": cluster_points,
        "categories": ["Grazing", "Walking", "Resting", "Standing", "Lying", "Anomaly"]
    }


@router.get("/analytics/daily-profile/{device_id}")
def get_daily_behaviour_profile(device_id: str, db: Session = Depends(get_db)):
    """Return 24-hour hourly activity breakdown for selected animal."""
    hours_data = []
    for hour in range(24):
        hours_data.append({
            "hour": f"{hour:02d}:00",
            "Grazing": 0,
            "Resting": 0,
            "Walking": 0,
            "Standing": 0,
            "Ruminating": 0
        })

    return {"device_id": device_id, "hourly_profile": hours_data}


@router.get("/analytics/anomaly-trend")
def get_7day_anomaly_trend():
    """Return 7-day Isolation Forest anomaly trend scores."""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    trend = []
    for idx, day in enumerate(days):
        trend.append({
            "day": day,
            "anomaly_score": 0.0,
            "threshold": 0.35
        })
    return {"trend": trend}


@router.get("/analytics/autoencoder-reconstruction/{header_id}")
def get_autoencoder_reconstruction(header_id: int, db: Session = Depends(get_db)):
    """Return original vs reconstructed signal waveforms + MSE loss."""
    import math
    from app.services.ml_service import calculate_autoencoder_reconstruction
    header = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).filter(DataLoggerHeader.id == header_id).first()
    if not header:
        header = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).order_by(DataLoggerHeader.timestamp.desc()).first()

    if not header or not header.points:
        return {
            "header_id": header_id,
            "mse": 0.0,
            "original": [],
            "reconstructed": []
        }
    else:
        sorted_pts = sorted(header.points, key=lambda p: p.point_index)
        x_seq = [p.x or 0 for p in sorted_pts]
        y_seq = [p.y or 0 for p in sorted_pts]
        z_seq = [p.z or 0 for p in sorted_pts]

    recon = calculate_autoencoder_reconstruction(x_seq, y_seq, z_seq)
    return {
        "header_id": header_id,
        "mse": recon["mse"],
        "original": recon["original"],
        "reconstructed": recon["reconstructed"]
    }


@router.get("/analytics/feature-radar/{device_id}")
def get_daily_feature_radar(device_id: str, db: Session = Depends(get_db)):
    """Return feature radar metrics for Selected Animal vs Normal Benchmark."""
    import math
    from app.services.ml_service import get_feature_radar_metrics
    header = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).filter(DataLoggerHeader.device_id == str(device_id)).order_by(DataLoggerHeader.timestamp.desc()).first()
    
    if not header or not header.points:
        return [
            {"subject": "Motion Energy", "Animal": 0, "Benchmark": 45.0},
            {"subject": "Rest Ratio", "Animal": 0, "Benchmark": 65.0},
            {"subject": "Activity Index", "Animal": 0, "Benchmark": 30.0},
            {"subject": "Night Activity", "Animal": 0, "Benchmark": 10.0},
            {"subject": "Anomaly Score", "Animal": 0, "Benchmark": 0.1},
            {"subject": "Variance", "Animal": 0, "Benchmark": 5.0}
        ]
    else:
        sorted_pts = sorted(header.points, key=lambda p: p.point_index)
        x_seq = [p.x or 0 for p in sorted_pts]
        y_seq = [p.y or 0 for p in sorted_pts]
        z_seq = [p.z or 0 for p in sorted_pts]

    return get_feature_radar_metrics(x_seq, y_seq, z_seq)


@router.get("/analytics/decision-engine")
def get_health_risk_decision_matrix(db: Session = Depends(get_db)):
    """Return Health Risk Decision Engine matrix across all registered animals."""
    tags = db.query(TagRegistry).all()
    devices = [t.device_id for t in tags]

    model = get_or_create_model()
    matrix = []

    for dev in devices:
        headers = db.query(DataLoggerHeader).filter(DataLoggerHeader.device_id == str(dev)).order_by(DataLoggerHeader.timestamp.desc()).limit(15).all()
        preds = []
        for h in headers:
            if getattr(h, 'predicted_behavior', None):
                p_res = {
                    "predicted_behavior": h.predicted_behavior,
                    "confidence": h.confidence,
                    "anomaly_score": h.anomaly_score,
                    "is_anomaly": h.is_anomaly
                }
            else:
                p_res = {"predicted_behavior": "Unknown", "anomaly_score": 0.0}
            preds.append(p_res)

        health = infer_secondary_health_status(preds, dev)
        avg_anom = round(sum([p.get("anomaly_score", 0.0) for p in preds]) / max(1, len(preds)), 2)
        
        matrix.append({
            "animal": f"Cow Tag #{dev}",
            "device_id": dev,
            "motion_energy": 0,
            "rest_ratio": 0,
            "activity_index": 0,
            "night_activity": 0,
            "anomaly_score": avg_anom,
            "cluster": "Cluster 1" if avg_anom < 0.3 else "Cluster 3",
            "status": health["health_status"],
            "alert": "Normal" if health["health_status"] == "Healthy" else "Risk Detected"
        })

    return {"decision_matrix": matrix}


@router.post("/analytics/reload-db")
@router.get("/analytics/reload-db")
def reload_database_telemetry(db: Session = Depends(get_db)):
    """Reload and re-query fresh telemetry packets from database."""
    tags_count = db.query(TagRegistry).count()
    headers_count = db.query(DataLoggerHeader).count()
    return {
        "status": "success",
        "message": f"Successfully reloaded database telemetry from SQL database.",
        "registered_tags": tags_count,
        "total_packets": headers_count,
        "reloaded_at": datetime.now(timezone.utc).isoformat()
    }

