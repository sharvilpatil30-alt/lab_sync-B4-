import { DATA_MODE } from '../config';
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

import { MockAuthService } from './mock/MockAuthService';
import { MockLabService } from './mock/MockLabService';
import { MockResourceService } from './mock/MockResourceService';
import { MockBookingService } from './mock/MockBookingService';
import { MockRoutingService } from './mock/MockRoutingService';
import { MockMonitoringService } from './mock/MockMonitoringService';
import { MockReportsService } from './mock/MockReportsService';
import { MockMaintenanceService } from './mock/MockMaintenanceService';
import { MockUserService } from './mock/MockUserService';
import { MockNotificationService } from './mock/MockNotificationService';

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

// Determine active mode from localStorage or config default
export function getActiveDataMode(): 'mock' | 'api' {
  const override = localStorage.getItem('smart_campus_data_mode');
  if (override === 'mock' || override === 'api') {
    return override;
  }
  return DATA_MODE === 'api' ? 'api' : 'mock';
}

export function setActiveDataMode(mode: 'mock' | 'api') {
  localStorage.setItem('smart_campus_data_mode', mode);
  window.location.reload();
}

const isApiMode = getActiveDataMode() === 'api';

export const authService: IAuthService = isApiMode ? new ApiAuthService() : new MockAuthService();
export const userService: IUserService = isApiMode ? new ApiUserService() : new MockUserService();
export const labService: ILabService = isApiMode ? new ApiLabService() : new MockLabService();
export const resourceService: IResourceService = isApiMode ? new ApiResourceService() : new MockResourceService();
export const bookingService: IBookingService = isApiMode ? new ApiBookingService() : new MockBookingService();
export const routingService: IRoutingService = isApiMode ? new ApiRoutingService() : new MockRoutingService();
export const monitoringService: IMonitoringService = isApiMode ? new ApiMonitoringService() : new MockMonitoringService();
export const reportsService: IReportsService = isApiMode ? new ApiReportsService() : new MockReportsService();
export const maintenanceService: IMaintenanceService = isApiMode ? new ApiMaintenanceService() : new MockMaintenanceService();
export const notificationService: INotificationService = isApiMode ? new ApiNotificationService() : new MockNotificationService();

export * from './types';
