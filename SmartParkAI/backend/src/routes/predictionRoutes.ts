import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbState, memDb } from '../config/database';
import { ZoneModel } from '../models/Zone';
import { getOccupancyPrediction } from '../services/mlClient';
import { validateBody } from '../middleware/validate';

const router = Router();

const simulateSchema = z.object({
  zoneId: z.string(),
  hour: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6),
  horizonMinutes: z.number().min(15).max(240).default(60),
});

// Real-time prediction for zone
router.get('/zone/:zoneId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const zoneId = req.params.zoneId;
    let zone: any = null;

    if (dbState.mode === 'mongodb') {
      zone = await ZoneModel.findById(zoneId);
    } else {
      zone = memDb.zones.get(zoneId);
    }

    if (!zone) {
      res.status(404).json({ success: false, error: 'Zone not found.' });
      return;
    }

    const total = zone.totalSpaces;
    const occupied = zone.occupiedSpaces;
    const reserved = zone.reservedSpaces;
    const currentRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

    const prediction = await getOccupancyPrediction({
      zoneId,
      currentOccupancyPct: currentRate,
      totalCapacity: total,
      reservationsCount: reserved,
    });

    res.json({
      success: true,
      data: {
        ...prediction,
        zoneName: zone.name,
        zoneCode: zone.code,
        currentOccupancyPercentage: currentRate,
        totalCapacity: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Custom scenario simulation
router.post('/simulate', validateBody(simulateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zoneId, hour, dayOfWeek, horizonMinutes } = req.body;
    let zone: any = null;

    if (dbState.mode === 'mongodb') {
      zone = await ZoneModel.findById(zoneId);
    } else {
      zone = memDb.zones.get(zoneId);
    }

    const total = zone?.totalSpaces || 300;
    const currentRate = zone ? Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / total) * 100) : 50;

    const prediction = await getOccupancyPrediction({
      zoneId,
      hour,
      dayOfWeek,
      currentOccupancyPct: currentRate,
      totalCapacity: total,
      horizonMinutes,
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
});

export default router;
