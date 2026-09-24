import { IBookingService } from '../types';
import { Booking, BookingStatus, BookingFilters, ApiResponse, SchedulingResult } from '../../types';
import { apiClient } from './client';

export class ApiBookingService implements IBookingService {
  async listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    const res = await apiClient.get('/bookings', { params: filters });
    return res.data;
  }

  async listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    const res = await apiClient.get('/admin/bookings', { params: filters });
    return res.data;
  }

  async getById(bookingId: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.get(`/bookings/${bookingId}`);
    return res.data;
  }

  async create(data: {
    labId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    requiredResources?: string[];
  }): Promise<ApiResponse<Booking & { schedulingResult?: SchedulingResult }>> {
    const res = await apiClient.post('/bookings', data);
    return res.data;
  }

  async cancel(bookingId: string, cancellationReason?: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.patch(`/bookings/${bookingId}/cancel`, { cancellationReason });
    return res.data;
  }

  async updateStatus(bookingId: string, status: BookingStatus, reason?: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.patch(`/bookings/${bookingId}/status`, { status, reason });
    return res.data;
  }
}
