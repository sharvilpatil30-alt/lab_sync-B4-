import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, Role } from '../../constants/roles.js';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department?: string;
  profile?: {
    phone?: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, required: true },
    department: { type: String, default: 'General Academic' },
    profile: {
      phone: { type: String },
      avatarUrl: { type: String },
    },
  },
  { timestamps: true }
);

// Never return passwordHash in json output
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as any).passwordHash;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
