import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus =
  | 'REQUESTED'
  | 'DRAFT'
  | 'VALIDATED'
  | 'PENDING'
  | 'QUEUED'
  | 'LEASED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface IBooking extends Document {
  id: string;
  bookingId: string;
  user: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  lab: mongoose.Types.ObjectId;
  labId: string;
  labName: string;
  seatNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  status: BookingStatus;
  cancellationReason?: string;
  requiredResources?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, default: 'student' },
    lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    labId: { type: String, required: true, index: true },
    labName: { type: String, required: true },
    seatNumber: { type: Number, required: true, min: 1 },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'DRAFT',
        'VALIDATED',
        'PENDING',
        'QUEUED',
        'LEASED',
        'CONFIRMED',
        'ACTIVE',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
      ],
      default: 'CONFIRMED',
      index: true,
    },
    cancellationReason: { type: String, default: '' },
    requiredResources: [{ type: String }],
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

// Compound index to help fast conflict lookups
BookingSchema.index({ labId: 1, date: 1, seatNumber: 1, status: 1 });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
