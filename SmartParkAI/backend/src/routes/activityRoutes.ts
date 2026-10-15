import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { ReservationModel } from '../models/Reservation';
import { SessionModel } from '../models/Session';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const activities: any[] = [];

    if (dbState.mode === 'mongodb') {
      const reservations = await ReservationModel.find({ userId })
        .populate('facilityId', 'name')
        .populate('zoneId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const sessions = await SessionModel.find({ userId })
        .populate('facilityId', 'name')
        .populate('zoneId', 'name')
        .sort({ entryTime: -1 })
        .limit(10)
        .lean();

      reservations.forEach((r: any) => {
        activities.push({
          id: `act-res-${r._id}`,
          type: 'reservation',
          title: `Reservation ${r.bookingReference}`,
          description: `${r.status.toUpperCase()} • ${r.facilityId?.name || 'Parking Facility'} (${r.licensePlate})`,
          timestamp: r.createdAt,
          status: r.status,
          referenceId: r._id.toString(),
        });
      });

      sessions.forEach((s: any) => {
        activities.push({
          id: `act-sess-${s._id}`,
          type: 'session',
          title: s.status === 'active' ? 'Active Parking Session' : 'Completed Parking Session',
          description: `${s.facilityId?.name || 'Parking Facility'} • ${s.licensePlate} (${s.durationMinutes || 0} mins)`,
          timestamp: s.exitTime || s.entryTime,
          status: s.status,
          referenceId: s._id.toString(),
        });
      });
    } else {
      const reservations = Array.from(memDb.reservations.values())
        .filter((r: any) => r.userId === userId)
        .slice(-10);

      const sessions = Array.from(memDb.sessions.values())
        .filter((s: any) => s.userId === userId)
        .slice(-10);

      reservations.forEach((r: any) => {
        const fac = memDb.facilities.get(r.facilityId);
        activities.push({
          id: `act-res-${r.id || r._id}`,
          type: 'reservation',
          title: `Reservation ${r.bookingReference}`,
          description: `${r.status.toUpperCase()} • ${fac?.name || 'Parking Facility'} (${r.licensePlate})`,
          timestamp: r.createdAt,
          status: r.status,
          referenceId: r.id || r._id,
        });
      });

      sessions.forEach((s: any) => {
        const fac = memDb.facilities.get(s.facilityId);
        activities.push({
          id: `act-sess-${s.id || s._id}`,
          type: 'session',
          title: s.status === 'active' ? 'Active Parking Session' : 'Completed Parking Session',
          description: `${fac?.name || 'Parking Facility'} • ${s.licensePlate} (${s.durationMinutes || 0} mins)`,
          timestamp: s.exitTime || s.entryTime,
          status: s.status,
          referenceId: s.id || s._id,
        });
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, count: activities.length, data: activities });
  } catch (error) {
    next(error);
  }
});

export default router;
