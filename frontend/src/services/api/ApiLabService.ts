import { ILabService } from '../types';
import { Lab, LabFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

// Map backend SQL row from /inventory/labs or /labs to frontend Lab model
export function mapBackendLabToFrontend(raw: any): Lab {
  const labCode = raw.lab_code || raw.labId || raw.id || 'LAB';
  const labName = raw.name || raw.lab_name || raw.labName || `Lab ${labCode}`;
  const capacity = Number(raw.capacity ?? raw.total_current_qty ?? raw.total_original_qty ?? 0);
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
    floor: raw.floor ?? (/^D-(10|11)$/i.test(labCode) ? 1 : /^D-\d{2}$/i.test(labCode) ? 0 : 'Unknown'),
    capacity,
    availableResourcesCount: Number(raw.availableResourcesCount ?? 0),
    operationalStatus,
    maintenanceStatus: raw.maintenanceStatus || raw.maintenance_reason || '',
    availableResources: raw.availableResources || [],
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
}

export class ApiLabService implements ILabService {
  async list(filters?: LabFilters): Promise<ApiResponse<Lab[]>> {
    const response = await apiClient.get('/labs', { params: filters });
    const rawList = response.data?.data;
    if (!Array.isArray(rawList)) throw new Error('Invalid lab response from campus server');

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

    if (filters?.status && filters.status !== 'all') filtered = filtered.filter(l => l.operationalStatus === filters.status);
    if (filters?.capacity) filtered = filtered.filter(l => l.capacity >= filters.capacity!);
    if (filters?.building && filters.building !== 'all') filtered = filtered.filter(l => l.building === filters.building);

    return {
      success: true,
      message: 'Labs retrieved successfully',
      data: filtered,
    };
  }

  async getById(labId: string): Promise<ApiResponse<Lab>> {
    const res = await apiClient.get(`/labs/${labId}`);
    return { success: true, message: 'Lab found', data: mapBackendLabToFrontend(res.data.data) };
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
