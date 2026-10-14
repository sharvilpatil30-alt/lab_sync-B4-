import { IResourceService, AvailableResourceItem } from '../types';
import { Resource, ResourceFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

export function mapBackendEquipmentToResource(raw: any): Resource {
  const isAvailable = raw.state === 'AVAILABLE' || raw.available === true;
  const isMaint = raw.state === 'MAINTENANCE';

  return {
    id: raw.id || raw.resourceId,
    resourceId: raw.serial_no || raw.label || raw.id,
    name: raw.name || (raw.label ? `Workstation ${raw.label}` : 'Computer Workstation'),
    type: raw.type || 'Workstation',
    description: raw.description || `Lab Workstation (${raw.serial_no || 'Configured'})`,
    lab: raw.lab_id || raw.labId || raw.lab_code || '',
    operationalStatus: isMaint ? 'maintenance' : isAvailable ? 'available' : 'in-use',
    maintenanceStatus: raw.maintenanceStatus || (isMaint ? 'Under Maintenance' : undefined),
    availability: isAvailable,
    lastUpdated: raw.updated_at || new Date().toISOString(),
  };
}

export class ApiResourceService implements IResourceService {
  async list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>> {
    const response = await apiClient.get('/resources', { params: filters });
    const rawList = response.data?.data;
    if (!Array.isArray(rawList)) throw new Error('Invalid resource response from campus server');

    return {
      success: true,
      message: 'Resources retrieved successfully',
      data: rawList.map(mapBackendEquipmentToResource),
    };
  }

  async getById(resourceId: string): Promise<ApiResponse<Resource>> {
    const res = await apiClient.get(`/resources/${resourceId}`);
    const raw = res.data?.data || res.data;
    return { success: true, message: 'Resource found', data: mapBackendEquipmentToResource(raw) };
  }

  // Canonical endpoint: GET /api/v1/resources/available?labId=...&startTime=...&endTime=...
  async getAvailable(
    labId: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<{ resources: AvailableResourceItem[] }>> {
    try {
      const res = await apiClient.get('/resources/available', {
        params: { labId, startTime, endTime },
      });
      const data = res.data?.data || res.data;
      const list = data?.resources || (Array.isArray(data) ? data : []);
      return {
        success: true,
        message: 'Available resources retrieved',
        data: {
          resources: list.map((r: any) => ({
            resourceId: String(r.id || r.resourceId || ''),
            labId: r.labId || labId,
            name: r.name || (r.label ? `Seat ${r.label}` : 'Workstation'),
            available: Boolean(r.id || r.resourceId) && r.available === true,
            preemptable: r.preemptable === true,
          })),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async create(data: Omit<Resource, 'id' | 'createdAt'>): Promise<ApiResponse<Resource>> {
    const res = await apiClient.post('/resources', data);
    return { success: true, message: 'Resource created', data: mapBackendEquipmentToResource(res.data?.data || res.data) };
  }

  async update(resourceId: string, data: Partial<Resource>): Promise<ApiResponse<Resource>> {
    const res = await apiClient.patch(`/resources/${resourceId}`, data);
    return { success: true, message: 'Resource updated', data: mapBackendEquipmentToResource(res.data?.data || res.data) };
  }

  async updateStatus(resourceId: string, operationalStatus: string, maintenanceStatus?: string): Promise<ApiResponse<Resource>> {
    const res = await apiClient.patch(`/resources/${resourceId}`, {
      operationalStatus,
      maintenanceStatus,
      availability: operationalStatus === 'available',
    });
    return { success: true, message: 'Resource status updated', data: mapBackendEquipmentToResource(res.data?.data || res.data) };
  }

  async delete(resourceId: string): Promise<ApiResponse<{ id: string }>> {
    const res = await apiClient.delete(`/resources/${resourceId}`);
    return res.data;
  }
}
