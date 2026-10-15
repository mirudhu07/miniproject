import http from 'http';
import { ENV } from '../config/env';
import { PredictionResponse } from '@smartpark-ai/shared';

export interface MLPredictionInput {
  zoneId: string;
  hour?: number;
  dayOfWeek?: number;
  currentOccupancyPct: number;
  totalCapacity: number;
  reservationsCount?: number;
  recentArrivals?: number;
  recentDepartures?: number;
  horizonMinutes?: number;
}

export async function checkMLReadiness(): Promise<{ reachable: boolean; modelLoaded: boolean; version?: string }> {
  try {
    const url = new URL(`${ENV.ML_SERVICE_URL}/ready`);
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 1500 }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const body = JSON.parse(data);
              resolve({
                reachable: true,
                modelLoaded: body.model_loaded === true,
                version: body.model_version,
              });
            } catch {
              resolve({ reachable: true, modelLoaded: false });
            }
          } else {
            resolve({ reachable: false, modelLoaded: false });
          }
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ reachable: false, modelLoaded: false });
      });
      req.on('error', () => {
        resolve({ reachable: false, modelLoaded: false });
      });
    });
  } catch {
    return { reachable: false, modelLoaded: false };
  }
}

export async function getOccupancyPrediction(input: MLPredictionInput): Promise<PredictionResponse> {
  const payload = {
    zone_id: input.zoneId,
    hour: input.hour,
    day_of_week: input.dayOfWeek,
    current_occupancy_pct: input.currentOccupancyPct,
    total_capacity: input.totalCapacity,
    reservations_count: input.reservationsCount || 0,
    recent_arrivals: input.recentArrivals || 0,
    recent_departures: input.recentDepartures || 0,
    horizon_minutes: input.horizonMinutes || 60,
  };

  try {
    const url = new URL(`${ENV.ML_SERVICE_URL}/predict`);
    const postData = JSON.stringify(payload);

    return await new Promise<PredictionResponse>((resolve, reject) => {
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 2000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const body = JSON.parse(data);
                resolve({
                  zoneId: body.zone_id,
                  predictionHorizonMinutes: body.prediction_horizon_minutes,
                  predictedOccupancyPercentage: body.predicted_occupancy_percentage,
                  estimatedAvailableSpaces: body.estimated_available_spaces,
                  timestamp: body.timestamp,
                  modelVersion: body.model_version,
                  dataFreshness: body.data_freshness || 'realtime',
                  confidenceScore: body.confidence_score || 0.9,
                });
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`ML service returned status ${res.statusCode}: ${data}`));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('ML service connection timed out'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  } catch (error: any) {
    // Non-blocking fallback heuristic when ML service is offline
    const now = new Date();
    const hour = input.hour !== undefined ? input.hour : now.getHours();
    let trend = 0;
    if (hour >= 8 && hour < 11) trend = 6;
    else if (hour >= 16 && hour < 19) trend = -10;

    const predPct = Math.max(0, Math.min(100, Math.round(input.currentOccupancyPct + trend)));
    const freeSpaces = Math.max(0, Math.round(input.totalCapacity * (1 - predPct / 100)));

    return {
      zoneId: input.zoneId,
      predictionHorizonMinutes: input.horizonMinutes || 60,
      predictedOccupancyPercentage: predPct,
      estimatedAvailableSpaces: freeSpaces,
      timestamp: new Date().toISOString(),
      modelVersion: 'heuristic-resilient-fallback',
      dataFreshness: 'fallback_heuristic',
      confidenceScore: 0.65,
    };
  }
}
