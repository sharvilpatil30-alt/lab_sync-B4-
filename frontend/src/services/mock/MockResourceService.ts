import { IResourceService } from '../types';
import { Resource, ResourceFilters, ApiResponse } from '../../types';
import { resourcesData } from '../../data/mock';

const RESOURCES_KEY = 'smart_campus_mock_resources';

function getStoredResources(): Resource[] {
  const stored = localStorage.getItem(RESOURCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(RESOURCES_KEY, JSON.stringify(resourcesData));
  return resourcesData as unknown as Resource[];
}

function saveResources(resources: Resource[]) {
  localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
}

export class MockResourceService implements IResourceService {
  async list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>> {
    await new Promise((r) => setTimeout(r, 200));
    let resources = getStoredResources();

    if (filters) {
      if (filters.lab && filters.lab !== 'all') {
        resources = resources.filter((r) => r.lab === filters.lab);
      }
      if (filters.type && filters.type !== 'all') {
        resources = resources.filter((r) => r.type.toLowerCase().includes(filters.type?.toLowerCase() || ''));
      }
      if (filters.status && filters.status !== 'all') {
        resources = resources.filter((r) => r.operationalStatus.toLowerCase() === filters.status?.toLowerCase());
      }
      if (filters.availability !== undefined) {
        resources = resources.filter((r) => r.availability === filters.availability);
      }
    }

    return {
      success: true,
      message: 'Resources retrieved',
      data: resources,
    };
  }

  async getById(resourceId: string): Promise<ApiResponse<Resource>> {
    await new Promise((r) => setTimeout(r, 150));
    const resources = getStoredResources();
    const resource = resources.find((r) => r.id === resourceId || r.resourceId === resourceId);
    if (!resource) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Resource with ID ${resourceId} not found` },
        },
      };
    }
    return {
      success: true,
      message: 'Resource retrieved',
      data: resource,
    };
  }

  async create(data: Omit<Resource, 'id' | 'createdAt'>): Promise<ApiResponse<Resource>> {
    await new Promise((r) => setTimeout(r, 250));
    const resources = getStoredResources();
    const newRes: Resource = {
      ...data,
      id: `res_${Date.now()}`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    resources.unshift(newRes);
    saveResources(resources);

    return {
      success: true,
      message: 'Resource registered successfully',
      data: newRes,
    };
  }

  async update(resourceId: string, data: Partial<Resource>): Promise<ApiResponse<Resource>> {
    await new Promise((r) => setTimeout(r, 200));
    const resources = getStoredResources();
    const index = resources.findIndex((r) => r.id === resourceId || r.resourceId === resourceId);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Resource ${resourceId} not found` },
        },
      };
    }

    const updated = {
      ...resources[index],
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    resources[index] = updated;
    saveResources(resources);

    return {
      success: true,
      message: 'Resource updated successfully',
      data: updated,
    };
  }

  async updateStatus(
    resourceId: string,
    operationalStatus: string,
    maintenanceStatus?: string
  ): Promise<ApiResponse<Resource>> {
    await new Promise((r) => setTimeout(r, 200));
    const resources = getStoredResources();
    const index = resources.findIndex((r) => r.id === resourceId || r.resourceId === resourceId);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Resource ${resourceId} not found` },
        },
      };
    }

    const updated: Resource = {
      ...resources[index],
      operationalStatus: operationalStatus as any,
      maintenanceStatus: maintenanceStatus ?? (operationalStatus === 'maintenance' ? 'Under inspection' : 'Nominal'),
      availability: operationalStatus === 'available',
      lastUpdated: new Date().toISOString(),
    };
    resources[index] = updated;
    saveResources(resources);

    return {
      success: true,
      message: `Status updated to ${operationalStatus}`,
      data: updated,
    };
  }

  async delete(resourceId: string): Promise<ApiResponse<{ id: string }>> {
    await new Promise((r) => setTimeout(r, 200));
    let resources = getStoredResources();
    resources = resources.filter((r) => r.id !== resourceId && r.resourceId !== resourceId);
    saveResources(resources);
    return {
      success: true,
      message: 'Resource deleted',
      data: { id: resourceId },
    };
  }
}
