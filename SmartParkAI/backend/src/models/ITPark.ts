export interface IITPark {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  location: {
    latitude: number;
    longitude: number;
  };
  totalCapacity: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

let _ITParkModel: any = null;

export async function getITParkModel() {
  if (!_ITParkModel) {
    const mongoose = (await import('mongoose')).default;
    const ITParkSchema = new mongoose.Schema(
      {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        location: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
        totalCapacity: { type: Number, default: 0 },
      },
      { timestamps: true }
    );
    _ITParkModel = mongoose.models.ITPark || mongoose.model('ITPark', ITParkSchema);
  }
  return _ITParkModel;
}
