import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { FacilityModel } from '../models/Facility';
import { ZoneModel } from '../models/Zone';
import { ITParkModel } from '../models/ITPark';
import { getOccupancyPrediction } from '../services/mlClient';

const router = Router();

// Search parking facilities
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    const evOnly = req.query.ev === 'true';
    const accessibleOnly = req.query.accessible === 'true';
    const minAvailable = parseInt((req.query.minAvailable as string) || '0', 10);

    let rawFacilities: any[] = [];
    if (dbState.mode === 'mongodb') {
      const filter: any = {};
      if (evOnly) filter.hasEvCharging = true;
      if (accessibleOnly) filter.hasAccessibleParking = true;
      rawFacilities = await FacilityModel.find(filter).lean();
    } else {
      rawFacilities = Array.from(memDb.facilities.values()).filter((f: any) => {
        if (evOnly && !f.hasEvCharging) return false;
        if (accessibleOnly && !f.hasAccessibleParking) return false;
        return true;
      });
    }

    const results = await Promise.all(
      rawFacilities.map(async (f: any) => {
        const facId = f._id ? f._id.toString() : f.id;
        let zones: any[] = [];

        if (dbState.mode === 'mongodb') {
          zones = await ZoneModel.find({ facilityId: f._id }).lean();
        } else {
          zones = Array.from(memDb.zones.values()).filter((z: any) => z.facilityId === facId);
        }

        let totalCap = 0;
        let availCap = 0;
        let occupiedCap = 0;

        zones.forEach((z) => {
          totalCap += z.totalSpaces;
          occupiedCap += z.occupiedSpaces;
          availCap += Math.max(0, z.totalSpaces - (z.occupiedSpaces + z.reservedSpaces));
        });

        // Filter text query
        const matchesQuery =
          !q ||
          f.name.toLowerCase().includes(q) ||
          f.buildingName.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q);

        if (!matchesQuery || availCap < minAvailable) {
          return null;
        }

        return {
          id: facId,
          itParkId: f.itParkId.toString(),
          name: f.name,
          code: f.code,
          buildingName: f.buildingName,
          levels: f.levels,
          totalCapacity: totalCap || f.totalCapacity,
          availableCapacity: availCap,
          occupiedSpaces: occupiedCap,
          occupancyPercentage: totalCap > 0 ? Math.round(((totalCap - availCap) / totalCap) * 100) : 0,
          hasEvCharging: f.hasEvCharging,
          hasAccessibleParking: f.hasAccessibleParking,
          location: f.location,
          operatingHours: f.operatingHours,
          zonesCount: zones.length,
        };
      })
    );

    const filtered = results.filter((r) => r !== null);
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    next(error);
  }
});

// AI Parking Recommendations
router.get('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = req.query.campusId as string;
    let facilities: any[] = [];

    if (dbState.mode === 'mongodb') {
      const filter: any = campusId ? { itParkId: campusId } : {};
      facilities = await FacilityModel.find(filter).lean();
    } else {
      facilities = Array.from(memDb.facilities.values());
      if (campusId) facilities = facilities.filter((f: any) => f.itParkId === campusId);
    }

    if (facilities.length === 0) {
      res.json({ success: true, data: null, message: 'No facilities available for recommendation.' });
      return;
    }

    // Evaluate all zones across facilities to find the optimal zone
    const scoredZones: any[] = [];

    for (const fac of facilities) {
      const facId = fac._id ? fac._id.toString() : fac.id;
      let zones: any[] = [];

      if (dbState.mode === 'mongodb') {
        zones = await ZoneModel.find({ facilityId: fac._id }).lean();
      } else {
        zones = Array.from(memDb.zones.values()).filter((z: any) => z.facilityId === facId);
      }

      for (const z of zones) {
        const zoneId = z._id ? z._id.toString() : z.id;
        const total = z.totalSpaces;
        const occupied = z.occupiedSpaces;
        const reserved = z.reservedSpaces;
        const available = Math.max(0, total - (occupied + reserved));
        const currentRate = total > 0 ? (occupied + reserved) / total : 1.0;

        // Skip completely full zones
        if (available <= 0) continue;

        // Fetch ML prediction
        const pred = await getOccupancyPrediction({
          zoneId,
          currentOccupancyPct: Math.round(currentRate * 100),
          totalCapacity: total,
          reservationsCount: reserved,
        });

        // Recommendation score: combines high available spaces and low predicted congestion
        const score = available * 1.5 - pred.predictedOccupancyPercentage * 0.5;

        scoredZones.push({
          facilityId: facId,
          facilityName: fac.name,
          buildingName: fac.buildingName,
          hasEvCharging: fac.hasEvCharging,
          zoneId,
          zoneName: z.name,
          zoneCode: z.code,
          level: z.level,
          pricePerHour: z.pricePerHour,
          availableSpaces: available,
          totalSpaces: total,
          currentOccupancyRate: Math.round(currentRate * 100),
          predictedOccupancyRate: pred.predictedOccupancyPercentage,
          estimatedFreeIn60Mins: pred.estimatedAvailableSpaces,
          mlFreshness: pred.dataFreshness,
          score,
        });
      }
    }

    // Sort by recommendation score descending
    scoredZones.sort((a, b) => b.score - a.score);

    const recommended = scoredZones[0] || null;

    res.json({
      success: true,
      recommendedZone: recommended,
      alternatives: scoredZones.slice(1, 4),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
