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
    lab: raw.lab_name || raw.lab_code || raw.labId || 'General Lab',
    operationalStatus: isMaint ? 'maintenance' : isAvailable ? 'available' : 'in-use',
    maintenanceStatus: raw.maintenanceStatus || (isMaint ? 'Under Maintenance' : undefined),
    availability: isAvailable,
    lastUpdated: raw.updated_at || new Date().toISOString(),
  };
}

export class ApiResourceService implements IResourceService {
  async list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>> {
    let rawList: any[] = [];

    try {
      // 1. Try canonical /inventory/equipment (Team C PostgreSQL)
      const res = await apiClient.get('/inventory/equipment', { params: filters });
      const payload = res.data?.data || res.data;
      if (Array.isArray(payload)) {
        rawList = payload;
      }
    } catch {
      // 2. Fall back to /resources
      try {
        const fallbackRes = await apiClient.get('/resources', { params: filters });
        const payload = fallbackRes.data?.data || fallbackRes.data;
        if (Array.isArray(payload)) {
          rawList = payload;
        }
      } catch {
        rawList = [];
      }
    }

    return {
      success: true,
      message: 'Resources retrieved successfully',
      data: rawList.map(mapBackendEquipmentToResource),
    };
  }

  async getById(resourceId: string): Promise<ApiResponse<Resource>> {
    try {
      const res = await apiClient.get(`/inventory/equipment/${resourceId}`);
      const raw = res.data?.data || res.data;
      if (raw) return { success: true, message: 'Resource found', data: mapBackendEquipmentToResource(raw) };
    } catch {
      // fallback
    }

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
            resourceId: r.resourceId || r.id,
            labId: r.labId || labId,
            name: r.name || (r.label ? `Seat ${r.label}` : 'Workstation'),
            available: r.available !== false,
          })),
        },
      };
    } catch (err: any) {
      // If endpoint is not yet mounted on backend, check /inventory/equipment for that lab
      try {
        const eqRes = await apiClient.get('/inventory/equipment');
        const eqList = eqRes.data?.data || eqRes.data;
        if (Array.isArray(eqList) && eqList.length > 0) {
          const labEq = eqList.filter((e: any) => e.lab_code === labId || e.lab_name === labId || e.id === labId);
          return {
            success: true,
            message: 'Equipment retrieved',
            data: {
              resources: labEq.map((e: any) => ({
                resourceId: e.id,
                labId: e.lab_code || labId,
                name: e.label ? `Seat ${e.label}` : 'Workstation',
                available: e.state === 'AVAILABLE',
              })),
            },
          };
        }
      } catch {
        // Return empty resources honestly
      }
      return {
        success: true,
        message: 'No available resources returned by backend',
        data: { resources: [] },
      };
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
