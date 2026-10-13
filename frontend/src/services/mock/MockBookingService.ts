import { IBookingService } from '../types';
import { Booking, BookingFilters, ApiResponse, SchedulingResult, BookingStatus } from '../../types';
import { bookingsData } from '../../data/mock';

const BOOKINGS_KEY = 'smart_campus_mock_bookings';

function getStoredBookings(): Booking[] {
  const stored = localStorage.getItem(BOOKINGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookingsData));
  return bookingsData as unknown as Booking[];
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export class MockBookingService implements IBookingService {
  async listOwn(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    await new Promise((r) => setTimeout(r, 200));
    const all = getStoredBookings();
    const currentUserJson = localStorage.getItem('smart_campus_auth_user');
    const currentUserId = currentUserJson ? JSON.parse(currentUserJson).id : 'usr_student_01';

    let userBookings = all.filter((b) => {
      const bUser = typeof b.user === 'object' && b.user !== null ? (b.user as any).id : b.user;
      return bUser === currentUserId;
    });

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        userBookings = userBookings.filter((b) => b.status === filters.status);
      }
      if (filters.date) {
        userBookings = userBookings.filter((b) => b.date === filters.date);
      }
      if (filters.labId) {
        userBookings = userBookings.filter((b) => {
          const labId = typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).id : b.lab;
          return labId === filters.labId;
        });
      }
    }

    return {
      success: true,
      message: 'User bookings retrieved',
      data: userBookings,
    };
  }

  async listAll(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    await new Promise((r) => setTimeout(r, 200));
    let all = getStoredBookings();

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        all = all.filter((b) => b.status === filters.status);
      }
      if (filters.date) {
        all = all.filter((b) => b.date === filters.date);
      }
      if (filters.labId) {
        all = all.filter((b) => {
          const labId = typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).id : b.lab;
          return labId === filters.labId;
        });
      }
      if (filters.userId) {
        all = all.filter((b) => {
          const bUser = typeof b.user === 'object' && b.user !== null ? (b.user as any).id : b.user;
          return bUser === filters.userId;
        });
      }
    }

    return {
      success: true,
      message: 'All bookings retrieved',
      data: all,
    };
  }

  async getById(bookingId: string): Promise<ApiResponse<Booking>> {
    await new Promise((r) => setTimeout(r, 150));
    const all = getStoredBookings();
    const booking = all.find((b) => b.id === bookingId || b.bookingId === bookingId);
    if (!booking) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Booking ${bookingId} not found` },
        },
      };
    }
    return {
      success: true,
      message: 'Booking details retrieved',
      data: booking,
    };
  }

  async create(data: {
    labId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    requiredResources?: string[];
  }): Promise<ApiResponse<Booking & { schedulingResult?: SchedulingResult }>> {
    await new Promise((r) => setTimeout(r, 350));
    const all = getStoredBookings();

    const currentUserJson = localStorage.getItem('smart_campus_auth_user');
    const user = currentUserJson ? JSON.parse(currentUserJson) : { id: 'usr_student_01', role: 'student' };

    // Deterministic scheduling evaluation: check slot overlap
    const conflict = all.find(
      (b) =>
        (b.lab === data.labId || (typeof b.lab === 'object' && (b.lab as any).id === data.labId)) &&
        b.date === data.date &&
        (b.status === 'CONFIRMED' || b.status === 'ACTIVE') &&
        !(data.endTime <= b.startTime || data.startTime >= b.endTime)
    );

    let status: BookingStatus = 'CONFIRMED';
    let queuePos = 0;
    let requestsAhead = 0;
    let estimatedStart: string | undefined = undefined;
    let cancellationReason: string | undefined = undefined;

    // Check if facility is offline or user explicitly triggers test conflict
    const labsJson = localStorage.getItem('smart_campus_mock_labs');
    if (labsJson) {
      try {
        const labs = JSON.parse(labsJson);
        const targetLab = labs.find((l: any) => l.id === data.labId || l.labId === data.labId);
        if (targetLab && targetLab.operationalStatus === 'offline') {
          status = 'REJECTED';
          cancellationReason = `Facility ${targetLab.name} is currently offline and unavailable for reservations.`;
        }
      } catch {
        // fallback
      }
    }

    if (data.purpose && data.purpose.toLowerCase().includes('reject')) {
      status = 'REJECTED';
      cancellationReason = 'Simulated academic scheduling conflict: laboratory capacity exceeded for the designated period.';
    } else if (conflict && status !== 'REJECTED') {
      status = 'QUEUED';
      queuePos = 1;
      requestsAhead = 1;
      estimatedStart = `${data.date}T${conflict.endTime}:00.000Z`;
    }

    const uniqueNum = Math.floor(1000 + Math.random() * 9000);
    const dateFormatted = data.date.replace(/-/g, '');
    const bookingId = `BK-${dateFormatted}-${uniqueNum}`;

    const newBooking: Booking = {
      id: `book_${Date.now()}`,
      bookingId,
      user: user.id,
      userRole: user.role,
      lab: data.labId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      requiredResources: data.requiredResources || [],
      allocatedResources: status === 'CONFIRMED' ? data.requiredResources || [] : [],
      status,
      queuePosition: queuePos,
      requestsAhead,
      estimatedStart,
      cancellationReason,
      schedulingMetadata: {
        algorithm: 'PriorityQueue-V2',
        evaluatedAt: new Date().toISOString(),
        conflictDetected: !!conflict,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    all.unshift(newBooking);
    saveBookings(all);

    const schedulingResult: SchedulingResult = {
      bookingId: newBooking.bookingId,
      status: newBooking.status,
      queuePosition: newBooking.queuePosition,
      requestsAhead: newBooking.requestsAhead,
      estimatedStart: newBooking.estimatedStart,
      allocatedResources: newBooking.allocatedResources,
      schedulingMetadata: newBooking.schedulingMetadata,
    };

    return {
      success: true,
      message: status === 'CONFIRMED' ? 'Booking successfully confirmed!' : 'Booking placed in queue due to high demand.',
      data: {
        ...newBooking,
        schedulingResult,
      },
    };
  }

  async cancel(bookingId: string, cancellationReason?: string): Promise<ApiResponse<Booking>> {
    await new Promise((r) => setTimeout(r, 200));
    const all = getStoredBookings();
    const index = all.findIndex((b) => b.id === bookingId || b.bookingId === bookingId);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Booking ${bookingId} not found` },
        },
      };
    }

    all[index].status = 'CANCELLED';
    all[index].cancellationReason = cancellationReason || 'Cancelled by user';
    all[index].updatedAt = new Date().toISOString();
    saveBookings(all);

    return {
      success: true,
      message: 'Booking cancelled successfully',
      data: all[index],
    };
  }

  async updateStatus(bookingId: string, status: BookingStatus, reason?: string): Promise<ApiResponse<Booking>> {
    await new Promise((r) => setTimeout(r, 200));
    const all = getStoredBookings();
    const index = all.findIndex((b) => b.id === bookingId || b.bookingId === bookingId);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Booking ${bookingId} not found` },
        },
      };
    }

    all[index].status = status;
    if (reason) {
      all[index].cancellationReason = reason;
    }
    all[index].updatedAt = new Date().toISOString();
    saveBookings(all);

    return {
      success: true,
      message: `Booking status transitioned to ${status}`,
      data: all[index],
    };
  }
}
