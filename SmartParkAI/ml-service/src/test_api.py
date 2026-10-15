"""
SmartPark AI - ML Service Direct Function & Schema Test Suite
Tests endpoints, schema validations, and inference calculations directly.
"""

from pydantic import ValidationError
from main import (
    health_check,
    readiness_check,
    predict_occupancy,
    batch_predict,
    PredictionInput,
    BatchPredictionInput,
    load_model_if_available,
)

def run_tests():
    print("\n--- Running ML Service Tests ---")
    
    # 0. Load model
    load_model_if_available()
    
    # 1. Health Check
    health = health_check()
    assert health["status"] == "healthy", f"Health status invalid: {health}"
    assert health["service"] == "smartpark-ml-service"
    print("✔ health_check() passed:", health["status"], health["service"])
    
    # 2. Readiness Check
    ready = readiness_check()
    assert "status" in ready
    assert "model_loaded" in ready
    assert ready["model_loaded"] is True, "Model should be loaded after training"
    print("✔ readiness_check() passed: Model loaded =", ready["model_loaded"], "Version =", ready["model_version"])
    
    # 3. Predict Single
    item = PredictionInput(
        zone_id="zone-cyber-a",
        hour=9,
        day_of_week=1,
        current_occupancy_pct=72.5,
        total_capacity=350,
        reservations_count=45,
        recent_arrivals=12,
        recent_departures=2,
        horizon_minutes=60
    )
    result = predict_occupancy(item)
    assert result.zone_id == "zone-cyber-a"
    assert 0.0 <= result.predicted_occupancy_percentage <= 100.0
    assert 0 <= result.estimated_available_spaces <= 350
    assert result.is_model_trained is True
    print(f"✔ predict_occupancy() passed: Predicted {result.predicted_occupancy_percentage}% ({result.estimated_available_spaces} spaces free)")
    
    # 4. Batch Predict
    batch_input = BatchPredictionInput(
        predictions=[
            PredictionInput(
                zone_id="zone-cyber-a",
                hour=10,
                day_of_week=2,
                current_occupancy_pct=65.0,
                total_capacity=350,
            ),
            PredictionInput(
                zone_id="zone-techno-p1",
                hour=10,
                day_of_week=2,
                current_occupancy_pct=82.0,
                total_capacity=500,
            )
        ]
    )
    batch_results = batch_predict(batch_input)
    assert len(batch_results) == 2
    assert batch_results[0].zone_id == "zone-cyber-a"
    assert batch_results[1].zone_id == "zone-techno-p1"
    print(f"✔ batch_predict() passed for {len(batch_results)} zones")
    
    # 5. Schema Validation
    try:
        PredictionInput(
            zone_id="zone-invalid",
            current_occupancy_pct=150.0, # Invalid > 100
            total_capacity=100
        )
        assert False, "Should have thrown ValidationError for 150% occupancy"
    except ValidationError:
        print("✔ Pydantic validation rejected invalid 150% occupancy as expected")
        
    try:
        PredictionInput(
            zone_id="zone-invalid",
            current_occupancy_pct=50.0,
            total_capacity=-10 # Invalid <= 0
        )
        assert False, "Should have thrown ValidationError for negative capacity"
    except ValidationError:
        print("✔ Pydantic validation rejected invalid negative capacity as expected")
        
    print("\nAll ML Service validation tests passed successfully!\n")

if __name__ == "__main__":
    run_tests()
