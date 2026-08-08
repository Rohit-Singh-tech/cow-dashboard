from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ml_router, datalogger_router
from app.services.ml_service import get_or_create_model

from app.database import seed_demo_db_if_empty

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions: Seed DB tables & load baseline ML model
    print("[Cow Health AI Backend] Initializing Database & ML Model Engine...")
    try:
        # seed_demo_db_if_empty()
        pass
    except Exception as db_err:
        print(f"[Warning] DB Seed Notice: {db_err}")

    try:
        get_or_create_model()
    except Exception as e:
        print(f"[Warning] ML Initialization Notice: {e}")
    yield
    print("[Cow Health AI Backend] Shutting down server.")

app = FastAPI(
    title="Cow Health Monitoring System ML API",
    description="Standalone FastAPI Service for Accelerometer Behavioral Classification, Anomaly Detection & Retraining",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for standalone frontend host
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows connection from any hosted frontend URL or localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ml_router)
app.include_router(datalogger_router)

@app.get("/")
def read_root():
    return {
        "service": "Cow Health Monitoring System ML Backend API",
        "status": "online",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Cow Health ML API"}
