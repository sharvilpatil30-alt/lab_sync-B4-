import { ApiBookingService } from './ApiBookingService';
import { ApiLabService } from './ApiLabService';
import { routeFromBackend } from '../routeEngine';
import { IRoutingService, ComputedRouteResult } from '../types';
import { RouteResult, ApiResponse } from '../../types';
import { CseGraph, validateGraph, resolveLabNode } from '../cseRouting';
import { apiClient } from './client';

export class ApiRoutingService implements IRoutingService {
  async getNodes(): Promise<ApiResponse<CseGraph & { nodes: (CseGraph['nodes'][number] & { nodeId: string })[] }>> {
    const res = await apiClient.get('/routes/nodes');
    const data = validateGraph(res.data?.data ?? res.data);
    return { success: true, message: 'CSE map retrieved', data: {
      ...data, nodes: data.nodes.map(n => ({ ...n, nodeId: n.id })),
    } };
  }

  async computeRoute(data: { fromNodeId: string; toNodeId: string; algorithm?: string }): Promise<ApiResponse<ComputedRouteResult>> {
    const algorithm = data.algorithm ?? 'dijkstra';
    const res = await apiClient.post('/routes/compute', { ...data, algorithm });
    const raw = res.data?.data ?? res.data;
    if (!raw || !Array.isArray(raw.path) || !raw.path.length ||
        raw.path[0] !== data.fromNodeId || raw.path[raw.path.length - 1] !== data.toNodeId ||
        !Number.isFinite(raw.distance) || raw.distance < 0 || raw.distanceUnit !== 'm' ||
        typeof raw.algorithm !== 'string' || raw.algorithm.toLowerCase() !== algorithm.toLowerCase()) {
      throw new Error('The routing server returned an invalid route. Please recalculate.');
    }
    return { success: true, message: 'Route computed', data: raw };
  }

  async getAlgorithms(): Promise<ApiResponse<{ algorithms: string[] }>> {
    const res = await apiClient.get('/routes/algorithms');
    const data = res.data?.data ?? res.data;
    if (!Array.isArray(data?.algorithms) || !data.algorithms.length || !data.algorithms.every((a: unknown) => typeof a === 'string')) {
      throw new Error('The routing server returned no supported algorithms.');
    }
    return { success: true, message: 'Supported algorithms', data };
  }

  async getRoute(bookingId: string): Promise<ApiResponse<RouteResult>> {
    const [booking, graphResponse] = await Promise.all([
      new ApiBookingService().getById(bookingId), this.getNodes(),
    ]);
    const graph = graphResponse.data;
    let destination = resolveLabNode(booking.data.lab, graph.nodes);
    if (!destination) {
      const labId = typeof booking.data.lab === 'string' ? booking.data.lab : booking.data.lab.id;
      if (!labId) throw new Error('This booking has no lab identifier.');
      const lab = await new ApiLabService().getById(labId);
      destination = resolveLabNode(lab.data, graph.nodes);
    }
    if (!destination) throw new Error('The booked lab is not mapped to the CSE routing graph.');
    const result = (await this.computeRoute({ fromNodeId: graph.startNodeId, toNodeId: destination })).data;
    const route = routeFromBackend(result, graph);
    return { success: true, message: 'Booking route computed', data: {
      bookingId, source: route.sourceName, destination: route.destinationName,
      nodes: graph.nodes.map(n => ({ ...n, type: n.type.toLowerCase() === 'lab' ? 'lab' as const : 'junction' as const })),
      edges: graph.edges, path: result.path, distanceMeters: result.distance,
      estimatedTravelTimeMinutes: route.estimatedMinutes,
      routeStatus: route.shortestDistanceGuaranteed ? 'optimal' : 'alternative',
    } };
  }
}
