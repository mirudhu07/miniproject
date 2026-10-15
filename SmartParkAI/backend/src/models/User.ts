import { UserRole } from '@smartpark-ai/shared';

export interface IUser {
  id?: string;
  _id?: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  defaultVehiclePlate?: string;
  companyName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _UserModel: any = null;

export async function getUserModel() {
  if (!_UserModel) {
    const mongoose = (await import('mongoose')).default;
    const UserSchema = new mongoose.Schema(
      {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        role: { type: String, enum: ['user', 'operator', 'admin'], default: 'user' },
        defaultVehiclePlate: { type: String, uppercase: true, trim: true },
        companyName: { type: String, trim: true },
      },
      { timestamps: true }
    );
    _UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
  }
  return _UserModel;
}
