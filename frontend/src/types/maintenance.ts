import { Lab } from './lab';
import { User } from './user';

export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface MaintenanceRecord {
  id: string;
  maintenanceId: string;
  targetType: 'lab' | 'resource';
  target: string;
  affectedLab?: string | Lab;
  description: string;
  status: MaintenanceStatus;
  startDate: string;
  endDate: string;
  createdBy?: string | User;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceFilters {
  status?: MaintenanceStatus | 'all';
  targetType?: 'lab' | 'resource' | 'all';
}
