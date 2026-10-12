import { IRoutingService, RouteNodeItem, ComputedRouteResult } from '../types';
import { RouteResult, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiRoutingService implements IRoutingService {
  // Canonical: GET /api/v1/routes/nodes -> { "nodes": [{ "nodeId": "string", "name": "string", "type": "LAB" }] }
  async getNodes(): Promise<ApiResponse<{ nodes: RouteNodeItem[] }>> {
    try {
      const res = await apiClient.get('/routes/nodes');
      const payload = res.data?.data || res.data;
      const list = payload?.nodes || (Array.isArray(payload) ? payload : []);
      return {
        success: true,
        message: 'Campus nodes retrieved',
        data: { nodes: list },
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to retrieve routing nodes',
        data: { nodes: [] },
      };
    }
  }

  // Canonical: POST /api/v1/routes/compute -> { "fromNodeId": "string", "toNodeId": "string", "algorithm": "dijkstra" }
  async computeRoute(data: {
    fromNodeId: string;
    toNodeId: string;
    algorithm?: string;
  }): Promise<ApiResponse<ComputedRouteResult>> {
    const algorithm = data.algorithm || 'dijkstra';
    try {
      // 1. Try canonical POST /routes/compute
      const res = await apiClient.post('/routes/compute', {
        fromNodeId: data.fromNodeId,
        toNodeId: data.toNodeId,
        algorithm,
      });
      const raw = res.data?.data || res.data;
      return {
        success: true,
        message: 'Route computed successfully',
        data: {
          path: raw.path || [data.fromNodeId, data.toNodeId],
          distance: Number(raw.distance || raw.cost || 0),
          distanceUnit: raw.distanceUnit || 'm',
          algorithm: raw.algorithm || algorithm,
        },
      };
    } catch {
      // 2. Try GET /route?from=...&to=... (Team B standalone endpoint fallback)
      const fallbackRes = await apiClient.get('/route', {
        params: {
          from: data.fromNodeId,
          to: data.toNodeId,
          algorithm,
        },
      });
      const raw = fallbackRes.data?.data || fallbackRes.data;
      return {
        success: true,
        message: 'Route computed via campus engine',
        data: {
          path: raw.path || [data.fromNodeId, data.toNodeId],
          distance: Number(raw.distance || raw.cost || 0),
          distanceUnit: 'm',
          algorithm: raw.algorithm || algorithm,
        },
      };
    }
  }

  // Canonical: GET /api/v1/routes/algorithms -> { "algorithms": ["dijkstra", "bfs", "dfs", "bellman-ford"] }
  async getAlgorithms(): Promise<ApiResponse<{ algorithms: string[] }>> {
    try {
      const res = await apiClient.get('/routes/algorithms');
      const payload = res.data?.data || res.data;
      const list = payload?.algorithms || ['dijkstra', 'bfs', 'dfs', 'bellman-ford'];
      return {
        success: true,
        message: 'Supported routing algorithms',
        data: { algorithms: list },
      };
    } catch {
      return {
        success: true,
        message: 'Default routing algorithms',
        data: { algorithms: ['dijkstra', 'bfs', 'dfs', 'bellman-ford'] },
      };
    }
  }

  async getRoute(bookingId: string): Promise<ApiResponse<RouteResult>> {
    const res = await apiClient.get(`/routes/${bookingId}`);
    return res.data;
  }
}
