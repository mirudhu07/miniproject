import { SlotType, SlotStatus } from '@smartpark-ai/shared';

export interface ISlot {
  id?: string;
  _id?: string;
  zoneId: string;
  facilityId: string;
  slotNumber: string;
  level: number;
  type: SlotType;
  status: SlotStatus;
  currentVehiclePlate?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _SlotModel: any = null;

export async function getSlotModel() {
  if (!_SlotModel) {
    const mongoose = (await import('mongoose')).default;
    const SlotSchema = new mongoose.Schema(
      {
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true, index: true },
        facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
        slotNumber: { type: String, required: true, uppercase: true, trim: true },
        level: { type: Number, required: true },
        type: {
          type: String,
          enum: ['standard', 'ev', 'accessible', 'compact', 'visitor'],
          default: 'standard',
        },
        status: {
          type: String,
          enum: ['available', 'occupied', 'reserved', 'maintenance'],
          default: 'available',
          index: true,
        },
        currentVehiclePlate: { type: String, uppercase: true, trim: true },
      },
      { timestamps: true }
    );
    _SlotModel = mongoose.models.Slot || mongoose.model('Slot', SlotSchema);
  }
  return _SlotModel;
}
