import { ILabService } from '../types';
import { Lab, LabFilters, ApiResponse } from '../../types';
import { labsData } from '../../data/mock';

const LABS_KEY = 'smart_campus_mock_labs';

function getStoredLabs(): Lab[] {
  const stored = localStorage.getItem(LABS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(LABS_KEY, JSON.stringify(labsData));
  return labsData as unknown as Lab[];
}

function saveLabs(labs: Lab[]) {
  localStorage.setItem(LABS_KEY, JSON.stringify(labs));
}

export class MockLabService implements ILabService {
  async list(filters?: LabFilters): Promise<ApiResponse<Lab[]>> {
    await new Promise((r) => setTimeout(r, 200));
    let labs = getStoredLabs();

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        labs = labs.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.labId.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.building.toLowerCase().includes(q)
        );
      }
      if (filters.status && filters.status !== 'all') {
        labs = labs.filter((l) => l.operationalStatus.toLowerCase() === filters.status?.toLowerCase());
      }
      if (filters.availability && filters.availability !== 'all') {
        if (filters.availability === 'available') {
          labs = labs.filter((l) => l.operationalStatus === 'available');
        } else if (filters.availability === 'occupied') {
          labs = labs.filter((l) => l.operationalStatus === 'occupied');
        }
      }
      if (filters.building && filters.building !== 'all') {
        labs = labs.filter((l) => l.building === filters.building);
      }
      if (filters.location && filters.location !== 'all') {
        labs = labs.filter((l) => l.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
      if (filters.capacity) {
        labs = labs.filter((l) => l.capacity >= (filters.capacity || 0));
      }
      if (filters.equipment) {
        const eq = filters.equipment.toLowerCase();
        labs = labs.filter(
          (l) =>
            l.description.toLowerCase().includes(eq) ||
            (Array.isArray(l.availableResources) &&
              l.availableResources.some((r) =>
                typeof r === 'string' ? r.toLowerCase().includes(eq) : r.name.toLowerCase().includes(eq)
              ))
        );
      }
      if (filters.capability) {
        const cap = filters.capability.toLowerCase();
        labs = labs.filter(
          (l) => l.description.toLowerCase().includes(cap) || l.name.toLowerCase().includes(cap)
        );
      }
    }

    return {
      success: true,
      message: 'Labs retrieved',
      data: labs,
    };
  }

  async getById(labId: string): Promise<ApiResponse<Lab>> {
    await new Promise((r) => setTimeout(r, 150));
    const labs = getStoredLabs();
    const lab = labs.find((l) => l.id === labId || l.labId === labId);
    if (!lab) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Lab with ID ${labId} not found` },
        },
      };
    }
    return {
      success: true,
      message: 'Lab retrieved',
      data: lab,
    };
  }

  async create(data: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lab>> {
    await new Promise((r) => setTimeout(r, 250));
    const labs = getStoredLabs();
    const newLab: Lab = {
      ...data,
      id: `lab_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    labs.unshift(newLab);
    saveLabs(labs);

    return {
      success: true,
      message: 'Lab created successfully',
      data: newLab,
    };
  }

  async update(labId: string, data: Partial<Lab>): Promise<ApiResponse<Lab>> {
    await new Promise((r) => setTimeout(r, 200));
    const labs = getStoredLabs();
    const index = labs.findIndex((l) => l.id === labId || l.labId === labId);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Lab ${labId} not found` },
        },
      };
    }
    const updated = {
      ...labs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    labs[index] = updated;
    saveLabs(labs);

    return {
      success: true,
      message: 'Lab updated successfully',
      data: updated,
    };
  }

  async delete(labId: string): Promise<ApiResponse<{ id: string }>> {
    await new Promise((r) => setTimeout(r, 200));
    let labs = getStoredLabs();
    labs = labs.filter((l) => l.id !== labId && l.labId !== labId);
    saveLabs(labs);
    return {
      success: true,
      message: 'Lab deleted successfully',
      data: { id: labId },
    };
  }
}
