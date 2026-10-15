export interface IVehicle {
  id?: string;
  _id?: string;
  userId: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  isEv: boolean;
  isAccessible: boolean;
  isDefault: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _VehicleModel: any = null;

export async function getVehicleModel() {
  if (!_VehicleModel) {
    const mongoose = (await import('mongoose')).default;
    const VehicleSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        licensePlate: { type: String, required: true, uppercase: true, trim: true },
        make: { type: String, required: true, trim: true },
        model: { type: String, required: true, trim: true },
        color: { type: String, required: true, trim: true },
        isEv: { type: Boolean, default: false },
        isAccessible: { type: Boolean, default: false },
        isDefault: { type: Boolean, default: false },
      },
      { timestamps: true }
    );
    VehicleSchema.index({ userId: 1, licensePlate: 1 }, { unique: true });
    _VehicleModel = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
  }
  return _VehicleModel;
}
