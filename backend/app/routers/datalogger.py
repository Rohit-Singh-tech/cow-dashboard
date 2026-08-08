from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.database import get_db
from app.models.datalogger import DataLoggerHeader, DataLoggerPoint

router = APIRouter(prefix="/api/packets/datalogger", tags=["DataLogger DB Telemetry"])

@router.get("/processed")
def get_processed_headers(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1),
    device_id: Optional[str] = Query(None, alias="deviceId"),
    include_points: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Retrieve processed DataLogger telemetry headers from database."""
    query = db.query(DataLoggerHeader)
    
    if device_id and device_id != 'All':
        query = query.filter(DataLoggerHeader.device_id == str(device_id))
        
    query = query.order_by(DataLoggerHeader.timestamp.desc())
    total = query.count()
    skip = (page - 1) * limit
    
    headers = query.options(joinedload(DataLoggerHeader.points)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "records": [
            {
                "id": h.id,
                "app_id": h.app_id,
                "device_id": h.device_id,
                "packet_id_num": h.packet_id_num,
                "total_packets": h.total_packets,
                "timestamp": h.timestamp,
                "points": [
                    {"point_index": p.point_index, "x": p.x, "y": p.y, "z": p.z}
                    for p in h.points
                ] if include_points and h.points else None
            } for h in headers
        ]
    }


@router.get("/processed/{header_id}")
def get_processed_header(header_id: int, db: Session = Depends(get_db)):
    """Retrieve single header record with points."""
    header = db.query(DataLoggerHeader).options(joinedload(DataLoggerHeader.points)).filter(DataLoggerHeader.id == header_id).first()
    if not header:
        raise HTTPException(status_code=404, detail="Processed header not found.")
    return header
