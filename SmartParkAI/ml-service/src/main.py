"""
SmartPark AI - Occupancy Prediction Microservice
FastAPI service exposing real-time ML inference endpoints.
"""

import os
import time
import json
import joblib
import pandas as pd
from typing import List, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Model & Metadata Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "occupancy_rf_model.joblib")
METADATA_PATH = os.path.join(BASE_DIR, "models", "model_metadata.json")

# In-memory model cache
loaded_model = None
model_metadata = {}
start_time = time.time()

FEATURE_COLUMNS = [
    "hour",
    "day_of_week",
    "is_weekend",
    "current_occupancy_pct",
    "total_capacity",
    "reservations_count",
    "recent_arrivals",
    "recent_departures",
]

def load_model_if_available():
    global loaded_model, model_metadata
    if os.path.exists(MODEL_PATH):
        try:
            loaded_model = joblib.load(MODEL_PATH)
            if os.path.exists(METADATA_PATH):
                with open(METADATA_PATH, "r") as f:
                    model_metadata = json.load(f)
            print(f"[ML Service] Loaded model from {MODEL_PATH}")
        except Exception as e:
            print(f"[ML Service] Error loading model artifact: {e}")
            loaded_model = None
    else:
        print("[ML Service] No trained model artifact found. Service will use baseline heuristic until training is executed.")
        loaded_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lightweight startup check only
    load_model_if_available()
    yield

app = FastAPI(
    title="SmartPark AI Prediction API",
    version="1.0.0",
    description="Occupancy prediction engine for IT parks and corporate campuses",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class PredictionInput(BaseModel):
    zone_id: str = Field(..., description="Unique zone identifier")
    hour: Optional[int] = Field(None, ge=0, le=23, description="Hour of the day (0-23)")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    current_occupancy_pct: float = Field(..., ge=0.0, le=100.0, description="Current occupancy percentage")
    total_capacity: int = Field(..., gt=0, description="Total parking spaces in zone")
    reservations_count: Optional[int] = Field(0, ge=0, description="Current active reservations")
    recent_arrivals: Optional[int] = Field(0, ge=0, description="Arrivals in past 30 mins")
    recent_departures: Optional[int] = Field(0, ge=0, description="Departures in past 30 mins")
    horizon_minutes: Optional[int] = Field(60, ge=15, le=240, description="Prediction horizon in minutes")

class PredictionResult(BaseModel):
    zone_id: str
    prediction_horizon_minutes: int
    predicted_occupancy_percentage: float
    estimated_available_spaces: int
    timestamp: str
    model_version: str
    data_freshness: str
    confidence_score: float
    is_model_trained: bool

class BatchPredictionInput(BaseModel):
    predictions: List[PredictionInput]

@app.get("/health")
def health_check():
    """Liveness probe: reports if process is alive without blocking checks"""
    return {
        "status": "healthy",
        "service": "smartpark-ml-service",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - start_time, 2),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/ready")
def readiness_check():
    """Readiness probe: reports model status and inference readiness"""
    is_ready = loaded_model is not None
    return {
        "status": "ready" if is_ready else "degraded",
        "model_loaded": is_ready,
        "model_type": model_metadata.get("model_type", "RandomForestRegressor (unloaded)"),
        "model_version": model_metadata.get("model_version", "baseline-heuristic-fallback"),
        "metrics": model_metadata.get("metrics", {}),
        "features": FEATURE_COLUMNS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def calculate_single_prediction(item: PredictionInput) -> PredictionResult:
    now = datetime.now()
    hour = item.hour if item.hour is not None else now.hour
    day_of_week = item.day_of_week if item.day_of_week is not None else now.weekday()
    is_weekend = 1 if day_of_week in [5, 6] else 0

    if loaded_model is not None:
        # Run inference through Random Forest Regressor
        row = {
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "current_occupancy_pct": item.current_occupancy_pct,
            "total_capacity": item.total_capacity,
            "reservations_count": item.reservations_count or 0,
            "recent_arrivals": item.recent_arrivals or 0,
            "recent_departures": item.recent_departures or 0,
        }
        df_row = pd.DataFrame([row])[FEATURE_COLUMNS]
        pred_pct = float(loaded_model.predict(df_row)[0])
        pred_pct = max(0.0, min(100.0, pred_pct))
        
        # Available spaces
        avail_spaces = max(0, int(round(item.total_capacity * (1.0 - pred_pct / 100.0))))
        
        return PredictionResult(
            zone_id=item.zone_id,
            prediction_horizon_minutes=item.horizon_minutes or 60,
            predicted_occupancy_percentage=round(pred_pct, 1),
            estimated_available_spaces=avail_spaces,
            timestamp=datetime.now(timezone.utc).isoformat(),
            model_version=model_metadata.get("model_version", "rf-v1.0.0"),
            data_freshness="synthetic_baseline" if model_metadata.get("dataset", {}).get("is_synthetic") else "realtime",
            confidence_score=0.92,
            is_model_trained=True
        )
    else:
        # Graceful baseline heuristic persistence when model is not yet trained
        trend = 0.0
        if 8 <= hour < 11:
            trend = 5.0
        elif 16 <= hour < 19:
            trend = -8.0
        
        pred_pct = max(0.0, min(100.0, item.current_occupancy_pct + trend))
        avail_spaces = max(0, int(round(item.total_capacity * (1.0 - pred_pct / 100.0))))
        
        return PredictionResult(
            zone_id=item.zone_id,
            prediction_horizon_minutes=item.horizon_minutes or 60,
            predicted_occupancy_percentage=round(pred_pct, 1),
            estimated_available_spaces=avail_spaces,
            timestamp=datetime.now(timezone.utc).isoformat(),
            model_version="baseline-heuristic-fallback",
            data_freshness="fallback_heuristic",
            confidence_score=0.65,
            is_model_trained=False
        )

@app.post("/predict", response_model=PredictionResult)
def predict_occupancy(payload: PredictionInput):
    return calculate_single_prediction(payload)

@app.post("/predict/batch", response_model=List[PredictionResult])
def batch_predict(payload: BatchPredictionInput):
    return [calculate_single_prediction(p) for p in payload.predictions]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
