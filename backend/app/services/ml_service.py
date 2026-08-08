import io
import os
import math
import random
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

MODEL_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "cow_health_ml.pkl")

# Primary prediction target labels
PRIMARY_LABELS = [
    "Standing",
    "Walking",
    "Running",
    "Grazing",
    "Resting",
    "Lying",
    "Drinking",
    "Ruminating",
    "Heat Stress Risk",
    "Unknown"
]

# Secondary health indicators
HEALTH_INDICATORS = [
    "Healthy",
    "Low Activity",
    "Heat Stress Risk",
    "Lameness Risk",
    "Feeding Reduction",
    "Excessive Resting",
    "Abnormal Behavior"
]


def extract_window_features(x_seq, y_seq, z_seq):
    """Extract statistical time-series features and raw window values from an 80-sample 3-axis window."""
    x = np.asarray(x_seq, dtype=float)[:80]
    y = np.asarray(y_seq, dtype=float)[:80]
    z = np.asarray(z_seq, dtype=float)[:80]

    if len(x) < 80:
        x = np.pad(x, (0, 80 - len(x)), 'edge')
        y = np.pad(y, (0, 80 - len(y)), 'edge')
        z = np.pad(z, (0, 80 - len(z)), 'edge')

    mag = np.sqrt(x*x + y*y + z*z)

    features = []
    for arr in (x, y, z, mag):
        m = float(np.mean(arr))
        s = float(np.std(arr))
        mn = float(np.min(arr))
        mx = float(np.max(arr))
        rms = float(np.sqrt(np.mean(arr*arr)))
        features.extend([m, s, mn, mx, rms, mx - mn, 0.0])

    features.extend([0.0, 0.0, 0.0])
    features.extend(x)
    features.extend(y)
    features.extend(z)

    return np.array(features, dtype=float)


def generate_synthetic_dataset(samples_per_label=150):
    """Generate synthetic time-series accelerometer telemetry for initial ML model training."""
    np.random.seed(42)
    X_list = []
    y_list = []

    behaviors = [
        "Standing", "Walking", "Running", "Grazing",
        "Resting", "Lying", "Drinking", "Ruminating"
    ]

    t = np.linspace(0, 8, 80)

    for label in behaviors:
        for _ in range(samples_per_label):
            if label == "Standing":
                x = np.random.normal(2, 1.5, 80) + np.sin(2 * np.pi * 0.2 * t)
                y = np.random.normal(1, 1.5, 80) + np.cos(2 * np.pi * 0.2 * t)
                z = np.random.normal(62, 2.0, 80)
            elif label == "Resting":
                x = np.random.normal(0, 0.5, 80)
                y = np.random.normal(0, 0.5, 80)
                z = np.random.normal(64, 0.8, 80)
            elif label == "Lying":
                x = np.random.normal(55, 2.0, 80)
                y = np.random.normal(12, 1.5, 80)
                z = np.random.normal(15, 1.5, 80)
            elif label == "Walking":
                freq = np.random.uniform(1.2, 1.8)
                x = 10 * np.sin(2 * np.pi * freq * t) + np.random.normal(5, 2, 80)
                y = 5 * np.cos(2 * np.pi * freq * t) + np.random.normal(2, 2, 80)
                z = 50 + 15 * np.sin(2 * np.pi * freq * t * 2) + np.random.normal(0, 3, 80)
            elif label == "Running":
                freq = np.random.uniform(3.0, 4.0)
                x = 35 * np.sin(2 * np.pi * freq * t) + np.random.normal(10, 5, 80)
                y = 20 * np.cos(2 * np.pi * freq * t) + np.random.normal(5, 5, 80)
                z = 40 + 35 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 6, 80)
            elif label == "Grazing":
                freq = np.random.uniform(0.4, 0.7)
                x = 15 * np.sin(2 * np.pi * freq * t) + np.random.normal(8, 3, 80)
                y = 8 * np.cos(2 * np.pi * freq * t) + np.random.normal(4, 2, 80)
                z = 25 + 8 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 2.5, 80)
            elif label == "Drinking":
                x = np.random.normal(5, 1.5, 80) + 3 * np.sin(2 * np.pi * 0.3 * t)
                y = np.random.normal(3, 1.0, 80)
                z = 18 + 4 * np.sin(2 * np.pi * 2.5 * t) + np.random.normal(0, 1.5, 80)
            elif label == "Ruminating":
                freq = 2.0
                x = np.random.normal(2, 1.0, 80) + 3 * np.sin(2 * np.pi * freq * t)
                y = np.random.normal(1, 1.0, 80) + 2 * np.cos(2 * np.pi * freq * t)
                z = 60 + 5 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 1.2, 80)

            feat = extract_window_features(x, y, z)
            X_list.append(feat)
            y_list.append(label)

    return np.array(X_list), np.array(y_list)


