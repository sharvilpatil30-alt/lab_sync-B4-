import {
  IAuthService,
  ILabService,
  IResourceService,
  IBookingService,
  IRoutingService,
  IMonitoringService,
  IReportsService,
  IMaintenanceService,
  IUserService,
  INotificationService,
} from './types';

import { ApiAuthService } from './api/ApiAuthService';
import { ApiLabService } from './api/ApiLabService';
import { ApiResourceService } from './api/ApiResourceService';
import { ApiBookingService } from './api/ApiBookingService';
import { ApiRoutingService } from './api/ApiRoutingService';
import { ApiMonitoringService } from './api/ApiMonitoringService';
import { ApiReportsService } from './api/ApiReportsService';
import { ApiMaintenanceService } from './api/ApiMaintenanceService';
import { ApiUserService } from './api/ApiUserService';
import { ApiNotificationService } from './api/ApiNotificationService';

// The production application operates exclusively in Real API Mode.
export function getActiveDataMode(): 'api' {
  return 'api';
}

export function setActiveDataMode(_mode: string) {
  // No-op: Mock Mode controls are removed; application always uses real backend.
}

export const authService: IAuthService = new ApiAuthService();
export const userService: IUserService = new ApiUserService();
export const labService: ILabService = new ApiLabService();
export const resourceService: IResourceService = new ApiResourceService();
export const bookingService: IBookingService = new ApiBookingService();
export const routingService: IRoutingService = new ApiRoutingService();
export const monitoringService: IMonitoringService = new ApiMonitoringService();
export const reportsService: IReportsService = new ApiReportsService();
export const maintenanceService: IMaintenanceService = new ApiMaintenanceService();
export const notificationService: INotificationService = new ApiNotificationService();

export * from './types';
