import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbState, memDb } from '../config/database';
import { ReservationModel } from '../models/Reservation';
import { FacilityModel } from '../models/Facility';
import { ZoneModel } from '../models/Zone';
import { authenticateJWT } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createReservationAtomic, cancelReservation } from '../services/reservationService';

const router = Router();
router.use(authenticateJWT);

const reservationSchema = z.object({
  facilityId: z.string().min(1),
  zoneId: z.string().min(1),
  slotId: z.string().optional(),
  licensePlate: z.string().min(2).max(15),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  estimatedPrice: z.number().min(0).default(0),
});

// Create Reservation
router.post('/', validateBody(reservationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { facilityId, zoneId, slotId, licensePlate, startTime, endTime, estimatedPrice } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      res.status(400).json({ success: false, error: 'End time must be after start time.' });
      return;
    }

    const reservation = await createReservationAtomic({
      userId,
      facilityId,
      zoneId,
      slotId,
      licensePlate,
      startTime: start,
      endTime: end,
      estimatedPrice,
    });

    res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully.',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
});

// List User Reservations
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    if (dbState.mode === 'mongodb') {
      const list = await ReservationModel.find({ userId })
        .populate('facilityId', 'name buildingName location')
        .populate('zoneId', 'name code level')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, count: list.length, data: list });
    } else {
      const list = Array.from(memDb.reservations.values())
        .filter((r: any) => r.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((r: any) => {
          const fac = memDb.facilities.get(r.facilityId);
          const zone = memDb.zones.get(r.zoneId);
          return {
            ...r,
            facilityId: fac ? { name: fac.name, buildingName: fac.buildingName, location: fac.location } : r.facilityId,
            zoneId: zone ? { name: zone.name, code: zone.code, level: zone.level } : r.zoneId,
          };
        });

      res.json({ success: true, count: list.length, data: list });
    }
  } catch (error) {
    next(error);
  }
});

// Get Reservation by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    if (dbState.mode === 'mongodb') {
      const reservation = await ReservationModel.findOne({ _id: id, userId })
        .populate('facilityId')
        .populate('zoneId')
        .populate('slotId');

      if (!reservation) {
        res.status(404).json({ success: false, error: 'Reservation not found.' });
        return;
      }
      res.json({ success: true, data: reservation });
    } else {
      const r = memDb.reservations.get(id);
      if (!r || r.userId !== userId) {
        res.status(404).json({ success: false, error: 'Reservation not found.' });
        return;
      }
      const fac = memDb.facilities.get(r.facilityId);
      const zone = memDb.zones.get(r.zoneId);
      const slot = r.slotId ? memDb.slots.get(r.slotId) : null;

      res.json({
        success: true,
        data: {
          ...r,
          facilityId: fac || r.facilityId,
          zoneId: zone || r.zoneId,
          slotId: slot || r.slotId,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Cancel Reservation
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const cancelled = await cancelReservation(id, userId);

    res.json({
      success: true,
      message: 'Reservation cancelled successfully.',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