class CowHealthMLPipeline:
    def __init__(self):
        self.scaler = StandardScaler()
        self.classes_ = np.array([
            "Standing", "Walking", "Running", "Grazing",
            "Resting", "Lying", "Drinking", "Ruminating", "Heat Stress Risk"
        ])
        self.classifier = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42)
        self.anomaly_detector = IsolationForest(contamination=0.04, random_state=42)
        self.is_trained = False
        self.training_info = {}

    def train(self, X, y, epochs=5, batch_size=512, lr=0.01):
        # 1. Scale tabular summary features
        X_scaled = self.scaler.fit_transform(X)
        
        # 2. Train Anomaly Detector
        self.anomaly_detector.fit(X_scaled)

        # 3. Train Random Forest Classifier
        self.classifier.fit(X_scaled, y)
        
        # Evaluate Accuracy
        preds_all = self.classifier.predict(X_scaled)
        acc = float(accuracy_score(y, preds_all))

        self.is_trained = True
        self.training_info = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "architecture": "Random Forest Classifier (Scikit-Learn)",
            "accuracy": round(acc, 4),
            "sample_count": len(y),
            "classes": self.classifier.classes_.tolist()
        }
        return self.training_info

    def predict_single(self, x_seq, y_seq, z_seq):
        if not self.is_trained:
            raise RuntimeError("ML Model is not trained yet.")

        # Extract features and scale
        feat = extract_window_features(x_seq, y_seq, z_seq).reshape(1, -1)
        feat_scaled = self.scaler.transform(feat)

        # Classify
        probs = self.classifier.predict_proba(feat_scaled)[0]
        max_idx = int(np.argmax(probs))
        confidence = float(round(float(probs[max_idx]), 2))
        predicted_behavior = str(self.classifier.classes_[max_idx])

        # Anomaly score via IsolationForest
        raw_anomaly_score = self.anomaly_detector.score_samples(feat_scaled)[0]
        anomaly_score = float(np.clip(round(float((0.2 - raw_anomaly_score) / 0.8), 2), 0.0, 1.0))
        is_anomaly = bool(self.anomaly_detector.predict(feat_scaled)[0] == -1)

        if confidence < 0.20 and anomaly_score > 0.95:
            predicted_behavior = "Unknown"

        return {
            "predicted_behavior": predicted_behavior,
            "confidence": confidence,
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "attention_weights": [0.0] * 80
        }


ml_pipeline = CowHealthMLPipeline()


def get_or_create_model():
    """Load existing pickled model from disk or train a new baseline model if not present."""
    global ml_pipeline
    
    # Cache check: if it's already loaded into memory, don't load from disk again!
    if getattr(ml_pipeline, 'is_trained', False):
        return ml_pipeline

    model_dir = os.path.dirname(MODEL_FILE_PATH)
    if not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)

    if os.path.exists(MODEL_FILE_PATH):
        try:
            loaded_pipeline = joblib.load(MODEL_FILE_PATH)
            ml_pipeline = loaded_pipeline
            print(f"[ML Model] Loaded trained ML model pickle from: {MODEL_FILE_PATH}")
            return ml_pipeline
        except Exception as e:
            print(f"[ML Model Warning] Failed to load pickle file: {e}. Retraining fresh baseline model...")

    print("[ML Model] Training baseline Cow Health ML model on synthetic accelerometer dataset...")
    X, y = generate_synthetic_dataset(samples_per_label=150)
    ml_pipeline.train(X, y)
    
    try:
        joblib.dump(ml_pipeline, MODEL_FILE_PATH)
        print(f"[ML Model] Saved baseline ML model pickle to: {MODEL_FILE_PATH}")
    except Exception as e:
        print(f"[ML Model Error] Failed to save model pickle file: {e}")

    return ml_pipeline


