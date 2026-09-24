import { Role, User } from './user';
import { Lab } from './lab';
import { Resource } from './resource';

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
  | 'REJECTED'
  | 'WAITLISTED'
  | 'EXPIRED'
  | string;

export interface Booking {
  id: string;
  bookingId: string;
  user: string | User;
  userRole: Role;
  lab: string | Lab;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  requiredResources: string[] | Resource[];
  allocatedResources?: string[] | Resource[];
  status: BookingStatus;
  queuePosition?: number;
  requestsAhead?: number;
  estimatedStart?: string;
  schedulingMetadata?: Record<string, unknown>;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingFilters {
  status?: BookingStatus | 'all';
  date?: string;
  labId?: string;
  userId?: string;
}
