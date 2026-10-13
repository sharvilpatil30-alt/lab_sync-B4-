import { IReportsService } from '../types';
import { ReportsDashboardData, ApiResponse } from '../../types';

export class MockReportsService implements IReportsService {
  async getDashboardData(): Promise<ApiResponse<ReportsDashboardData>> {
    await new Promise((r) => setTimeout(r, 250));

    const mockReport: ReportsDashboardData = {
      labUtilization: [
        { labId: 'lab_cse_01', labName: 'Alan Turing Systems Lab', totalHoursBooked: 74, utilizationRate: 82, bookingCount: 28 },
        { labId: 'lab_ai_02', labName: 'Deep Learning & Robotics Hub', totalHoursBooked: 88, utilizationRate: 94, bookingCount: 34 },
        { labId: 'lab_iot_03', labName: 'IoT & Prototyping Bench', totalHoursBooked: 52, utilizationRate: 65, bookingCount: 19 },
        { labId: 'lab_vr_04', labName: 'VR & Spatial Computing', totalHoursBooked: 31, utilizationRate: 42, bookingCount: 11 },
        { labId: 'lab_cyber_05', labName: 'Cybersecurity Range', totalHoursBooked: 60, utilizationRate: 75, bookingCount: 22 },
        { labId: 'lab_fab_06', labName: 'Additive FabLab', totalHoursBooked: 69, utilizationRate: 78, bookingCount: 25 },
      ],
      resourceUtilization: [
        { resourceId: 'res_gpu_01', resourceName: 'NVIDIA H100 80GB', type: 'Compute', totalHoursUsed: 92, utilizationRate: 96 },
        { resourceId: 'res_gpu_02', resourceName: 'NVIDIA A100 40GB', type: 'Compute', totalHoursUsed: 78, utilizationRate: 85 },
        { resourceId: 'res_3d_01', resourceName: 'Bambu Lab X1-Carbon', type: 'Prototyping', totalHoursUsed: 54, utilizationRate: 68 },
        { resourceId: 'res_cnc_01', resourceName: 'Haas 3-Axis Mill', type: 'Fabrication', totalHoursUsed: 46, utilizationRate: 58 },
        { resourceId: 'res_robot_01', resourceName: 'UR5e Robot Arm', type: 'Robotics', totalHoursUsed: 71, utilizationRate: 79 },
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
