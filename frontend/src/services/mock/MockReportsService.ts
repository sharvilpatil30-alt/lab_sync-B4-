import { IReportsService } from '../types';
import { ReportsDashboardData, ApiResponse } from '../../types';

export class MockReportsService implements IReportsService {
  async getDashboardData(): Promise<ApiResponse<ReportsDashboardData>> {
    await new Promise((r) => setTimeout(r, 250));

    const mockReport: ReportsDashboardData = {
      labUtilization: [
        { labId: 'lab_d01', labName: 'Linux Laboratory (D-01)', totalHoursBooked: 78, utilizationRate: 85, bookingCount: 29 },
        { labId: 'lab_d02', labName: 'Database Laboratory (D-02)', totalHoursBooked: 84, utilizationRate: 91, bookingCount: 32 },
        { labId: 'lab_d03', labName: 'Project Laboratory (D-03)', totalHoursBooked: 72, utilizationRate: 78, bookingCount: 27 },
        { labId: 'lab_d07', labName: 'Network Laboratory (D-07)', totalHoursBooked: 80, utilizationRate: 88, bookingCount: 31 },
        { labId: 'lab_d08', labName: 'AI & ML Laboratory (D-08)', totalHoursBooked: 92, utilizationRate: 96, bookingCount: 36 },
        { labId: 'lab_d09', labName: 'Apple Education Center (D-09)', totalHoursBooked: 95, utilizationRate: 98, bookingCount: 38 },
      ],
      resourceUtilization: [
        { resourceId: 'res_pc_d09_02', resourceName: 'OptiPlex 7020 i7-14700 vPro', type: 'Workstation / PC', totalHoursUsed: 94, utilizationRate: 98 },
        { resourceId: 'res_pc_d08_04', resourceName: 'OptiPlex 7000 i7-12700 vPro', type: 'Workstation / PC', totalHoursUsed: 90, utilizationRate: 94 },
        { resourceId: 'res_disp_d01', resourceName: 'Samsung Flip 65" Digital Board', type: 'Interactive Display', totalHoursUsed: 62, utilizationRate: 72 },
        { resourceId: 'res_pc_d11_01', resourceName: 'Apple Mac All-in-One 21.5"', type: 'Workstation / Mac', totalHoursUsed: 76, utilizationRate: 82 },
        { resourceId: 'res_proj_d08', resourceName: 'Epson EB-E01 3LCD Projector', type: 'Projector', totalHoursUsed: 58, utilizationRate: 65 },
      ],
      bookingTrends: [
        { date: 'Sep 17', confirmed: 12, queued: 3, completed: 11, cancelled: 1 },
        { date: 'Sep 18', confirmed: 15, queued: 4, completed: 14, cancelled: 2 },
        { date: 'Sep 19', confirmed: 18, queued: 6, completed: 16, cancelled: 1 },
        { date: 'Sep 20', confirmed: 14, queued: 2, completed: 13, cancelled: 0 },
        { date: 'Sep 21', confirmed: 16, queued: 5, completed: 15, cancelled: 2 },
        { date: 'Sep 22', confirmed: 22, queued: 7, completed: 20, cancelled: 1 },
        { date: 'Sep 23', confirmed: 19, queued: 4, completed: 17, cancelled: 1 },
      ],
      summary: {
        totalBookings: 148,
        averageUtilization: 77.4,
        peakHour: '14:00 - 16:00',
        queueResolutionRate: 91.2,
      },
    };

    return {
      success: true,
      message: 'Dashboard reports data retrieved',
      data: mockReport,
    };
  }
}
