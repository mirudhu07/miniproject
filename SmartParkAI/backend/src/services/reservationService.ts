import crypto from 'crypto';
import { dbState, memDb } from '../config/database';
import { getZoneModel } from '../models/Zone';
import { getSlotModel } from '../models/Slot';
import { getReservationModel } from '../models/Reservation';
import {
  broadcastReservationCreated,
  broadcastReservationCancelled,
  broadcastOccupancyChange,
  broadcastSlotChange,
} from './socketService';

export interface CreateReservationParams {
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  licensePlate: string;
  startTime: Date;
  endTime: Date;
  estimatedPrice: number;
}

export function generateBookingReference(): string {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SPK-${rand}`;
}

export async function createReservationAtomic(params: CreateReservationParams) {
  const ref = generateBookingReference();
  const qrToken = crypto.randomBytes(16).toString('hex');

  if (dbState.mode === 'mongodb') {
    const ZoneModel = await getZoneModel();
    const SlotModel = await getSlotModel();
    const ReservationModel = await getReservationModel();
    const mongoose = (await import('mongoose')).default;

    const zone = await ZoneModel.findById(params.zoneId);
    if (!zone) {
      throw new Error('Parking zone not found');
    }

    const availableSpaces = zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces);
    if (availableSpaces <= 0) {
      const err: any = new Error('No available capacity in the selected zone.');
      err.statusCode = 409;
      throw err;
    }

    let slotNumber: string | undefined;
    if (params.slotId) {
      const updatedSlot = await SlotModel.findOneAndUpdate(
        { _id: params.slotId, status: 'available' },
        { status: 'reserved', currentVehiclePlate: params.licensePlate },
        { new: true }
      );

      if (!updatedSlot) {
        const err: any = new Error('The selected parking slot is no longer available. Please select another slot.');
        err.statusCode = 409;
        throw err;
      }
      slotNumber = updatedSlot.slotNumber;
      broadcastSlotChange(updatedSlot);
    }

    const updatedZone = await ZoneModel.findOneAndUpdate(
      {
        _id: params.zoneId,
        $expr: { $gt: ['$totalSpaces', { $add: ['$occupiedSpaces', '$reservedSpaces'] }] },
      },
      { $inc: { reservedSpaces: 1 } },
      { new: true }
    );

    if (!updatedZone) {
      if (params.slotId) {
        await SlotModel.findByIdAndUpdate(params.slotId, { status: 'available', currentVehiclePlate: null });
      }
      const err: any = new Error('Capacity exhausted during reservation confirmation. Please try another zone.');
      err.statusCode = 409;
      throw err;
    }

    const reservation = await ReservationModel.create({
      bookingReference: ref,
      userId: new mongoose.Types.ObjectId(params.userId),
      facilityId: new mongoose.Types.ObjectId(params.facilityId),
      zoneId: new mongoose.Types.ObjectId(params.zoneId),
      slotId: params.slotId ? new mongoose.Types.ObjectId(params.slotId) : undefined,
      slotNumber,
      licensePlate: params.licensePlate.toUpperCase(),
      startTime: params.startTime,
      endTime: params.endTime,
      status: 'active',
      estimatedPrice: params.estimatedPrice,
      qrCodeToken: qrToken,
    });

    broadcastReservationCreated(reservation);
    broadcastOccupancyChange({
      facilityId: params.facilityId,
      zoneId: params.zoneId,
      totalSpaces: updatedZone.totalSpaces,
      availableSpaces: Math.max(0, updatedZone.totalSpaces - (updatedZone.occupiedSpaces + updatedZone.reservedSpaces)),
      occupiedSpaces: updatedZone.occupiedSpaces,
      occupancyPercentage: Math.round(((updatedZone.occupiedSpaces + updatedZone.reservedSpaces) / updatedZone.totalSpaces) * 100),
      timestamp: new Date().toISOString(),
    });

    return reservation;
  } else {
    // In-memory development mode
    const zone = memDb.zones.get(params.zoneId);
    if (!zone) {
      throw new Error('Parking zone not found');
    }

    const availableSpaces = zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces);
    if (availableSpaces <= 0) {
      const err: any = new Error('No available capacity in the selected zone.');
      err.statusCode = 409;
      throw err;
    }

    let slotNumber: string | undefined;
    if (params.slotId) {
      const slot = memDb.slots.get(params.slotId);
      if (!slot || slot.status !== 'available') {
        const err: any = new Error('The selected parking slot is no longer available.');
        err.statusCode = 409;
        throw err;
      }
      slot.status = 'reserved';
      slot.currentVehiclePlate = params.licensePlate.toUpperCase();
      slotNumber = slot.slotNumber;
      broadcastSlotChange(slot);
    }

    zone.reservedSpaces += 1;

    const resId = `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reservation = {
      id: resId,
      _id: resId,
      bookingReference: ref,
      userId: params.userId,
      facilityId: params.facilityId,
      zoneId: params.zoneId,
      slotId: params.slotId,
      slotNumber,
      licensePlate: params.licensePlate.toUpperCase(),
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
      status: 'active',
      estimatedPrice: params.estimatedPrice,
      qrCodeToken: qrToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memDb.reservations.set(resId, reservation);

    broadcastReservationCreated(reservation);
    broadcastOccupancyChange({
      facilityId: params.facilityId,
      zoneId: params.zoneId,
      totalSpaces: zone.totalSpaces,
      availableSpaces: Math.max(0, zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces)),
      occupiedSpaces: zone.occupiedSpaces,
      occupancyPercentage: Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / zone.totalSpaces) * 100),
      timestamp: new Date().toISOString(),
    });

    return reservation;
  }
}

