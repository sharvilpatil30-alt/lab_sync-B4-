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
  register(data: { name: string; email: string; password: string; role?: string; department?: string }): Promise<ApiResponse<{ token: string; user: User }>>;
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

export interface AvailableResourceItem {
  resourceId: string;
  labId: string;
  name: string;
  available: boolean;
}

export interface IResourceService {
  list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>>;
  getById(resourceId: string): Promise<ApiResponse<Resource>>;
  getAvailable(labId: string, startTime: string, endTime: string): Promise<ApiResponse<{ resources: AvailableResourceItem[] }>>;
  create(data: Omit<Resource, 'id' | 'createdAt'>): Promise<ApiResponse<Resource>>;
  update(resourceId: string, data: Partial<Resource>): Promise<ApiResponse<Resource>>;
  updateStatus(resourceId: string, operationalStatus: string, maintenanceStatus?: string): Promise<ApiResponse<Resource>>;
  delete(resourceId: string): Promise<ApiResponse<{ id: string }>>;
}

export interface CreateBookingPayload {
  resourceId: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  labId?: string;
  date?: string;
  purpose?: string;
  seatNumber?: number;
}

export interface IBookingService {
  listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>>;
  listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>>;
  getById(bookingId: string): Promise<ApiResponse<Booking>>;
  create(data: CreateBookingPayload | any): Promise<ApiResponse<Booking & { schedulingResult?: SchedulingResult }>>;
  cancel(bookingId: string, cancellationReason?: string): Promise<ApiResponse<Booking>>;
  updateStatus(bookingId: string, status: BookingStatus, reason?: string): Promise<ApiResponse<Booking>>;
}

export interface RouteNodeItem {
  nodeId: string;
  name: string;
  type: string;
}

export interface ComputedRouteResult {
  path: string[];
  distance: number;
  distanceUnit: string;
  algorithm: string;
}

export interface IRoutingService {
  getNodes(): Promise<ApiResponse<{ nodes: RouteNodeItem[] }>>;
  computeRoute(data: { fromNodeId: string; toNodeId: string; algorithm?: string }): Promise<ApiResponse<ComputedRouteResult>>;
  getAlgorithms(): Promise<ApiResponse<{ algorithms: string[] }>>;
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
  setMaintenance(labId: string, enabled: boolean, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>>;
}

export interface INotificationService {
  list(): Promise<ApiResponse<Notification[]>>;
  markAsRead(id: string): Promise<ApiResponse<{ id: string }>>;
  markAllAsRead(): Promise<ApiResponse<{ count: number }>>;
}