def infer_secondary_health_status(predictions_list, device_id=None):
    """Derive higher-level health indicators from a sequence of predicted behaviors over time for a device_id."""

    if not predictions_list:
        return {
            "health_status": "Healthy",
            "behavior_distribution": {},
            "anomalies_count": 0,
            "summary_notes": "No telemetry packets found for health inference."
        }

    total_packets = len(predictions_list)
    behavior_counts = {}
    anomaly_count = 0

    for p in predictions_list:
        b = p.get("predicted_behavior", "Unknown")
        behavior_counts[b] = behavior_counts.get(b, 0) + 1
        if b == "Unknown":
            anomaly_count += 1

    total = max(1, total_packets)
    lying_ratio = behavior_counts.get("Lying", 0) / total
    grazing_ratio = behavior_counts.get("Grazing", 0) / total
    walking_ratio = behavior_counts.get("Walking", 0) / total
    standing_ratio = behavior_counts.get("Standing", 0) / total
    resting_ratio = behavior_counts.get("Resting", 0) / total
    heat_ratio = behavior_counts.get("Heat Stress Risk", 0) / total
    unknown_ratio = anomaly_count / total

    status = "Healthy"
    notes = "Behavior distribution is within optimal parameters."

    if unknown_ratio >= 0.50:
        status = "Abnormal Behavior"
        notes = "High percentage of unclassified or irregular accelerometer patterns detected."
    elif heat_ratio >= 0.35:
        status = "Heat Stress Risk"
        notes = "High proportion of heat stress restlessness detected."

    dist_pct = {k: round((v / total_packets) * 100, 1) for k, v in behavior_counts.items()}

    return {
        "health_status": status,
        "behavior_distribution": dist_pct,
        "anomalies_count": anomaly_count,
        "total_packets": total_packets,
        "summary_notes": notes
    }


def retrain_model_from_csv(csv_content_bytes):
    """Parse uploaded CSV data, extract features, train new ML model pipeline, and overwrite cow_health_ml.pkl."""
    global ml_pipeline

    df = pd.read_csv(io.BytesIO(csv_content_bytes))
    df.columns = [c.strip() for c in df.columns]

    label_col = None
    for col in ['label', 'Label', 'Predicted_Behavior', 'behavior', 'Behavior', 'Predicted_Label']:
        if col in df.columns:
            label_col = col
            break

    if not label_col:
        raise ValueError("CSV missing label column. Please include a column named 'label' or 'Predicted_Behavior'.")

    X_list = []
    y_list = []

    if 'x_0' in df.columns and 'y_0' in df.columns and 'z_0' in df.columns:
        for idx, row in df.iterrows():
            x_seq = [row[f'x_{i}'] for i in range(80)]
            y_seq = [row[f'y_{i}'] for i in range(80)]
            z_seq = [row[f'z_{i}'] for i in range(80)]
            lbl = str(row[label_col]).strip()
            feat = extract_window_features(x_seq, y_seq, z_seq)
            X_list.append(feat)
            y_list.append(lbl)
    elif {'x', 'y', 'z'}.issubset(df.columns):
        group_col = None
        for col in ['Packet_ID', 'header_id', 'Header_ID', 'packet_id']:
            if col in df.columns:
                group_col = col
                break

        if group_col:
            grouped = df.groupby(group_col)
            for _, group in grouped:
                if len(group) >= 10:
                    x_seq = group['x'].tolist()
                    y_seq = group['y'].tolist()
                    z_seq = group['z'].tolist()
                    lbl = str(group[label_col].iloc[0]).strip()
                    feat = extract_window_features(x_seq, y_seq, z_seq)
                    X_list.append(feat)
                    y_list.append(lbl)
        else:
            num_rows = len(df)
            for i in range(0, num_rows, 80):
                chunk = df.iloc[i:i+80]
                if len(chunk) >= 10:
                    x_seq = chunk['x'].tolist()
                    y_seq = chunk['y'].tolist()
                    z_seq = chunk['z'].tolist()
                    lbl = str(chunk[label_col].iloc[0]).strip()
                    feat = extract_window_features(x_seq, y_seq, z_seq)
                    X_list.append(feat)
                    y_list.append(lbl)

    if len(X_list) < 5:
        raise ValueError(f"Insufficient valid window samples extracted ({len(X_list)} windows found). Need at least 5 sample windows.")

    X_arr = np.array(X_list)
    y_arr = np.array(y_list)

    new_pipeline = CowHealthMLPipeline()
    info = new_pipeline.train(X_arr, y_arr)

    ml_pipeline = new_pipeline
    joblib.dump(ml_pipeline, MODEL_FILE_PATH)
    print(f"[ML Model] Retrained & updated model pickle at {MODEL_FILE_PATH} with {len(y_arr)} custom samples.")

    return info


