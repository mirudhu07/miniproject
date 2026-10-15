import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { dbState, memDb } from '../config/database';
import { VehicleModel } from '../models/Vehicle';
import { authenticateJWT } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
router.use(authenticateJWT);

const vehicleSchema = z.object({
  licensePlate: z.string().min(2).max(15),
  make: z.string().min(1),
  model: z.string().min(1),
  color: z.string().min(1),
  isEv: z.boolean().default(false),
  isAccessible: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});

// List user vehicles
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    if (dbState.mode === 'mongodb') {
      const list = await VehicleModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
      res.json({ success: true, data: list });
    } else {
      const list = Array.from(memDb.vehicles.values())
        .filter((v: any) => v.userId === userId)
        .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      res.json({ success: true, data: list });
    }
  } catch (error) {
    next(error);
  }
});

// Add vehicle
router.post('/', validateBody(vehicleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { licensePlate, make, model, color, isEv, isAccessible, isDefault } = req.body;
    const plate = licensePlate.toUpperCase().trim();

    if (dbState.mode === 'mongodb') {
      if (isDefault) {
        await VehicleModel.updateMany({ userId }, { isDefault: false });
      }

      const vehicle = await VehicleModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        licensePlate: plate,
        make,
        model,
        color,
        isEv,
        isAccessible,
        isDefault,
      });

      res.status(201).json({ success: true, data: vehicle });
    } else {
      for (const v of memDb.vehicles.values()) {
        if (v.userId === userId && v.licensePlate === plate) {
          res.status(409).json({ success: false, error: 'Vehicle already registered.' });
          return;
        }
      }

      if (isDefault) {
        for (const v of memDb.vehicles.values()) {
          if (v.userId === userId) v.isDefault = false;
        }
      }

      const vId = `veh-${Date.now()}`;
      const vehicle = {
        id: vId,
        _id: vId,
        userId,
        licensePlate: plate,
        make,
        model,
        color,
        isEv,
        isAccessible,
        isDefault,
        createdAt: new Date().toISOString(),
      };
      memDb.vehicles.set(vId, vehicle);

      res.status(201).json({ success: true, data: vehicle });
    }
  } catch (error) {
    next(error);
  }
});

// Delete vehicle
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.id;

    if (dbState.mode === 'mongodb') {
      const deleted = await VehicleModel.findOneAndDelete({ _id: vehicleId, userId });
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Vehicle not found.' });
        return;
      }
      res.json({ success: true, message: 'Vehicle deleted.' });
    } else {
      const v = memDb.vehicles.get(vehicleId);
      if (!v || v.userId !== userId) {
        res.status(404).json({ success: false, error: 'Vehicle not found.' });
        return;
      }
      memDb.vehicles.delete(vehicleId);
      res.json({ success: true, message: 'Vehicle deleted.' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
