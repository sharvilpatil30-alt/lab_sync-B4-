import {
  User,
  Lab,
  Resource,
  Booking,
  BookingStatus,
  SchedulingResult,
  RouteResult,
  MaintenanceRecord,
  Notification,
  Alert,
  MonitoringOverview,
  ReportsDashboardData,
  LabFilters,
  BookingFilters,
  ResourceFilters,
  MaintenanceFilters,
  ApiResponse,
  SystemHealthData,
} from '../types';

export interface IAuthService {
  login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>>;
  register(data: { name: string; email: string; password: string; role: string; department?: string }): Promise<ApiResponse<{ token: string; user: User }>>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ApiResponse<User>>;
}

export interface IUserService {
  getProfile(): Promise<ApiResponse<User>>;
  updateProfile(data: Partial<User>): Promise<ApiResponse<User>>;
}

export interface ILabService {
  list(filters?: LabFilters): Promise<ApiResponse<Lab[]>>;
  getById(labId: string): Promise<ApiResponse<Lab>>;
  create(data: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lab>>;
  update(labId: string, data: Partial<Lab>): Promise<ApiResponse<Lab>>;
  delete(labId: string): Promise<ApiResponse<{ id: string }>>;
}

export interface IResourceService {
  list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>>;
  getById(resourceId: string): Promise<ApiResponse<Resource>>;
  create(data: Omit<Resource, 'id' | 'createdAt'>): Promise<ApiResponse<Resource>>;
  update(resourceId: string, data: Partial<Resource>): Promise<ApiResponse<Resource>>;
  updateStatus(resourceId: string, operationalStatus: string, maintenanceStatus?: string): Promise<ApiResponse<Resource>>;
  delete(resourceId: string): Promise<ApiResponse<{ id: string }>>;
}

export interface IBookingService {
  listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>>;
  listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>>;
  getById(bookingId: string): Promise<ApiResponse<Booking>>;
  create(data: {
    labId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    requiredResources?: string[];
  }): Promise<ApiResponse<Booking & { schedulingResult?: SchedulingResult }>>;
  cancel(bookingId: string, cancellationReason?: string): Promise<ApiResponse<Booking>>;
  updateStatus(bookingId: string, status: BookingStatus, reason?: string): Promise<ApiResponse<Booking>>;
}

export interface IRoutingService {
  getRoute(bookingId: string): Promise<ApiResponse<RouteResult>>;
}

export interface IMonitoringService {
  getOverview(): Promise<ApiResponse<MonitoringOverview>>;
  getAlerts(): Promise<ApiResponse<Alert[]>>;
  resolveAlert(alertId: string): Promise<ApiResponse<Alert>>;
  checkHealth(): Promise<ApiResponse<SystemHealthData>>;
}

export interface IReportsService {
  getDashboardData(dateRange?: { startDate: string; endDate: string }): Promise<ApiResponse<ReportsDashboardData>>;
}

export interface IMaintenanceService {
  list(filters?: MaintenanceFilters): Promise<ApiResponse<MaintenanceRecord[]>>;
  getById(id: string): Promise<ApiResponse<MaintenanceRecord>>;
  create(data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MaintenanceRecord>>;
  updateStatus(id: string, status: string): Promise<ApiResponse<MaintenanceRecord>>;
}

export interface INotificationService {
  list(): Promise<ApiResponse<Notification[]>>;
  markAsRead(id: string): Promise<ApiResponse<{ id: string }>>;
  markAllAsRead(): Promise<ApiResponse<{ count: number }>>;
}
