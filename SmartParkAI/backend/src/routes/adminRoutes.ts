import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { ITParkModel } from '../models/ITPark';
import { FacilityModel } from '../models/Facility';
import { ZoneModel } from '../models/Zone';
import { SessionModel } from '../models/Session';
import { ReservationModel } from '../models/Reservation';
import { UserModel } from '../models/User';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { broadcastAdminAlert } from '../services/socketService';
import { getOccupancyPrediction } from '../services/mlClient';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole(['admin', 'operator']));

// Overview Dashboard Stats
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let totalParks = 0;
    let totalFacilities = 0;
    let totalCapacity = 0;
    let occupiedSpaces = 0;
    let reservedSpaces = 0;
    let activeSessionsCount = 0;
    let activeReservationsCount = 0;

    if (dbState.mode === 'mongodb') {
      totalParks = await ITParkModel.countDocuments();
      totalFacilities = await FacilityModel.countDocuments();
      const zones = await ZoneModel.find().lean();

      zones.forEach((z) => {
        totalCapacity += z.totalSpaces;
        occupiedSpaces += z.occupiedSpaces;
        reservedSpaces += z.reservedSpaces;
      });

      activeSessionsCount = await SessionModel.countDocuments({ status: 'active' });
      activeReservationsCount = await ReservationModel.countDocuments({ status: 'active' });
    } else {
      totalParks = memDb.itParks.size;
      totalFacilities = memDb.facilities.size;

      for (const z of memDb.zones.values()) {
        totalCapacity += z.totalSpaces;
        occupiedSpaces += z.occupiedSpaces;
        reservedSpaces += z.reservedSpaces;
      }

      for (const s of memDb.sessions.values()) {
        if (s.status === 'active') activeSessionsCount++;
      }
      for (const r of memDb.reservations.values()) {
        if (r.status === 'active') activeReservationsCount++;
      }
    }

    const availableSpaces = Math.max(0, totalCapacity - (occupiedSpaces + reservedSpaces));
    const occupancyRate = totalCapacity > 0 ? Math.round(((occupiedSpaces + reservedSpaces) / totalCapacity) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalParks,
        totalFacilities,
        totalCapacity,
        occupiedSpaces,
        reservedSpaces,
        availableSpaces,
        occupancyRate,
        activeSessionsCount,
        activeReservationsCount,
        systemHealth: {
          database: dbState.mode,
          status: 'operational',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Live Occupancy Zones Breakdown
router.get('/zones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let zones: any[] = [];

    if (dbState.mode === 'mongodb') {
      zones = await ZoneModel.find().populate('facilityId', 'name buildingName').lean();
    } else {
      zones = Array.from(memDb.zones.values()).map((z: any) => {
        const fac = memDb.facilities.get(z.facilityId);
        return {
          ...z,
          facilityId: fac ? { name: fac.name, buildingName: fac.buildingName } : z.facilityId,
        };
      });
    }

    const enriched = await Promise.all(
      zones.map(async (z: any) => {
        const zoneId = z._id ? z._id.toString() : z.id;
        const total = z.totalSpaces;
        const occupied = z.occupiedSpaces;
        const reserved = z.reservedSpaces;
        const available = Math.max(0, total - (occupied + reserved));
        const currentRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

        let predictedRate = currentRate;
        try {
          const pred = await getOccupancyPrediction({
            zoneId,
            currentOccupancyPct: currentRate,
            totalCapacity: total,
            reservationsCount: reserved,
          });
          predictedRate = pred.predictedOccupancyPercentage;
        } catch {}

        return {
          id: zoneId,
          name: z.name,
          code: z.code,
          facilityName: z.facilityId?.name || 'Main Facility',
          buildingName: z.facilityId?.buildingName || 'Building A',
          level: z.level,
          totalSpaces: total,
          availableSpaces: available,
          occupiedSpaces: occupied,
          reservedSpaces: reserved,
          currentOccupancyRate: currentRate,
          predictedOccupancyRate: predictedRate,
          pricePerHour: z.pricePerHour,
        };
      })
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Admin Users List
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (dbState.mode === 'mongodb') {
      const users = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
      res.json({ success: true, count: users.length, data: users });
    } else {
      const users = Array.from(memDb.users.values()).map((u: any) => ({
        id: u._id || u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        defaultVehiclePlate: u.defaultVehiclePlate,
        companyName: u.companyName,
        createdAt: u.createdAt,
      }));
      res.json({ success: true, count: users.length, data: users });
    }
  } catch (error) {
    next(error);
  }
});

// Admin All Reservations
router.get('/reservations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (dbState.mode === 'mongodb') {
      const reservations = await ReservationModel.find()
        .populate('userId', 'fullName email')
        .populate('facilityId', 'name')
        .populate('zoneId', 'name code')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json({ success: true, count: reservations.length, data: reservations });
    } else {
      const reservations = Array.from(memDb.reservations.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50)
        .map((r: any) => {
          const u = memDb.users.get(r.userId);
          const fac = memDb.facilities.get(r.facilityId);
          const z = memDb.zones.get(r.zoneId);
          return {
            ...r,
            userId: u ? { fullName: u.fullName, email: u.email } : r.userId,
            facilityId: fac ? { name: fac.name } : r.facilityId,
            zoneId: z ? { name: z.name, code: z.code } : r.zoneId,
          };
        });
      res.json({ success: true, count: reservations.length, data: reservations });
    }
  } catch (error) {
    next(error);
  }
});

// Admin All Sessions
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (dbState.mode === 'mongodb') {
      const sessions = await SessionModel.find()
        .populate('userId', 'fullName email')
        .populate('facilityId', 'name')
        .populate('zoneId', 'name code')
        .sort({ entryTime: -1 })
        .limit(50)
        .lean();
      res.json({ success: true, count: sessions.length, data: sessions });
    } else {
      const sessions = Array.from(memDb.sessions.values())
        .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
        .slice(0, 50)
        .map((s: any) => {
          const u = memDb.users.get(s.userId);
          const fac = memDb.facilities.get(s.facilityId);
          const z = memDb.zones.get(s.zoneId);
          return {
            ...s,
            userId: u ? { fullName: u.fullName, email: u.email } : s.userId,
            facilityId: fac ? { name: fac.name } : s.facilityId,
            zoneId: z ? { name: z.name, code: z.code } : s.zoneId,
          };
        });
      res.json({ success: true, count: sessions.length, data: sessions });
    }
  } catch (error) {
    next(error);
  }
});

// Broadcast Admin Alert
router.post('/alerts/broadcast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, severity } = req.body;
    if (!title || !message) {
      res.status(400).json({ success: false, error: 'Title and message are required.' });
      return;
    }

    broadcastAdminAlert({
      title,
      message,
      severity: severity || 'info',
    });

    res.json({ success: true, message: 'Alert broadcasted to all active clients.' });
  } catch (error) {
    next(error);
  }
});

export default router;
