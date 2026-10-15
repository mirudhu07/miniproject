import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { FacilityModel } from '../models/Facility';
import { ZoneModel } from '../models/Zone';
import { SlotModel } from '../models/Slot';
import { getOccupancyPrediction } from '../services/mlClient';

const router = Router();

// List facilities
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = req.query.campusId as string;

    if (dbState.mode === 'mongodb') {
      const filter: any = {};
      if (campusId) filter.itParkId = campusId;

      const facilities = await FacilityModel.find(filter).lean();
      const enriched = await Promise.all(
        facilities.map(async (f: any) => {
          const zones = await ZoneModel.find({ facilityId: f._id }).lean();
          let totalSpaces = 0;
          let availableSpaces = 0;
          let occupiedSpaces = 0;

          zones.forEach((z) => {
            totalSpaces += z.totalSpaces;
            occupiedSpaces += z.occupiedSpaces;
            availableSpaces += Math.max(0, z.totalSpaces - (z.occupiedSpaces + z.reservedSpaces));
          });

          return {
            id: f._id.toString(),
            itParkId: f.itParkId.toString(),
            name: f.name,
            code: f.code,
            buildingName: f.buildingName,
            levels: f.levels,
            totalCapacity: totalSpaces || f.totalCapacity,
            availableCapacity: availableSpaces,
            occupiedSpaces,
            hasEvCharging: f.hasEvCharging,
            hasAccessibleParking: f.hasAccessibleParking,
            location: f.location,
            operatingHours: f.operatingHours,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } else {
      let facilities = Array.from(memDb.facilities.values());
      if (campusId) {
        facilities = facilities.filter((f: any) => f.itParkId === campusId);
      }

      const enriched = facilities.map((f: any) => {
        const zones = Array.from(memDb.zones.values()).filter((z: any) => z.facilityId === (f._id || f.id));
        let totalSpaces = 0;
        let availableSpaces = 0;
        let occupiedSpaces = 0;

        zones.forEach((z: any) => {
          totalSpaces += z.totalSpaces;
          occupiedSpaces += z.occupiedSpaces;
          availableSpaces += Math.max(0, z.totalSpaces - (z.occupiedSpaces + z.reservedSpaces));
        });

        return {
          id: f._id || f.id,
          itParkId: f.itParkId,
          name: f.name,
          code: f.code,
          buildingName: f.buildingName,
          levels: f.levels,
          totalCapacity: totalSpaces || f.totalCapacity,
          availableCapacity: availableSpaces,
          occupiedSpaces,
          hasEvCharging: f.hasEvCharging,
          hasAccessibleParking: f.hasAccessibleParking,
          location: f.location,
          operatingHours: f.operatingHours,
        };
      });

      res.json({ success: true, data: enriched });
    }
  } catch (error) {
    next(error);
  }
});

// Facility Details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (dbState.mode === 'mongodb') {
      const facility = await FacilityModel.findById(id).lean();
      if (!facility) {
        res.status(404).json({ success: false, error: 'Parking facility not found.' });
        return;
      }
      res.json({ success: true, data: facility });
    } else {
      const facility = memDb.facilities.get(id);
      if (!facility) {
        res.status(404).json({ success: false, error: 'Parking facility not found.' });
        return;
      }
      res.json({ success: true, data: facility });
    }
  } catch (error) {
    next(error);
  }
});

// Facility Zones with ML predictions
router.get('/:id/zones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.params.id;
    let rawZones: any[] = [];

    if (dbState.mode === 'mongodb') {
      rawZones = await ZoneModel.find({ facilityId }).lean();
    } else {
      rawZones = Array.from(memDb.zones.values()).filter((z: any) => z.facilityId === facilityId);
    }

    const zonesEnriched = await Promise.all(
      rawZones.map(async (z: any) => {
        const zoneId = z._id ? z._id.toString() : z.id;
        const total = z.totalSpaces;
        const occupied = z.occupiedSpaces;
        const reserved = z.reservedSpaces;
        const available = Math.max(0, total - (occupied + reserved));
        const currentRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

        // Fetch prediction from ML engine
        let predictedRate = currentRate;
        try {
          const pred = await getOccupancyPrediction({
            zoneId,
            currentOccupancyPct: currentRate,
            totalCapacity: total,
            reservationsCount: reserved,
          });
          predictedRate = pred.predictedOccupancyPercentage;
        } catch {
          predictedRate = currentRate;
        }

        return {
          id: zoneId,
          facilityId,
          name: z.name,
          code: z.code,
          level: z.level,
          totalSpaces: total,
          availableSpaces: available,
          reservedSpaces: reserved,
          occupiedSpaces: occupied,
          evSpaces: z.evSpaces || 0,
          accessibleSpaces: z.accessibleSpaces || 0,
          pricePerHour: z.pricePerHour,
          currentOccupancyRate: currentRate,
          predictedOccupancyRate: predictedRate,
        };
      })
    );

    res.json({ success: true, data: zonesEnriched });
  } catch (error) {
    next(error);
  }
});

// Facility Slots
router.get('/:id/slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.params.id;
    const zoneId = req.query.zoneId as string;
    const status = req.query.status as string;

    if (dbState.mode === 'mongodb') {
      const filter: any = { facilityId };
      if (zoneId) filter.zoneId = zoneId;
      if (status) filter.status = status;

      const slots = await SlotModel.find(filter).sort({ level: 1, slotNumber: 1 }).lean();
      res.json({ success: true, data: slots });
    } else {
      let slots = Array.from(memDb.slots.values()).filter((s: any) => s.facilityId === facilityId);
      if (zoneId) slots = slots.filter((s: any) => s.zoneId === zoneId);
      if (status) slots = slots.filter((s: any) => s.status === status);

      slots.sort((a, b) => a.level - b.level || a.slotNumber.localeCompare(b.slotNumber));
      res.json({ success: true, data: slots });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
