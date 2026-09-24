import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  labService,
  resourceService,
  bookingService,
  routingService,
  monitoringService,
  reportsService,
  maintenanceService,
  notificationService,
  userService,
} from '../services';
import {
  LabFilters,
  BookingFilters,
  ResourceFilters,
  MaintenanceFilters,
  Lab,
  Resource,
  User,
  BookingStatus,
} from '../types';

// ============ USER / AUTH HOOKS ============
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await userService.getProfile();
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}

export function useUserProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await userService.getProfile();
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await userService.updateProfile(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  return {
    ...query,
    updateProfile,
  };
}

// ============ LABS HOOKS ============
export function useLabs(filters?: LabFilters) {
  return useQuery({
    queryKey: ['labs', filters],
    queryFn: async () => {
      const res = await labService.list(filters);
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // 2 mins
  });
}

export function useLab(labId?: string) {
  return useQuery({
    queryKey: ['lab', labId],
    queryFn: async () => {
      if (!labId) throw new Error('Lab ID is required');
      const res = await labService.getById(labId);
      return res.data;
    },
    enabled: !!labId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLabAvailability(labId?: string, date?: string) {
  return useQuery({
    queryKey: ['lab-availability', labId, date],
    queryFn: async () => {
      if (!labId) throw new Error('Lab ID is required');
      const res = await labService.getById(labId);
      return {
        lab: res.data,
        isAvailable: res.data.operationalStatus === 'available',
        operationalStatus: res.data.operationalStatus,
      };
    },
    enabled: !!labId,
    staleTime: 1000 * 30, // 30s
  });
}

export function useCreateLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>) => {
      const res = await labService.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

export function useUpdateLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ labId, data }: { labId: string; data: Partial<Lab> }) => {
      const res = await labService.update(labId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['lab', variables.labId] });
      queryClient.invalidateQueries({ queryKey: ['lab-availability'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

// ============ RESOURCES HOOKS ============
export function useResources(filters?: ResourceFilters) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const res = await resourceService.list(filters);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useResource(resourceId?: string) {
  return useQuery({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      if (!resourceId) throw new Error('Resource ID is required');
      const res = await resourceService.getById(resourceId);
      return res.data;
    },
    enabled: !!resourceId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Resource, 'id' | 'createdAt'>) => {
      const res = await resourceService.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resourceId,
      data,
    }: {
      resourceId: string;
      data: Partial<Resource>;
    }) => {
      const res = await resourceService.update(resourceId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

export function useUpdateResourceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resourceId,
      operationalStatus,
      maintenanceStatus,
    }: {
      resourceId: string;
      operationalStatus: string;
      maintenanceStatus?: string;
    }) => {
      const res = await resourceService.updateStatus(resourceId, operationalStatus, maintenanceStatus);
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidation chain: resource -> monitoring -> reports -> labs
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
      queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
    },
  });
}

// ============ BOOKINGS HOOKS ============
export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await bookingService.listOwn(filters);
      return res.data;
    },
    staleTime: 1000 * 20, // 20s
  });
}

export function useMyBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['my-bookings', filters],
    queryFn: async () => {
      const res = await bookingService.listOwn(filters);
      return res.data;
    },
    staleTime: 1000 * 20,
  });
}

export function useAllBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['all-bookings', filters],
    queryFn: async () => {
      const res = await bookingService.listAll(filters);
      return res.data;
    },
    staleTime: 1000 * 20,
  });
}

export function useBooking(bookingId?: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      const res = await bookingService.getById(bookingId);
      return res.data;
    },
    enabled: !!bookingId,
    staleTime: 1000 * 15,
  });
}

export function useBookingStatus(bookingId?: string) {
  return useQuery({
    queryKey: ['booking-status', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      const res = await bookingService.getById(bookingId);
      return {
        status: res.data.status,
        queuePosition: res.data.queuePosition,
        estimatedStart: res.data.estimatedStart,
      };
    },
    enabled: !!bookingId,
    staleTime: 1000 * 10,
  });
}

export function useQueueStatus(bookingId?: string) {
  return useQuery({
    queryKey: ['queue-status', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      const res = await bookingService.getById(bookingId);
      return {
        queuePosition: res.data.queuePosition,
        requestsAhead: res.data.requestsAhead,
        estimatedStart: res.data.estimatedStart,
        schedulingMetadata: res.data.schedulingMetadata,
        status: res.data.status,
      };
    },
    enabled: !!bookingId,
    staleTime: 1000 * 10,
  });
}

export function useAllocatedResources(bookingId?: string) {
  return useQuery({
    queryKey: ['allocated-resources', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      const res = await bookingService.getById(bookingId);
      return res.data.allocatedResources || [];
    },
    enabled: !!bookingId,
    staleTime: 1000 * 20,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      labId: string;
      date: string;
      startTime: string;
      endTime: string;
      purpose: string;
      requiredResources?: string[];
    }) => {
      const res = await bookingService.create(data);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate bookings -> dashboard -> lab availability
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['lab-availability'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
      queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const res = await bookingService.cancel(bookingId, reason);
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate booking -> my bookings -> dashboard
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['queue-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['lab-availability'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      reason,
    }: {
      bookingId: string;
      status: BookingStatus;
      reason?: string;
    }) => {
      const res = await bookingService.updateStatus(bookingId, status, reason);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['queue-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
      queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
    },
  });
}

// ============ ROUTING HOOKS ============
export function useCampusRoute(bookingId?: string) {
  return useQuery({
    queryKey: ['campus-route', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      const res = await routingService.getRoute(bookingId);
      return res.data;
    },
    enabled: !!bookingId,
    staleTime: 1000 * 60 * 5,
  });
}

export const useRoute = useCampusRoute;

// ============ LIVE MONITORING HOOKS ============
export function useLiveMonitoring(refetchInterval: number | false = 20000) {
  return useQuery({
    queryKey: ['monitoring-overview'],
    queryFn: async () => {
      const res = await monitoringService.getOverview();
      return res.data;
    },
    refetchInterval,
  });
}

export const useMonitoring = useLiveMonitoring;

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await monitoringService.getAlerts();
      return res.data;
    },
    staleTime: 1000 * 15,
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const res = await monitoringService.resolveAlert(alertId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useSystemHealth(refetchInterval: number | false = 30000) {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await monitoringService.checkHealth();
      return res.data;
    },
    refetchInterval,
    retry: 1,
  });
}

// ============ REPORTS HOOKS ============
export function useReportsDashboard(dateRange?: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['reports-dashboard', dateRange],
    queryFn: async () => {
      const res = await reportsService.getDashboardData(dateRange);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export const useReports = useReportsDashboard;

// ============ MAINTENANCE HOOKS ============
export function useMaintenance(filters?: MaintenanceFilters) {
  return useQuery({
    queryKey: ['maintenance', filters],
    queryFn: async () => {
      const res = await maintenanceService.list(filters);
      return res.data;
    },
    staleTime: 1000 * 30,
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await maintenanceService.updateStatus(id, status);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await maintenanceService.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-overview'] });
    },
  });
}

// ============ NOTIFICATIONS HOOKS ============
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationService.list();
      return res.data;
    },
    staleTime: 1000 * 15,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      return await notificationService.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return await notificationService.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    ...query,
    markAsRead,
    markAllAsRead,
  };
}
