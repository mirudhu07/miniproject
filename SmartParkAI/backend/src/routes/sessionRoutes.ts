import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbState, memDb } from '../config/database';
import { SessionModel } from '../models/Session';
import { authenticateJWT } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { startParkingSession, endParkingSession } from '../services/sessionService';

const router = Router();
router.use(authenticateJWT);

const startSessionSchema = z.object({
  facilityId: z.string().min(1),
  zoneId: z.string().min(1),
  slotId: z.string().optional(),
  licensePlate: z.string().min(2).max(15),
  reservationId: z.string().optional(),
});

// Start Parking Session
router.post('/start', validateBody(startSessionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { facilityId, zoneId, slotId, licensePlate, reservationId } = req.body;

    const session = await startParkingSession({
      userId,
      facilityId,
      zoneId,
      slotId,
      licensePlate,
      reservationId,
    });

    res.status(201).json({
      success: true,
      message: 'Parking session started.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Get Current Active Session
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    if (dbState.mode === 'mongodb') {
      const active = await SessionModel.findOne({ userId, status: 'active' })
        .populate('facilityId', 'name buildingName location')
        .populate('zoneId', 'name code level pricePerHour')
        .populate('slotId', 'slotNumber level type');

      res.json({ success: true, data: active || null });
    } else {
      const active = Array.from(memDb.sessions.values()).find(
        (s: any) => s.userId === userId && s.status === 'active'
      );

      if (!active) {
        res.json({ success: true, data: null });
        return;
      }

      const fac = memDb.facilities.get(active.facilityId);
      const zone = memDb.zones.get(active.zoneId);
      const slot = active.slotId ? memDb.slots.get(active.slotId) : null;

      res.json({
        success: true,
        data: {
          ...active,
          facilityId: fac ? { name: fac.name, buildingName: fac.buildingName, location: fac.location } : active.facilityId,
          zoneId: zone ? { name: zone.name, code: zone.code, level: zone.level, pricePerHour: zone.pricePerHour } : active.zoneId,
          slotId: slot ? { slotNumber: slot.slotNumber, level: slot.level, type: slot.type } : active.slotId,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// End Parking Session
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const ended = await endParkingSession(id, userId);

    res.json({
      success: true,
      message: 'Parking session completed.',
      data: ended,
    });
  } catch (error) {
    next(error);
  }
});

// Session History
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    if (dbState.mode === 'mongodb') {
      const history = await SessionModel.find({ userId, status: 'completed' })
        .populate('facilityId', 'name buildingName')
        .populate('zoneId', 'name code')
        .sort({ exitTime: -1 })
        .limit(20)
        .lean();

      res.json({ success: true, count: history.length, data: history });
    } else {
      const history = Array.from(memDb.sessions.values())
        .filter((s: any) => s.userId === userId && s.status === 'completed')
        .sort((a, b) => new Date(b.exitTime || b.createdAt).getTime() - new Date(a.exitTime || a.createdAt).getTime())
        .slice(0, 20)
        .map((s: any) => {
          const fac = memDb.facilities.get(s.facilityId);
          const zone = memDb.zones.get(s.zoneId);
          return {
            ...s,
            facilityId: fac ? { name: fac.name, buildingName: fac.buildingName } : s.facilityId,
            zoneId: zone ? { name: zone.name, code: zone.code } : s.zoneId,
          };
        });

      res.json({ success: true, count: history.length, data: history });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
