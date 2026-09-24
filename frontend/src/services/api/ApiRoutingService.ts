import { IRoutingService } from '../types';
import { RouteResult, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiRoutingService implements IRoutingService {
  async getRoute(bookingId: string): Promise<ApiResponse<RouteResult>> {
    const res = await apiClient.get(`/routes/${bookingId}`);
    return res.data;
  }
}
