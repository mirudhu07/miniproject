import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { ITParkModel } from '../models/ITPark';
import { FacilityModel } from '../models/Facility';
import { ZoneModel } from '../models/Zone';

const router = Router();

// List all IT Parks / Campuses with aggregated capacities
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (dbState.mode === 'mongodb') {
      const parks = await ITParkModel.find().lean();
      
      const enriched = await Promise.all(
        parks.map(async (p: any) => {
          const facilities = await FacilityModel.find({ itParkId: p._id }).lean();
          let totalCap = 0;
          let availableSpaces = 0;

          for (const f of facilities) {
            const zones = await ZoneModel.find({ facilityId: f._id }).lean();
            for (const z of zones) {
              totalCap += z.totalSpaces;
              availableSpaces += Math.max(0, z.totalSpaces - (z.occupiedSpaces + z.reservedSpaces));
            }
          }

          return {
            id: p._id.toString(),
            name: p.name,
            slug: p.slug,
            code: p.code,
            address: p.address,
            city: p.city,
            location: p.location,
            facilitiesCount: facilities.length,
            totalCapacity: totalCap || p.totalCapacity,
            availableSpaces,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } else {
      const parks = Array.from(memDb.itParks.values());
      const enriched = parks.map((p: any) => {
        const facilities = Array.from(memDb.facilities.values()).filter((f: any) => f.itParkId === (p._id || p.id));
        let totalCap = 0;
        let availableSpaces = 0;

        for (const f of facilities) {
          const zones = Array.from(memDb.zones.values()).filter((z: any) => z.facilityId === (f._id || f.id));
          for (const z of zones) {
            totalCap += z.totalSpaces;
            availableSpaces += Math.max(0, z.totalSpaces - (z.occupiedSpaces + z.reservedSpaces));
          }
        }

        return {
          id: p._id || p.id,
          name: p.name,
          slug: p.slug,
          code: p.code,
          address: p.address,
          city: p.city,
          location: p.location,
          facilitiesCount: facilities.length,
          totalCapacity: totalCap || p.totalCapacity,
          availableSpaces,
        };
      });

      res.json({ success: true, data: enriched });
    }
  } catch (error) {
    next(error);
  }
});

// Get IT Park by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (dbState.mode === 'mongodb') {
      const park = await ITParkModel.findById(id);
      if (!park) {
        res.status(404).json({ success: false, error: 'IT Park not found.' });
        return;
      }
      res.json({ success: true, data: park });
    } else {
      const park = memDb.itParks.get(id);
      if (!park) {
        res.status(404).json({ success: false, error: 'IT Park not found.' });
        return;
      }
      res.json({ success: true, data: park });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
