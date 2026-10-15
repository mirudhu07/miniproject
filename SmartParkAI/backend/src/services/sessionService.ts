import { dbState, memDb } from '../config/database';
import { getSessionModel } from '../models/Session';
import { getZoneModel } from '../models/Zone';
import { getSlotModel } from '../models/Slot';
import { getReservationModel } from '../models/Reservation';
import {
  broadcastSessionStarted,
  broadcastSessionEnded,
  broadcastOccupancyChange,
  broadcastSlotChange,
} from './socketService';

export interface StartSessionParams {
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  licensePlate: string;
  reservationId?: string;
}

export async function startParkingSession(params: StartSessionParams) {
  const entryTime = new Date();

  if (dbState.mode === 'mongodb') {
    const SessionModel = await getSessionModel();
    const ZoneModel = await getZoneModel();
    const SlotModel = await getSlotModel();
    const ReservationModel = await getReservationModel();
    const mongoose = (await import('mongoose')).default;

    const existing = await SessionModel.findOne({
      licensePlate: params.licensePlate.toUpperCase(),
      status: 'active',
    });
    if (existing) {
      const err: any = new Error(`Vehicle ${params.licensePlate} already has an active parking session.`);
      err.statusCode = 409;
      throw err;
    }

    let slotNumber: string | undefined;
    if (params.slotId) {
      const slot = await SlotModel.findByIdAndUpdate(
        params.slotId,
        { status: 'occupied', currentVehiclePlate: params.licensePlate.toUpperCase() },
        { new: true }
      );
      if (slot) {
        slotNumber = slot.slotNumber;
        broadcastSlotChange(slot);
      }
    }

    const zoneUpdates: any = { $inc: { occupiedSpaces: 1 } };

    if (params.reservationId) {
      const resDoc = await ReservationModel.findByIdAndUpdate(
        params.reservationId,
        { status: 'completed' },
        { new: true }
      );
      if (resDoc) {
        zoneUpdates.$inc.reservedSpaces = -1;
      }
    }

    const updatedZone = await ZoneModel.findByIdAndUpdate(params.zoneId, zoneUpdates, { new: true });

    const session = await SessionModel.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      facilityId: new mongoose.Types.ObjectId(params.facilityId),
      zoneId: new mongoose.Types.ObjectId(params.zoneId),
      slotId: params.slotId ? new mongoose.Types.ObjectId(params.slotId) : undefined,
      slotNumber,
      licensePlate: params.licensePlate.toUpperCase(),
      reservationId: params.reservationId ? new mongoose.Types.ObjectId(params.reservationId) : undefined,
      entryTime,
      status: 'active',
    });

    broadcastSessionStarted(session);
    if (updatedZone) {
      broadcastOccupancyChange({
        facilityId: params.facilityId,
        zoneId: params.zoneId,
        totalSpaces: updatedZone.totalSpaces,
        availableSpaces: Math.max(0, updatedZone.totalSpaces - (updatedZone.occupiedSpaces + updatedZone.reservedSpaces)),
        occupiedSpaces: updatedZone.occupiedSpaces,
        occupancyPercentage: Math.round(((updatedZone.occupiedSpaces + updatedZone.reservedSpaces) / updatedZone.totalSpaces) * 100),
        timestamp: entryTime.toISOString(),
      });
    }

    return session;
  } else {
    // In-memory mode
    for (const s of memDb.sessions.values()) {
      if (s.licensePlate === params.licensePlate.toUpperCase() && s.status === 'active') {
        const err: any = new Error(`Vehicle ${params.licensePlate} already has an active session.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const zone = memDb.zones.get(params.zoneId);
    if (!zone) throw new Error('Zone not found');

    let slotNumber: string | undefined;
    if (params.slotId) {
      const slot = memDb.slots.get(params.slotId);
      if (slot) {
        slot.status = 'occupied';
        slot.currentVehiclePlate = params.licensePlate.toUpperCase();
        slotNumber = slot.slotNumber;
        broadcastSlotChange(slot);
      }
    }

    zone.occupiedSpaces += 1;
    if (params.reservationId) {
      const resDoc = memDb.reservations.get(params.reservationId);
      if (resDoc) {
        resDoc.status = 'completed';
        if (zone.reservedSpaces > 0) zone.reservedSpaces -= 1;
      }
    }

    const sessId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const session = {
      id: sessId,
      _id: sessId,
      userId: params.userId,
      facilityId: params.facilityId,
      zoneId: params.zoneId,
      slotId: params.slotId,
      slotNumber,
      licensePlate: params.licensePlate.toUpperCase(),
      reservationId: params.reservationId,
      entryTime: entryTime.toISOString(),
      status: 'active',
      createdAt: entryTime.toISOString(),
      updatedAt: entryTime.toISOString(),
    };

    memDb.sessions.set(sessId, session);

    broadcastSessionStarted(session);
    broadcastOccupancyChange({
      facilityId: params.facilityId,
      zoneId: params.zoneId,
      totalSpaces: zone.totalSpaces,
      availableSpaces: Math.max(0, zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces)),
      occupiedSpaces: zone.occupiedSpaces,
      occupancyPercentage: Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / zone.totalSpaces) * 100),
      timestamp: entryTime.toISOString(),
    });

    return session;
  }
}

export async function endParkingSession(sessionId: string, userId: string) {
  const exitTime = new Date();

  if (dbState.mode === 'mongodb') {
    const SessionModel = await getSessionModel();
    const ZoneModel = await getZoneModel();
    const SlotModel = await getSlotModel();

    const session = await SessionModel.findOne({ _id: sessionId, userId, status: 'active' });
    if (!session) {
      const err: any = new Error('Active parking session not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const zone = await ZoneModel.findById(session.zoneId);
    const pricePerHour = zone?.pricePerHour || 20;

    const durationMinutes = Math.max(1, Math.round((exitTime.getTime() - session.entryTime.getTime()) / 60000));
    const hours = Math.ceil(durationMinutes / 60);
    const totalCost = hours * pricePerHour;

    session.exitTime = exitTime;
    session.durationMinutes = durationMinutes;
    session.totalCost = totalCost;
    session.status = 'completed';
    await session.save();

    if (session.slotId) {
      const slot = await SlotModel.findByIdAndUpdate(
        session.slotId,
        { status: 'available', currentVehiclePlate: null },
        { new: true }
      );
      if (slot) broadcastSlotChange(slot);
    }

    const updatedZone = await ZoneModel.findByIdAndUpdate(
      session.zoneId,
      { $inc: { occupiedSpaces: -1 } },
      { new: true }
    );

    broadcastSessionEnded(session);
    if (updatedZone) {
      broadcastOccupancyChange({
        facilityId: session.facilityId.toString(),
        zoneId: session.zoneId.toString(),
        totalSpaces: updatedZone.totalSpaces,
        availableSpaces: Math.max(0, updatedZone.totalSpaces - (updatedZone.occupiedSpaces + updatedZone.reservedSpaces)),
        occupiedSpaces: updatedZone.occupiedSpaces,
        occupancyPercentage: Math.round(((updatedZone.occupiedSpaces + updatedZone.reservedSpaces) / updatedZone.totalSpaces) * 100),
        timestamp: exitTime.toISOString(),
      });
    }

    return session;
  } else {
    const session = memDb.sessions.get(sessionId);
    if (!session || session.userId !== userId || session.status !== 'active') {
      const err: any = new Error('Active parking session not found.');
      err.statusCode = 404;
      throw err;
    }

    const zone = memDb.zones.get(session.zoneId);
    const pricePerHour = zone?.pricePerHour || 20;

    const entryMs = new Date(session.entryTime).getTime();
    const durationMinutes = Math.max(1, Math.round((exitTime.getTime() - entryMs) / 60000));
    const hours = Math.ceil(durationMinutes / 60);
    const totalCost = hours * pricePerHour;

    session.exitTime = exitTime.toISOString();
    session.durationMinutes = durationMinutes;
    session.totalCost = totalCost;
    session.status = 'completed';
    session.updatedAt = exitTime.toISOString();

    if (session.slotId) {
      const slot = memDb.slots.get(session.slotId);
      if (slot) {
        slot.status = 'available';
        slot.currentVehiclePlate = null;
        broadcastSlotChange(slot);
      }
    }

    if (zone && zone.occupiedSpaces > 0) {
      zone.occupiedSpaces -= 1;
    }

    broadcastSessionEnded(session);
    if (zone) {
      broadcastOccupancyChange({
        facilityId: session.facilityId,
        zoneId: session.zoneId,
        totalSpaces: zone.totalSpaces,
        availableSpaces: Math.max(0, zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces)),
        occupiedSpaces: zone.occupiedSpaces,
        occupancyPercentage: Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / zone.totalSpaces) * 100),
        timestamp: exitTime.toISOString(),
      });
    }

    return session;
  }
}
