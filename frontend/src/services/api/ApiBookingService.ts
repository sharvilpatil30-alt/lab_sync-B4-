import { IBookingService, CreateBookingPayload } from '../types';
import { Booking, BookingStatus, BookingFilters, ApiResponse, SchedulingResult } from '../../types';
import { apiClient } from './client';

export function mapBackendBookingToFrontend(raw: any): Booking {
  const id = raw.bookingId || raw.id || 'booking';
  const startIso = raw.startTime || raw.start_at || '';
  const endIso = raw.endTime || raw.end_at || '';
  const dateStr = startIso ? new Date(startIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
  const time = (value: string) => value ? new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '';

  const canonicalStatus: BookingStatus = String(raw.state || raw.status || 'REQUESTED').toUpperCase();

  const labReference = raw.lab ?? raw.lab_code ?? raw.labId ?? raw.lab_id ?? '';
  // Keep stable identifiers for detail links and booking-to-route lookup.

  return {
    id,
    bookingId: id,
    user: raw.user_id || raw.user || 'CurrentUser',
    userRole: raw.priority === 0 ? 'admin' : raw.priority === 1 ? 'faculty' : 'student',
    lab: labReference,
    date: dateStr,
    startTime: time(startIso),
    endTime: time(endIso),
    purpose: raw.purpose || 'Purpose not recorded',
    requiredResources: raw.resource_id ? [raw.resource_id] : (raw.resourceId ? [raw.resourceId] : []),
    allocatedResources: raw.resource_id ? [raw.resource_id] : (raw.resourceId ? [raw.resourceId] : []),
    status: canonicalStatus,
    cancellationReason: raw.cancellation_reason || raw.cancellationReason || raw.reason,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
  };
}

export class ApiBookingService implements IBookingService {
  async listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    const res = await apiClient.get('/bookings/my', { params: filters });
    const rawList = res.data?.data;
    if (!Array.isArray(rawList)) throw new Error('Invalid booking response from campus server');

    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: rawList.map(mapBackendBookingToFrontend),
    };
  }

  async listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    try {
      const res = await apiClient.get('/bookings', { params: filters });
      const payload = res.data?.data || res.data;
      const list = Array.isArray(payload) ? payload : (payload?.bookings || []);
      return {
        success: true,
        message: 'All campus bookings retrieved',
        data: list.map(mapBackendBookingToFrontend),
      };
    } catch {
      return this.listOwn(filters);
    }
  }

  async getById(bookingId: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.get(`/bookings/${bookingId}`);
    const raw = res.data?.data || res.data;
    return {
      success: true,
      message: 'Booking details retrieved',
      data: mapBackendBookingToFrontend(raw),
    };
  }

  // Canonical endpoint: POST /api/v1/bookings
  // Request body: { "resourceId": "uuid", "startTime": "ISO", "endTime": "ISO" }
  async create(data: CreateBookingPayload | any): Promise<ApiResponse<Booking & { schedulingResult?: SchedulingResult }>> {
    // Construct ISO strings if date/time are separated
    let startTimeIso = data.startTime;
    let endTimeIso = data.endTime;

    if (data.date && data.startTime && !data.startTime.includes('T')) {
      startTimeIso = new Date(`${data.date}T${data.startTime}:00+05:30`).toISOString();
    }
    if (data.date && data.endTime && !data.endTime.includes('T')) {
      endTimeIso = new Date(`${data.date}T${data.endTime}:00+05:30`).toISOString();
    }

    const payload = {
      resourceId: data.resourceId || (data.requiredResources && data.requiredResources[0]),
      startTime: startTimeIso,
      endTime: endTimeIso,
      purpose: data.purpose,
      labId: data.labId,
      seatNumber: data.seatNumber,
      idempotencyKey: data.idempotencyKey,
    };

    const res = await apiClient.post('/bookings', payload);
    const raw = res.data?.data || res.data;
    return {
      success: true,
      message: 'Booking confirmed successfully',
      data: mapBackendBookingToFrontend(raw),
    };
  }

  // Canonical endpoint: POST /api/v1/bookings/:id/cancel
  async cancel(bookingId: string, cancellationReason?: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason: cancellationReason });
    const raw = res.data?.data;

    return {
      success: true,
      message: 'Booking successfully cancelled',
      data: mapBackendBookingToFrontend(raw),
    };
  }

  async updateStatus(bookingId: string, status: BookingStatus, reason?: string): Promise<ApiResponse<Booking>> {
    const res = await apiClient.patch(`/bookings/${bookingId}/status`, { status, reason });
    const raw = res.data?.data || res.data;
    return {
      success: true,
      message: 'Booking status updated',
      data: mapBackendBookingToFrontend(raw),
    };
  }
}
