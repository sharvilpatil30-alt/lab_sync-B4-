import { Resource } from './resource';

export type LabOperationalStatus = 'available' | 'occupied' | 'maintenance' | 'offline';

export interface Lab {
  id: string;
  labId: string;
  name: string;
  description: string;
  location: string;
  building: string;
  floor: number | string;
  capacity: number;
  operationalStatus: LabOperationalStatus;
  maintenanceStatus?: string;
  availableResources?: string[] | Resource[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LabFilters {
  search?: string;
  building?: string;
  location?: string;
  capacity?: number;
  status?: LabOperationalStatus | 'all';
  date?: string;
  startTime?: string;
  endTime?: string;
  equipment?: string;
  capability?: string;
  availability?: 'available' | 'occupied' | 'partial' | 'all';
}
