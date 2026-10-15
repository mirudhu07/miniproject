"""
SmartPark AI - Synthetic IT Park Parking Dataset Generator
Generates realistic IT campus parking occupancy patterns for local training.
Identified explicitly as SYNTHETIC data for development and baseline training.
"""

import os
import numpy as np
import pandas as pd

def generate_synthetic_dataset(output_path: str = "data/synthetic_it_park_occupancy.csv", days: int = 45):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    np.random.seed(42)
    records = []
    
    # 4 Representative IT Park Zones
    zones = [
        {"zone_id": "zone-cyber-a", "capacity": 350, "base_demand": 0.85},
        {"zone_id": "zone-cyber-b", "capacity": 200, "base_demand": 0.75},
        {"zone_id": "zone-techno-p1", "capacity": 500, "base_demand": 0.90},
        {"zone_id": "zone-embassy-north", "capacity": 280, "base_demand": 0.80},
    ]
    
    # Generate hourly records for `days` days
    hours_total = days * 24
    
    for h_idx in range(hours_total):
        day = h_idx // 24
        hour = h_idx % 24
        day_of_week = (day % 7) # 0=Mon, 6=Sun
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        for z in zones:
            cap = z["capacity"]
            demand = z["base_demand"]
            
            # Realistic IT park daily occupancy curve
            if is_weekend:
                # Weekend: skeleton shifts, 10-25%
                mean_occ = 0.15 + np.random.uniform(-0.05, 0.08)
            else:
                # Weekday corporate curve
                if 0 <= hour < 6:
                    mean_occ = 0.08 # overnight
                elif 6 <= hour < 8:
                    mean_occ = 0.20 # early arrivals
                elif 8 <= hour < 11:
                    mean_occ = 0.70 + (demand * 0.18) # morning rush peak
                elif 11 <= hour < 14:
                    mean_occ = 0.82 + (demand * 0.12) # lunch peak
                elif 14 <= hour < 17:
                    mean_occ = 0.78 + (demand * 0.10) # afternoon steady
                elif 17 <= hour < 20:
                    mean_occ = 0.40 # evening departure
                else:
                    mean_occ = 0.15 # late evening
            
            # Add realistic variance
            noise = np.random.normal(0, 0.03)
            current_occ = max(0.02, min(0.98, mean_occ + noise))
            
            # Predict 60-minute future target occupancy
            next_hour = (hour + 1) % 24
            if is_weekend:
                target_occ = max(0.02, min(0.98, 0.15 + np.random.normal(0, 0.04)))
            else:
                if 7 <= next_hour < 11:
                    target_trend = 0.08 # rising
                elif 16 <= next_hour < 20:
                    target_trend = -0.15 # dropping
                else:
                    target_trend = 0.01
                target_occ = max(0.02, min(0.98, current_occ + target_trend + np.random.normal(0, 0.02)))
            
            # Current reservations count and traffic flux
            res_count = int(current_occ * cap * 0.25 * np.random.uniform(0.8, 1.2))
            arrivals_recent = int(max(0, (target_occ - current_occ) * cap * 0.8 + np.random.poisson(4)))
            departures_recent = int(max(0, (current_occ - target_occ) * cap * 0.8 + np.random.poisson(3)))
            
            records.append({
                "timestamp_hour_idx": h_idx,
                "zone_id": z["zone_id"],
                "total_capacity": cap,
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "current_occupancy_pct": round(current_occ * 100.0, 2),
                "reservations_count": res_count,
                "recent_arrivals": arrivals_recent,
                "recent_departures": departures_recent,
                "target_occupancy_pct": round(target_occ * 100.0, 2),
                "is_synthetic": 1,
            })
            
    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic records across {days} days at: {output_path}")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset()
