import { SessionStatus } from '@smartpark-ai/shared';

export interface IParkingSession {
  id?: string;
  _id?: string;
  reservationId?: string;
  userId: string;
  facilityId: string;
  zoneId: string;
  slotId?: string;
  slotNumber?: string;
  licensePlate: string;
  entryTime: Date | string;
  exitTime?: Date | string;
  durationMinutes?: number;
  status: SessionStatus;
  totalCost?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _SessionModel: any = null;

export async function getSessionModel() {
  if (!_SessionModel) {
    const mongoose = (await import('mongoose')).default;
    const SessionSchema = new mongoose.Schema(
      {
        reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true, index: true },
        slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
        slotNumber: { type: String, uppercase: true, trim: true },
        licensePlate: { type: String, required: true, uppercase: true, trim: true },
        entryTime: { type: Date, required: true, default: Date.now },
        exitTime: { type: Date },
        durationMinutes: { type: Number },
        status: {
          type: String,
          enum: ['active', 'completed'],
          default: 'active',
          index: true,
        },
        totalCost: { type: Number, default: 0 },
      },
      { timestamps: true }
    );
    _SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);
  }
  return _SessionModel;
}
