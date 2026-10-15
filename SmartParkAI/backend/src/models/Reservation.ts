import { ReservationStatus } from '@smartpark-ai/shared';

export interface IReservation {
  id?: string;
  _id?: string;
  bookingReference: string;
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  slotNumber?: string;
  licensePlate: string;
  startTime: Date | string;
  endTime: Date | string;
  status: ReservationStatus;
  estimatedPrice: number;
  qrCodeToken: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _ReservationModel: any = null;

export async function getReservationModel() {
  if (!_ReservationModel) {
    const mongoose = (await import('mongoose')).default;
    const ReservationSchema = new mongoose.Schema(
      {
        bookingReference: { type: String, required: true, unique: true, uppercase: true, trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true, index: true },
        slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
        slotNumber: { type: String, uppercase: true, trim: true },
        licensePlate: { type: String, required: true, uppercase: true, trim: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        status: {
          type: String,
          enum: ['active', 'completed', 'cancelled', 'expired'],
          default: 'active',
          index: true,
        },
        estimatedPrice: { type: Number, required: true, default: 0 },
        qrCodeToken: { type: String, required: true },
      },
      { timestamps: true }
    );
    _ReservationModel = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
  }
  return _ReservationModel;
}
