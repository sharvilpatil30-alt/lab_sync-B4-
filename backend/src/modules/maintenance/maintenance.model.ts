import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceRecord extends Document {
  id: string;
  labId: string;
  labName: string;
  reason: string;
  action: 'ENTERED_MAINTENANCE' | 'RELEASED_FROM_MAINTENANCE';
  status: 'active' | 'resolved';
  performedBy: string;
  performedByEmail: string;
  timestamp: Date;
  resolvedAt?: Date;
  notes?: string;
}

const MaintenanceRecordSchema = new Schema<IMaintenanceRecord>(
  {
    labId: { type: String, required: true, index: true },
    labName: { type: String, required: true },
    reason: { type: String, required: true },
    action: {
      type: String,
      enum: ['ENTERED_MAINTENANCE', 'RELEASED_FROM_MAINTENANCE'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true,
    },
    performedBy: { type: String, required: true },
    performedByEmail: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    notes: { type: String, default: '' },
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

export const MaintenanceRecord = mongoose.model<IMaintenanceRecord>(
  'MaintenanceRecord',
  MaintenanceRecordSchema
);
