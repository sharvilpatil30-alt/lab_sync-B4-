import { Alert } from './notification';

export interface MonitoringOverview {
  totalLabs: number;
  availableLabs: number;
  occupiedLabs: number;
  maintenanceLabs: number;
  activeBookings: number;
  queuedBookings: number;
  totalResources: number;
  availableResources: number;
  alerts: Alert[];
  lastUpdated: string;
}

export interface SystemHealthData {
  status: 'ok' | 'degraded' | 'offline';
  timestamp: string;
  environment: string;
  version?: string;
  latencyMs?: number;
}
