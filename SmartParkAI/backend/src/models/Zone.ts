export interface IZone {
  id?: string;
  _id?: string;
  facilityId: string;
  name: string;
  code: string;
  level: number;
  totalSpaces: number;
  occupiedSpaces: number;
  reservedSpaces: number;
  evSpaces: number;
  accessibleSpaces: number;
  pricePerHour: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _ZoneModel: any = null;

export async function getZoneModel() {
  if (!_ZoneModel) {
    const mongoose = (await import('mongoose')).default;
    const ZoneSchema = new mongoose.Schema(
      {
        facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        level: { type: Number, required: true, default: 1 },
        totalSpaces: { type: Number, required: true, min: 1 },
        occupiedSpaces: { type: Number, default: 0, min: 0 },
        reservedSpaces: { type: Number, default: 0, min: 0 },
        evSpaces: { type: Number, default: 0, min: 0 },
        accessibleSpaces: { type: Number, default: 0, min: 0 },
        pricePerHour: { type: Number, required: true, default: 20 },
      },
      { timestamps: true }
    );
    _ZoneModel = mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);
  }
  return _ZoneModel;
}
