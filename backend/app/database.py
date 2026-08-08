import os
import math
import random
import numpy as np
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

db_url = settings.DATABASE_URL.strip()

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}

# Try initializing engine
try:
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as conn_err:
    print(f"[DB Error] PostgreSQL connection failed: {conn_err}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_demo_db_if_empty():
    """Seed sample DataLogger headers and points if database is empty."""
    from app.models.datalogger import DataLoggerHeader, DataLoggerPoint
    from app.models.registry import TagRegistry

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Clear existing synthetic placeholder headers if present
        db.query(DataLoggerPoint).delete()
        db.query(DataLoggerHeader).delete()
        db.commit()

        print("[DB Seed] Seeding realistic telemetry data for Device IDs: 11, 42, 89, 93, 248...")
        devices = ["11", "42", "89", "93", "248"]
        
        for dev in devices:
            existing_tag = db.query(TagRegistry).filter(TagRegistry.device_id == dev).first()
            if not existing_tag:
                tag = TagRegistry(
                    device_id=dev,
                    name=f"Cow Tag #{dev}",
                    breed="Holstein-Friesian",
                    location="Barn Section A"
                )
                db.add(tag)
        db.commit()

        now = datetime.now(timezone.utc)
        header_count = 0
        
        for dev in devices:
            for idx in range(30):
                ts = now - timedelta(minutes=15 * (30 - idx))
                header = DataLoggerHeader(
                    app_id="demo-app-session-01",
                    device_id=dev,
                    packet_id_num=idx + 1,
                    total_packets=30,
                    raw_data="FE 11 22 33 44 55 66 77 88 99",
                    timestamp=ts
                )
                db.add(header)
                db.flush()

                points = []
                # Config parameters matching real activity dataset
                if dev == "11":
                    base_x, base_y, base_z = -2.3, -6.5, 6.4   # Resting / Standing
                elif dev == "42":
                    base_x, base_y, base_z = -1.2, -5.5, 7.5   # Grazing / Feeding
                elif dev == "89":
                    base_x, base_y, base_z = 28.5, -35.6, 44.5 # Irregular High Noise -> Abnormal Behavior
                elif dev == "93":
                    base_x, base_y, base_z = -2.8, -7.2, 5.4   # Ruminating
                else:
                    base_x, base_y, base_z = -1.4, -7.3, 5.9   # Drinking / Grazing

                t_points = np.linspace(0, 8, 80)
                for p_idx in range(80):
                    if dev == "89":
                        x_val = base_x + 18.0 * math.sin(2 * math.pi * 5.0 * t_points[p_idx]) + random.gauss(0, 5.0)
                        y_val = base_y + 15.0 * math.cos(2 * math.pi * 5.0 * t_points[p_idx]) + random.gauss(0, 5.0)
                        z_val = base_z + 20.0 * math.sin(2 * math.pi * 8.0 * t_points[p_idx]) + random.gauss(0, 5.0)
                    else:
                        x_val = base_x + 0.8 * math.sin(2 * math.pi * 0.5 * t_points[p_idx]) + random.gauss(0, 0.3)
                        y_val = base_y + 0.6 * math.cos(2 * math.pi * 0.5 * t_points[p_idx]) + random.gauss(0, 0.3)
                        z_val = base_z + 0.7 * math.sin(2 * math.pi * 1.0 * t_points[p_idx]) + random.gauss(0, 0.3)
                    

                    pt = DataLoggerPoint(
                        header_id=header.id,
                        point_index=p_idx,
                        x=float(round(x_val, 2)),
                        y=float(round(y_val, 2)),
                        z=float(round(z_val, 2))
                    )
                    points.append(pt)
                db.bulk_save_objects(points)
                header_count += 1

        db.commit()
        print(f"[DB Seed] Successfully seeded {header_count} realistic DataLogger telemetry packets!")
    except Exception as e:
        print(f"[DB Seed Note] {e}")
    finally:
        db.close()
