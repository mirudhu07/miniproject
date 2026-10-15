export interface IFacility {
  id?: string;
  _id?: string;
  itParkId: string;
  name: string;
  code: string;
  buildingName: string;
  levels: number;
  totalCapacity: number;
  hasEvCharging: boolean;
  hasAccessibleParking: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  operatingHours: {
    open: string;
    close: string;
    is24x7: boolean;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _FacilityModel: any = null;

export async function getFacilityModel() {
  if (!_FacilityModel) {
    const mongoose = (await import('mongoose')).default;
    const FacilitySchema = new mongoose.Schema(
      {
        itParkId: { type: mongoose.Schema.Types.ObjectId, ref: 'ITPark', required: true, index: true },
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        buildingName: { type: String, required: true, trim: true },
        levels: { type: Number, default: 1 },
        totalCapacity: { type: Number, required: true, default: 0 },
        hasEvCharging: { type: Boolean, default: false },
        hasAccessibleParking: { type: Boolean, default: false },
        location: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
        operatingHours: {
          open: { type: String, default: '06:00' },
          close: { type: String, default: '23:00' },
          is24x7: { type: Boolean, default: true },
        },
      },
      { timestamps: true }
    );
    _FacilityModel = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);
  }
  return _FacilityModel;
}
