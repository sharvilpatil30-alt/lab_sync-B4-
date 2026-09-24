import { IReportsService } from '../types';
import { ReportsDashboardData, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiReportsService implements IReportsService {
  async getDashboardData(dateRange?: { startDate: string; endDate: string }): Promise<ApiResponse<ReportsDashboardData>> {
    const res = await apiClient.get('/reports/dashboard', { params: dateRange });
    return res.data;
  }
}
