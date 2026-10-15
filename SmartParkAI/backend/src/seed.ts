import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase, dbState, memDb } from './config/database';
import { UserModel } from './models/User';
import { ITParkModel } from './models/ITPark';
import { FacilityModel } from './models/Facility';
import { ZoneModel } from './models/Zone';
import { SlotModel } from './models/Slot';
import { VehicleModel } from './models/Vehicle';

export async function seedDatabaseData() {
  console.log('[Seed] Seeding initial IT parks, facilities, zones, slots, and demo users...');

  const passwordHash = await bcrypt.hash('SmartPark123!', 10);

  // 1. Demo Users
  const demoUsers = [
    {
      id: 'usr-admin-1',
      email: 'admin@smartpark.ai',
      passwordHash,
      fullName: 'System Administrator',
      phone: '+1 800 555 0199',
      role: 'admin',
      companyName: 'SmartPark AI Corp',
    },
    {
      id: 'usr-operator-1',
      email: 'operator@smartpark.ai',
      passwordHash,
      fullName: 'Campus Facility Operator',
      phone: '+1 800 555 0188',
      role: 'operator',
      companyName: 'CyberGate Facilities Ltd',
    },
    {
      id: 'usr-commuter-1',
      email: 'user@smartpark.ai',
      passwordHash,
      fullName: 'Alex Morgan',
      phone: '+1 800 555 0177',
      role: 'user',
      defaultVehiclePlate: 'KA01EV2026',
      companyName: 'Acme Cloud Technologies',
    },
  ];

  // 2. IT Parks / Campuses
  const itParks = [
    {
      id: 'park-cybergate',
      name: 'CyberGate IT Park',
      slug: 'cybergate-it-park',
      code: 'CGP',
      address: '100 Silicon Boulevard, Tech Corridor',
      city: 'Bangalore',
      location: { latitude: 12.9352, longitude: 77.6946 },
      totalCapacity: 850,
    },
    {
      id: 'park-technopark',
      name: 'Technopark Campus Alpha',
      slug: 'technopark-alpha',
      code: 'TPA',
      address: '42 Innovation Parkway',
      city: 'Bangalore',
      location: { latitude: 12.9716, longitude: 77.5946 },
      totalCapacity: 1200,
    },
    {
      id: 'park-embassy',
      name: 'Embassy Tech Village',
      slug: 'embassy-tech-village',
      code: 'ETV',
      address: 'Outer Ring Road, Devarabeesanahalli',
      city: 'Bangalore',
      location: { latitude: 12.9279, longitude: 77.6853 },
      totalCapacity: 640,
    },
  ];

  // 3. Facilities
  const facilities = [
    {
      id: 'fac-cg-tower-a',
      itParkId: 'park-cybergate',
      name: 'CyberGate Multi-Level Garage A',
      code: 'CG-MLA',
      buildingName: 'Tower A',
      levels: 4,
      totalCapacity: 500,
      hasEvCharging: true,
      hasAccessibleParking: true,
      location: { latitude: 12.9355, longitude: 77.6948 },
      operatingHours: { open: '00:00', close: '23:59', is24x7: true },
    },
    {
      id: 'fac-cg-tower-b',
      itParkId: 'park-cybergate',
      name: 'CyberGate Basement B',
      code: 'CG-BSB',
      buildingName: 'Tower B & C',
      levels: 2,
      totalCapacity: 350,
      hasEvCharging: true,
      hasAccessibleParking: false,
      location: { latitude: 12.935, longitude: 77.6943 },
      operatingHours: { open: '06:00', close: '23:00', is24x7: false },
    },
    {
      id: 'fac-tp-central',
      itParkId: 'park-technopark',
      name: 'Technopark Central Hub',
      code: 'TP-CENTRAL',
      buildingName: 'Building Gamma',
      levels: 5,
      totalCapacity: 700,
      hasEvCharging: true,
      hasAccessibleParking: true,
      location: { latitude: 12.972, longitude: 77.595 },
      operatingHours: { open: '00:00', close: '23:59', is24x7: true },
    },
  ];

  // 4. Zones
  const zones = [
    {
      id: 'zone-cyber-a1',
      facilityId: 'fac-cg-tower-a',
      name: 'Ground Level - Premium & EV',
      code: 'L0-EV',
      level: 0,
      totalSpaces: 100,
      occupiedSpaces: 65,
      reservedSpaces: 10,
      evSpaces: 30,
      accessibleSpaces: 10,
      pricePerHour: 30,
    },
    {
      id: 'zone-cyber-a2',
      facilityId: 'fac-cg-tower-a',
      name: 'Level 1 - Express Commuter',
      code: 'L1-EXP',
      level: 1,
      totalSpaces: 150,
      occupiedSpaces: 110,
      reservedSpaces: 15,
      evSpaces: 10,
      accessibleSpaces: 5,
      pricePerHour: 25,
    },
    {
      id: 'zone-cyber-a3',
      facilityId: 'fac-cg-tower-a',
      name: 'Level 2 - General Office Parking',
      code: 'L2-GEN',
      level: 2,
      totalSpaces: 250,
      occupiedSpaces: 140,
      reservedSpaces: 20,
      evSpaces: 0,
      accessibleSpaces: 5,
      pricePerHour: 20,
    },
    {
      id: 'zone-cyber-b1',
      facilityId: 'fac-cg-tower-b',
      name: 'Basement B1 - Visitor & Staff',
      code: 'B1-ALL',
      level: -1,
      totalSpaces: 200,
      occupiedSpaces: 130,
      reservedSpaces: 20,
      evSpaces: 15,
      accessibleSpaces: 5,
      pricePerHour: 20,
    },
    {
      id: 'zone-tp-c1',
      facilityId: 'fac-tp-central',
      name: 'Level 1 - Alpha Tech Wing',
      code: 'TP-L1',
      level: 1,
      totalSpaces: 300,
      occupiedSpaces: 180,
      reservedSpaces: 30,
      evSpaces: 20,
      accessibleSpaces: 10,
      pricePerHour: 25,
    },
  ];

  if (dbState.mode === 'mongodb') {
    // Clear and re-populate MongoDB collections
    await UserModel.deleteMany({});
    await ITParkModel.deleteMany({});
    await FacilityModel.deleteMany({});
    await ZoneModel.deleteMany({});
    await SlotModel.deleteMany({});
    await VehicleModel.deleteMany({});

    // Insert Users
    const createdUsers: any[] = [];
    for (const u of demoUsers) {
      const user = await UserModel.create({
        email: u.email,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        defaultVehiclePlate: u.defaultVehiclePlate,
        companyName: u.companyName,
      });
      createdUsers.push(user);
    }

    // Insert IT Parks
    const parkMap = new Map<string, any>();
    for (const p of itParks) {
      const park = await ITParkModel.create(p);
      parkMap.set(p.id, park._id);
    }

    // Insert Facilities
    const facMap = new Map<string, any>();
    for (const f of facilities) {
      const realParkId = parkMap.get(f.itParkId);
      const fac = await FacilityModel.create({
        ...f,
        itParkId: realParkId,
      });
      facMap.set(f.id, fac._id);
    }

    // Insert Zones & Slots
    for (const z of zones) {
      const realFacId = facMap.get(z.facilityId);
      const zone = await ZoneModel.create({
        ...z,
        facilityId: realFacId,
      });

      // Generate 20 detailed interactive slots per zone
      const slotsToInsert = [];
      for (let sIdx = 1; sIdx <= 20; sIdx++) {
        const slotNumber = `${z.code}-${sIdx < 10 ? '0' : ''}${sIdx}`;
        let type: 'standard' | 'ev' | 'accessible' = 'standard';
        if (sIdx <= 4 && z.evSpaces > 0) type = 'ev';
        else if (sIdx <= 6 && z.accessibleSpaces > 0) type = 'accessible';

        const status = sIdx <= 8 ? 'occupied' : sIdx <= 11 ? 'reserved' : 'available';

        slotsToInsert.push({
          zoneId: zone._id,
          facilityId: realFacId,
          slotNumber,
          level: z.level,
          type,
          status,
          currentVehiclePlate: status === 'occupied' ? `KA01AB${1000 + sIdx}` : undefined,
        });
      }
      await SlotModel.insertMany(slotsToInsert);
    }

    // Demo vehicles for commuter user
    const commuter = createdUsers.find((u) => u.email === 'user@smartpark.ai');
    if (commuter) {
      await VehicleModel.create([
        {
          userId: commuter._id,
          licensePlate: 'KA01EV2026',
          make: 'Tesla',
          model: 'Model 3',
          color: 'Pearl White',
          isEv: true,
          isAccessible: false,
          isDefault: true,
        },
        {
          userId: commuter._id,
          licensePlate: 'KA03MZ9999',
          make: 'BMW',
          model: '330i M Sport',
          color: 'Portimao Blue',
          isEv: false,
          isAccessible: false,
          isDefault: false,
        },
      ]);
    }
  } else {
    // In-memory populate
    memDb.clear();

    demoUsers.forEach((u) => memDb.users.set(u.id, { ...u, createdAt: new Date().toISOString() }));
    itParks.forEach((p) => memDb.itParks.set(p.id, { ...p, createdAt: new Date().toISOString() }));
    facilities.forEach((f) => memDb.facilities.set(f.id, { ...f, createdAt: new Date().toISOString() }));
    zones.forEach((z) => memDb.zones.set(z.id, { ...z, createdAt: new Date().toISOString() }));

    // Generate slots
    zones.forEach((z) => {
      for (let sIdx = 1; sIdx <= 20; sIdx++) {
        const slotId = `slot-${z.id}-${sIdx}`;
        const slotNumber = `${z.code}-${sIdx < 10 ? '0' : ''}${sIdx}`;
        let type: 'standard' | 'ev' | 'accessible' = 'standard';
        if (sIdx <= 4 && z.evSpaces > 0) type = 'ev';
        else if (sIdx <= 6 && z.accessibleSpaces > 0) type = 'accessible';

        const status = sIdx <= 8 ? 'occupied' : sIdx <= 11 ? 'reserved' : 'available';

        memDb.slots.set(slotId, {
          id: slotId,
          _id: slotId,
          zoneId: z.id,
          facilityId: z.facilityId,
          slotNumber,
          level: z.level,
          type,
          status,
          currentVehiclePlate: status === 'occupied' ? `KA01AB${1000 + sIdx}` : undefined,
        });
      }
    });

    // Demo vehicles
    const v1 = {
      id: 'veh-demo-1',
      _id: 'veh-demo-1',
      userId: 'usr-commuter-1',
      licensePlate: 'KA01EV2026',
      make: 'Tesla',
      model: 'Model 3',
      color: 'Pearl White',
      isEv: true,
      isAccessible: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    const v2 = {
      id: 'veh-demo-2',
      _id: 'veh-demo-2',
      userId: 'usr-commuter-1',
      licensePlate: 'KA03MZ9999',
      make: 'BMW',
      model: '330i M Sport',
      color: 'Portimao Blue',
      isEv: false,
      isAccessible: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    memDb.vehicles.set(v1.id, v1);
    memDb.vehicles.set(v2.id, v2);
  }

  console.log('[Seed] ✔ Seed completed successfully!');
  console.log('--- Demo Accounts ---');
  console.log('  Admin:    admin@smartpark.ai    / SmartPark123!');
  console.log('  Operator: operator@smartpark.ai / SmartPark123!');
  console.log('  User:     user@smartpark.ai     / SmartPark123!\n');
}

if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await seedDatabaseData();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err);
      process.exit(1);
    }
  })();
}
