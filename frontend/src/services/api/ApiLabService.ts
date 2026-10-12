import { ILabService } from '../types';
import { Lab, LabFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

// Map backend SQL row from /inventory/labs or /labs to frontend Lab model
export function mapBackendLabToFrontend(raw: any): Lab {
  const labCode = raw.lab_code || raw.labId || raw.id || 'LAB';
  const labName = raw.name || raw.lab_name || raw.labName || `Lab ${labCode}`;
  const capacity = Number(raw.capacity || raw.total_current_qty || raw.total_original_qty || 30);
  const rawStatus = String(raw.operationalStatus || raw.status || 'available').toLowerCase();
  const operationalStatus: Lab['operationalStatus'] =
    rawStatus === 'maintenance' ? 'maintenance' :
    rawStatus === 'occupied' ? 'occupied' :
    rawStatus === 'offline' ? 'offline' : 'available';

  return {
    id: raw.id || raw._id || labCode,
    labId: labCode,
    name: labName,
    description: raw.description || `Department of Computer Science & Engineering • Lab ${labCode} (${capacity} Workstations)`,
    location: raw.location || `Wing D, Room ${labCode}`,
    building: raw.building || 'RIT Academic Complex (Engineering Wing)',
    floor: raw.floor !== undefined ? raw.floor : 1,
    capacity,
    operationalStatus,
    maintenanceStatus: raw.maintenanceStatus || raw.maintenance_reason || '',
    availableResources: raw.availableResources || [],
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
}

export class ApiLabService implements ILabService {
  async list(filters?: LabFilters): Promise<ApiResponse<Lab[]>> {
    let rawList: any[] = [];

    try {
      // 1. Query canonical /labs endpoint with live operational statuses
      const res = await apiClient.get('/labs', { params: filters });
      const payload = res.data?.data || res.data;
      if (Array.isArray(payload)) {
        rawList = payload;
      }
    } catch {
      // 2. Fall back to /inventory/labs if /labs is unavailable
      try {
        const fallbackRes = await apiClient.get('/inventory/labs', { params: filters });
        const payload = fallbackRes.data?.data || fallbackRes.data;
        if (Array.isArray(payload)) {
          rawList = payload;
        }
      } catch (err: any) {
        throw err;
      }
    }

    const mappedLabs = rawList.map(mapBackendLabToFrontend);

    // Apply client-side filter if backend didn't filter
    let filtered = mappedLabs;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.labId.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    return {
      success: true,
      message: 'Labs retrieved successfully',
      data: filtered,
    };
  }

  async getById(labId: string): Promise<ApiResponse<Lab>> {
    // 1. Try direct /inventory/labs/:id or /labs/:id
    try {
      const res = await apiClient.get(`/inventory/labs/${labId}`);
      const raw = res.data?.data || res.data;
      if (raw) return { success: true, message: 'Lab found', data: mapBackendLabToFrontend(raw) };
    } catch {
      // fallback
    }

    try {
      const res = await apiClient.get(`/labs/${labId}`);
      const raw = res.data?.data || res.data;
      if (raw) return { success: true, message: 'Lab found', data: mapBackendLabToFrontend(raw) };
    } catch {
      // fallback to list query
    }

    // 2. Look up from full list
    const listRes = await this.list();
    const match = listRes.data.find(
      (l) =>
        l.id === labId ||
        l.labId.toLowerCase() === labId.toLowerCase()
    );

    if (match) {
      return { success: true, message: 'Lab found', data: match };
    }

    throw new Error(`Laboratory facility '${labId}' not found in campus database.`);
  }

  async create(data: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lab>> {
    const res = await apiClient.post('/labs', data);
    const raw = res.data?.data || res.data;
    return { success: true, message: 'Lab created', data: mapBackendLabToFrontend(raw) };
  }

  async update(labId: string, data: Partial<Lab>): Promise<ApiResponse<Lab>> {
    const res = await apiClient.patch(`/labs/${labId}`, data);
    const raw = res.data?.data || res.data;
    return { success: true, message: 'Lab updated', data: mapBackendLabToFrontend(raw) };
  }

  async delete(labId: string): Promise<ApiResponse<{ id: string }>> {
    const res = await apiClient.delete(`/labs/${labId}`);
    return res.data;
  }
}