export async function cancelReservation(reservationId: string, userId: string) {
  if (dbState.mode === 'mongodb') {
    const ReservationModel = await getReservationModel();
    const ZoneModel = await getZoneModel();
    const SlotModel = await getSlotModel();

    const reservation = await ReservationModel.findOne({ _id: reservationId, userId });
    if (!reservation) {
      const err: any = new Error('Reservation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    if (reservation.status !== 'active') {
      const err: any = new Error(`Cannot cancel reservation with status '${reservation.status}'`);
      err.statusCode = 400;
      throw err;
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const zone = await ZoneModel.findByIdAndUpdate(
      reservation.zoneId,
      { $inc: { reservedSpaces: -1 } },
      { new: true }
    );

    if (reservation.slotId) {
      const slot = await SlotModel.findByIdAndUpdate(
        reservation.slotId,
        { status: 'available', currentVehiclePlate: null },
        { new: true }
      );
      if (slot) broadcastSlotChange(slot);
    }

    broadcastReservationCancelled(reservation);
    if (zone) {
      broadcastOccupancyChange({
        facilityId: reservation.facilityId.toString(),
        zoneId: reservation.zoneId.toString(),
        totalSpaces: zone.totalSpaces,
        availableSpaces: Math.max(0, zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces)),
        occupiedSpaces: zone.occupiedSpaces,
        occupancyPercentage: Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / zone.totalSpaces) * 100),
        timestamp: new Date().toISOString(),
      });
    }

    return reservation;
  } else {
    const reservation = memDb.reservations.get(reservationId);
    if (!reservation || reservation.userId !== userId) {
      const err: any = new Error('Reservation not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    if (reservation.status !== 'active') {
      const err: any = new Error(`Cannot cancel reservation with status '${reservation.status}'`);
      err.statusCode = 400;
      throw err;
    }

    reservation.status = 'cancelled';
    reservation.updatedAt = new Date().toISOString();

    const zone = memDb.zones.get(reservation.zoneId);
    if (zone && zone.reservedSpaces > 0) {
      zone.reservedSpaces -= 1;
    }

    if (reservation.slotId) {
      const slot = memDb.slots.get(reservation.slotId);
      if (slot) {
        slot.status = 'available';
        slot.currentVehiclePlate = null;
        broadcastSlotChange(slot);
      }
    }

    broadcastReservationCancelled(reservation);
    if (zone) {
      broadcastOccupancyChange({
        facilityId: reservation.facilityId,
        zoneId: reservation.zoneId,
        totalSpaces: zone.totalSpaces,
        availableSpaces: Math.max(0, zone.totalSpaces - (zone.occupiedSpaces + zone.reservedSpaces)),
        occupiedSpaces: zone.occupiedSpaces,
        occupancyPercentage: Math.round(((zone.occupiedSpaces + zone.reservedSpaces) / zone.totalSpaces) * 100),
        timestamp: new Date().toISOString(),
      });
    }

    return reservation;
  }
}