def calculate_autoencoder_reconstruction(x_seq, y_seq, z_seq):
    """Simulate CNN+BiLSTM Autoencoder signal reconstruction and calculate MSE loss."""
    x = np.array(x_seq, dtype=float)[:80]
    y = np.array(y_seq, dtype=float)[:80]
    z = np.array(z_seq, dtype=float)[:80]

    # Reconstructed signal smooth approximation
    from scipy.ndimage import gaussian_filter1d
    x_recon = gaussian_filter1d(x, sigma=1.2)
    y_recon = gaussian_filter1d(y, sigma=1.2)
    z_recon = gaussian_filter1d(z, sigma=1.2)

    # Compute MSE loss
    mse_x = float(np.mean((x - x_recon) ** 2))
    mse_y = float(np.mean((y - y_recon) ** 2))
    mse_z = float(np.mean((z - z_recon) ** 2))
    total_mse = float(round((mse_x + mse_y + mse_z) / 3.0, 4))

    return {
        "mse": total_mse,
        "original": {"x": x.tolist(), "y": y.tolist(), "z": z.tolist()},
        "reconstructed": {"x": x_recon.tolist(), "y": y_recon.tolist(), "z": z_recon.tolist()}
    }


def get_feature_radar_metrics(x_seq, y_seq, z_seq, is_anomaly=False):
    """Compute feature radar metrics for Selected Animal vs Normal Benchmark."""
    x = np.array(x_seq, dtype=float)
    y = np.array(y_seq, dtype=float)
    z = np.array(z_seq, dtype=float)

    mag = np.sqrt(x**2 + y**2 + z**2)
    motion_energy = min(100.0, float(np.mean(mag) * 8.5))
    variance = min(100.0, float(np.var(mag) * 15.0))
    activity_index = min(100.0, float(np.std(mag) * 22.0))
    rest_ratio = max(0.0, min(100.0, 100.0 - activity_index * 1.1))
    night_activity = min(100.0, float(activity_index * 0.4 + random.uniform(5, 15)))
    anomaly_val = 95.0 if is_anomaly else min(100.0, float(variance * 1.2))

    return {
        "animal": [
            {"subject": "Motion Energy", "value": round(motion_energy, 1), "fullMark": 100},
            {"subject": "Rest Ratio", "value": round(rest_ratio, 1), "fullMark": 100},
            {"subject": "Activity Index", "value": round(activity_index, 1), "fullMark": 100},
            {"subject": "Night Activity", "value": round(night_activity, 1), "fullMark": 100},
            {"subject": "Anomaly Score", "value": round(anomaly_val, 1), "fullMark": 100},
            {"subject": "Variance", "value": round(variance, 1), "fullMark": 100}
        ],
        "normal_benchmark": [
            {"subject": "Motion Energy", "value": 45.0, "fullMark": 100},
            {"subject": "Rest Ratio", "value": 75.0, "fullMark": 100},
            {"subject": "Activity Index", "value": 30.0, "fullMark": 100},
            {"subject": "Night Activity", "value": 12.0, "fullMark": 100},
            {"subject": "Anomaly Score", "value": 15.0, "fullMark": 100},
            {"subject": "Variance", "value": 20.0, "fullMark": 100}
        ]
    }


def process_unpredicted_headers(db):
    """Scan database for DataLoggerHeaders without a predicted_behavior and process them."""
    from app.models.datalogger import DataLoggerHeader
    from sqlalchemy.orm import joinedload
    
    # Only pull up to 100 at a time to prevent memory spikes
    unprocessed = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).filter(
        DataLoggerHeader.predicted_behavior == None
    ).limit(100).all()
    
    if not unprocessed:
        return 0
        
    model = get_or_create_model()
    processed_count = 0
    
    for h in unprocessed:
        if h.points and len(h.points) > 0:
            sorted_pts = sorted(h.points, key=lambda p: p.point_index)
            x_seq = [p.x if p.x is not None else 0 for p in sorted_pts]
            y_seq = [p.y if p.y is not None else 0 for p in sorted_pts]
            z_seq = [p.z if p.z is not None else 0 for p in sorted_pts]
            
            res = model.predict_single(x_seq, y_seq, z_seq)
            h.predicted_behavior = res["predicted_behavior"]
            h.confidence = res["confidence"]
            h.anomaly_score = res["anomaly_score"]
            h.is_anomaly = res["is_anomaly"]
            processed_count += 1
        else:
            # If no points, label it unknown so we don't infinitely retry
            h.predicted_behavior = "Unknown"
            h.confidence = 0.0
            h.anomaly_score = 0.0
            h.is_anomaly = False
            
    db.commit()
    return processed_count
