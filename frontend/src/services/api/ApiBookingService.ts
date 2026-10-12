import { IBookingService, CreateBookingPayload } from '../types';
import { Booking, BookingStatus, BookingFilters, ApiResponse, SchedulingResult } from '../../types';
import { apiClient } from './client';

export function mapBackendBookingToFrontend(raw: any): Booking {
  const id = raw.bookingId || raw.id || 'booking';
  const startIso = raw.startTime || raw.start_at || new Date().toISOString();
  const endIso = raw.endTime || raw.end_at || new Date().toISOString();
  const dateStr = startIso.split('T')[0];

  const rawState = (raw.state || raw.status || 'CONFIRMED').toUpperCase();
  const canonicalStatus: BookingStatus =
    rawState === 'CANCELLED' ? 'CANCELLED' :
    rawState === 'COMPLETED' ? 'COMPLETED' :
    rawState === 'REJECTED'  ? 'REJECTED'  :
    rawState === 'WAITLISTED'? 'WAITLISTED':
    rawState === 'ACTIVE'    ? 'ACTIVE'    :
    rawState === 'QUEUED'    ? 'QUEUED'    :
    rawState === 'LEASED'    ? 'LEASED'    : 'CONFIRMED';

  const labLabel = raw.labName || raw.lab_name || raw.lab_code || raw.labId || raw.lab_id || raw.lab || 'Laboratory Facility';

  return {
    id,
    bookingId: id,
    user: raw.user_id || raw.user || 'CurrentUser',
    userRole: 'student',
    lab: labLabel,
    date: dateStr,
    startTime: startIso.includes('T') ? startIso.split('T')[1].slice(0, 5) : '09:00',
    endTime: endIso.includes('T') ? endIso.split('T')[1].slice(0, 5) : '10:00',
    purpose: raw.purpose || 'Academic laboratory coursework and computing session',
    requiredResources: raw.resource_id ? [raw.resource_id] : (raw.resourceId ? [raw.resourceId] : []),
    allocatedResources: raw.resource_id ? [raw.resource_id] : (raw.resourceId ? [raw.resourceId] : []),
    status: canonicalStatus,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
  };
}

export class ApiBookingService implements IBookingService {
  async listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    let rawList: any[] = [];

    try {
      // 1. Try canonical /bookings/my
      const res = await apiClient.get('/bookings/my', { params: filters });
      const payload = res.data?.data || res.data;
      if (Array.isArray(payload)) {
        rawList = payload;
      } else if (payload?.bookings && Array.isArray(payload.bookings)) {
        rawList = payload.bookings;
      }
    } catch {
      // 2. Fall back to /bookings
      try {
        const fallbackRes = await apiClient.get('/bookings', { params: filters });
        const payload = fallbackRes.data?.data || fallbackRes.data;
        if (Array.isArray(payload)) {
          rawList = payload;
        } else if (payload?.bookings && Array.isArray(payload.bookings)) {
          rawList = payload.bookings;
        }
      } catch {
        rawList = [];
      }
    }

    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: rawList.map(mapBackendBookingToFrontend),
    };
  }

  async listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    try {
      const res = await apiClient.get('/admin/bookings', { params: filters });
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
      startTimeIso = new Date(`${data.date}T${data.startTime}:00`).toISOString();
    }
    if (data.date && data.endTime && !data.endTime.includes('T')) {
      endTimeIso = new Date(`${data.date}T${data.endTime}:00`).toISOString();
    }

    const payload = {
      resourceId: data.resourceId || (data.requiredResources && data.requiredResources[0]),
      startTime: startTimeIso,
      endTime: endTimeIso,
      purpose: data.purpose,
      labId: data.labId,
      seatNumber: data.seatNumber,
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
    let raw: any;
    try {
      // 1. Try canonical POST /bookings/:id/cancel
      const res = await apiClient.post(`/bookings/${bookingId}/cancel`, {
        reason: cancellationReason,
      });
      raw = res.data?.data || res.data;
    } catch {
      // 2. Try PATCH fallback
      const fallbackRes = await apiClient.patch(`/bookings/${bookingId}/cancel`, {
        cancellationReason,
      });
      raw = fallbackRes.data?.data || fallbackRes.data;
    }

    return {
      success: true,
      message: 'Booking successfully cancelled',
      data: mapBackendBookingToFrontend(raw || { id: bookingId, state: 'CANCELLED' }),
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
