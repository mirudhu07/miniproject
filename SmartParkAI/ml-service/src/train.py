"""
SmartPark AI - Occupancy Model Training Script
Trains a Random Forest Regressor for parking zone occupancy prediction.
Uses chronological holdout validation to compare against a persistence baseline.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from synthetic_data import generate_synthetic_dataset

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

TARGET_COLUMN = "target_occupancy_pct"

def train_model(data_path: str = "data/synthetic_it_park_occupancy.csv", model_output: str = "models/occupancy_rf_model.joblib"):
    print("=== SmartPark AI Model Training ===")
    
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Generating synthetic development dataset...")
        df = generate_synthetic_dataset(output_path=data_path)
    else:
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records from {data_path}")
        
    # Sort chronologically for valid temporal holdout
    df = df.sort_values(by=["timestamp_hour_idx", "zone_id"]).reset_index(drop=True)
    
    # 80% Train, 20% Test chronological holdout
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET_COLUMN]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN]
    
    print(f"Training samples: {len(X_train)} | Test holdout samples: {len(X_test)}")
    
    # 1. Baseline Model: Persistence (target = current occupancy)
    baseline_preds = X_test["current_occupancy_pct"]
    base_mae = mean_absolute_error(y_test, baseline_preds)
    base_rmse = np.sqrt(mean_squared_error(y_test, baseline_preds))
    base_r2 = r2_score(y_test, baseline_preds)
    
    print("\n--- Baseline Model (Persistence) ---")
    print(f"MAE:  {base_mae:.3f}%")
    print(f"RMSE: {base_rmse:.3f}%")
    print(f"R²:   {base_r2:.3f}")
    
    # 2. Random Forest Regressor
    rf = RandomForestRegressor(
        n_estimators=75,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    
    rf_mae = mean_absolute_error(y_test, rf_preds)
    rf_rmse = np.sqrt(mean_squared_error(y_test, rf_preds))
    rf_r2 = r2_score(y_test, rf_preds)
    
    print("\n--- Random Forest Regressor ---")
    print(f"MAE:  {rf_mae:.3f}% (improvement: {base_mae - rf_mae:+.3f}%)")
    print(f"RMSE: {rf_rmse:.3f}%")
    print(f"R²:   {rf_r2:.3f}")
    
    # Save artifacts
    os.makedirs(os.path.dirname(model_output), exist_ok=True)
    joblib.dump(rf, model_output)
    print(f"\nModel artifact saved to: {model_output}")
    
    metadata = {
        "model_version": "rf-v1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_type": "RandomForestRegressor",
        "hyperparameters": {
            "n_estimators": 75,
            "max_depth": 12,
            "min_samples_split": 4,
            "random_state": 42
        },
        "features": FEATURE_COLUMNS,
        "dataset": {
            "path": data_path,
            "total_records": len(df),
            "is_synthetic": True,
            "train_samples": len(X_train),
            "test_samples": len(X_test)
        },
        "metrics": {
            "random_forest": {
                "mae": round(float(rf_mae), 3),
                "rmse": round(float(rf_rmse), 3),
                "r2": round(float(rf_r2), 3)
            },
            "baseline_persistence": {
                "mae": round(float(base_mae), 3),
                "rmse": round(float(base_rmse), 3),
                "r2": round(float(base_r2), 3)
            }
        }
    }
    
    metadata_path = os.path.join(os.path.dirname(model_output), "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Model metadata saved to: {metadata_path}")
    print("Training successfully completed!\n")

if __name__ == "__main__":
    train_model()
