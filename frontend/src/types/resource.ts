import { Lab } from './lab';

export type ResourceOperationalStatus = 'available' | 'in-use' | 'maintenance' | 'offline';

export interface Resource {
  id: string;
  resourceId: string;
  name: string;
  type: string;
  description: string;
  lab: string | Lab;
  operationalStatus: ResourceOperationalStatus;
  maintenanceStatus?: string;
  availability: boolean;
  lastUpdated?: string;
  createdAt?: string;
}

export interface ResourceFilters {
  lab?: string;
  type?: string;
  status?: ResourceOperationalStatus | 'all';
  availability?: boolean;
}
