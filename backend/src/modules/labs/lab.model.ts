import mongoose, { Schema, Document } from 'mongoose';

export type LabOperationalStatus = 'available' | 'occupied' | 'maintenance' | 'offline';

export interface ILab extends Document {
  id: string;
  labId: string;
  name: string;
  description: string;
  location: string;
  building: string;
  floor: number | string;
  capacity: number;
  totalSeats: number;
  operationalStatus: LabOperationalStatus;
  maintenanceStatus?: string;
  maintenanceReason?: string;
  maintenanceStartedAt?: Date;
  availableResources: string[];
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabSchema = new Schema<ILab>(
  {
    labId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    location: { type: String, required: true },
    building: { type: String, required: true },
    floor: { type: Schema.Types.Mixed, default: 1 },
    capacity: { type: Number, default: 30 },
    totalSeats: { type: Number, default: 30 },
    operationalStatus: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'offline'],
      default: 'available',
      index: true,
    },
    maintenanceStatus: { type: String, default: 'None' },
    maintenanceReason: { type: String, default: '' },
    maintenanceStartedAt: { type: Date },
    availableResources: [{ type: String }],
    department: { type: String, default: 'General Academic' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const Lab = mongoose.model<ILab>('Lab', LabSchema);
