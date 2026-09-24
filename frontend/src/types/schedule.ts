import { BookingStatus } from './booking';
import { Resource } from './resource';

export interface SchedulingResult {
  bookingId: string;
  status: BookingStatus;
  queuePosition?: number;
  requestsAhead?: number;
  estimatedStart?: string;
  allocatedResources?: string[] | Resource[];
  schedulingMetadata?: Record<string, unknown>;
}
