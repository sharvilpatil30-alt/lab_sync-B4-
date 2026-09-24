export interface LabUtilizationReport {
  labId: string;
  labName: string;
  totalHoursBooked: number;
  utilizationRate: number; // percentage 0-100
  bookingCount: number;
}

export interface ResourceUtilizationReport {
  resourceId: string;
  resourceName: string;
  type: string;
  totalHoursUsed: number;
  utilizationRate: number; // percentage 0-100
}

export interface BookingTrendsReport {
  date: string;
  confirmed: number;
  queued: number;
  completed: number;
  cancelled: number;
}

export interface ReportsDashboardData {
  labUtilization: LabUtilizationReport[];
  resourceUtilization: ResourceUtilizationReport[];
  bookingTrends: BookingTrendsReport[];
  summary: {
    totalBookings: number;
    averageUtilization: number;
    peakHour: string;
    queueResolutionRate: number;
  };
}
