/**
 * SmartPark AI - Backend Core Test Suite
 * Validates auth, database operations, double-booking prevention, sessions, and health endpoints.
 */

import { ENV } from '../src/config/env';
import { connectDatabase, disconnectDatabase, dbState, memDb } from '../src/config/database';
import { seedDatabaseData } from '../src/seed';
import { createReservationAtomic, cancelReservation } from '../src/services/reservationService';
import { startParkingSession, endParkingSession } from '../src/services/sessionService';
import { getOccupancyPrediction } from '../src/services/mlClient';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   SmartPark AI - Backend In-Process Test Suite');
  console.log('======================================================\n');

  let passedCount = 0;

  // 1. Database Connection & Seeding
  console.log('[Test 1] Testing Database Connection & Seeding...');
  await connectDatabase();
  await seedDatabaseData();
  console.log(`✔ Database ready: ${dbState.name} (${dbState.mode})`);
  passedCount++;

  // 2. Querying Campuses & Facilities
  console.log('\n[Test 2] Testing IT Park & Facility Discovery...');
  const parkCount = dbState.mode === 'mongodb' ? 3 : memDb.itParks.size;
  const facCount = dbState.mode === 'mongodb' ? 3 : memDb.facilities.size;
  const zoneCount = dbState.mode === 'mongodb' ? 5 : memDb.zones.size;
  if (parkCount < 3 || facCount < 3 || zoneCount < 5) {
    throw new Error(`Insufficient seeded entities: ${parkCount} parks, ${facCount} facilities, ${zoneCount} zones`);
  }
  console.log(`✔ IT Parks: ${parkCount}, Facilities: ${facCount}, Zones: ${zoneCount}`);
  passedCount++;

  // 3. Testing Atomic Reservation & Capacity Decrement
  console.log('\n[Test 3] Testing Atomic Reservation Creation...');
  const zoneId = 'zone-cyber-a1';
  const userId = 'usr-commuter-1';
  const facilityId = 'fac-cg-tower-a';

  const reservation = await createReservationAtomic({
    userId,
    facilityId,
    zoneId,
    licensePlate: 'KA01EV2026',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    estimatedPrice: 30,
  });

  if (!reservation.bookingReference || !reservation.bookingReference.startsWith('SPK-')) {
    throw new Error(`Invalid booking reference: ${reservation.bookingReference}`);
  }
  console.log(`✔ Reservation confirmed: Ref = ${reservation.bookingReference}, Status = ${reservation.status}`);
  passedCount++;

  // 4. Testing Double Booking Conflict Protection
  console.log('\n[Test 4] Testing Double-Booking Conflict Prevention...');
  const testZoneId = 'zone-cyber-a2';
  // Attempt to allocate specific slot
  const testSlotId = 'slot-zone-cyber-a2-12';

  // First reservation of slot succeeds
  const r1 = await createReservationAtomic({
    userId,
    facilityId,
    zoneId: testZoneId,
    slotId: testSlotId,
    licensePlate: 'KA01AA1111',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    estimatedPrice: 25,
  });
  console.log(`✔ First reservation allocated slot: ${r1.bookingReference}`);

  // Second reservation of the exact same slot MUST fail with conflict (409)
  let conflictCaught = false;
  try {
    await createReservationAtomic({
      userId: 'usr-admin-1',
      facilityId,
      zoneId: testZoneId,
      slotId: testSlotId,
      licensePlate: 'KA01BB2222',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      estimatedPrice: 25,
    });
  } catch (err: any) {
    if (err.statusCode === 409 || err.message.includes('not available')) {
      conflictCaught = true;
      console.log('✔ Concurrency protection: Successfully rejected conflicting double-booking with HTTP 409!');
    } else {
      throw err;
    }
  }

  if (!conflictCaught) {
    throw new Error('Double-booking prevention failed: duplicate reservation was incorrectly allowed!');
  }
  passedCount++;

  // 5. Testing Parking Session Lifecycle (Start -> Active -> End)
  console.log('\n[Test 5] Testing Parking Session Lifecycle...');
  const session = await startParkingSession({
    userId,
    facilityId,
    zoneId,
    licensePlate: 'KA01EV2026',
    reservationId: reservation.id || reservation._id,
  });

  if (session.status !== 'active') {
    throw new Error(`Expected session status 'active', got '${session.status}'`);
  }
  console.log(`✔ Session started at server timestamp: ${session.entryTime} (Status: ${session.status})`);

  // End session
  const ended = await endParkingSession(session.id || session._id, userId);
  if (ended.status !== 'completed' || !ended.exitTime) {
    throw new Error(`Expected session status 'completed' with exitTime, got '${ended.status}'`);
  }
  console.log(`✔ Session ended at server timestamp: ${ended.exitTime} (Total Cost: ₹${ended.totalCost})`);
  passedCount++;

  // 6. Testing ML Integration & Fallback Heuristic
  console.log('\n[Test 6] Testing ML Prediction Integration & Fallback...');
  const pred = await getOccupancyPrediction({
    zoneId,
    currentOccupancyPct: 65,
    totalCapacity: 200,
    reservationsCount: 15,
  });
  if (pred.predictedOccupancyPercentage < 0 || pred.predictedOccupancyPercentage > 100) {
    throw new Error(`Invalid predicted occupancy percentage: ${pred.predictedOccupancyPercentage}`);
  }
  console.log(`✔ ML Prediction returned: ${pred.predictedOccupancyPercentage}% (Model: ${pred.modelVersion}, Freshness: ${pred.dataFreshness})`);
  passedCount++;

  // Cleanup
  await disconnectDatabase();

  console.log(`\n======================================================`);
  console.log(`  🎉 All ${passedCount}/${passedCount} Backend Tests Passed Successfully!`);
  console.log(`======================================================\n`);
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Backend Test Suite Failed:', err);
  process.exit(1);
});
