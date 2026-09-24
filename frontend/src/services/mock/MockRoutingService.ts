import { IRoutingService } from '../types';
import { RouteResult, RouteNode, ApiResponse } from '../../types';
import { topologyData, bookingsData } from '../../data/mock';

// Dijkstra shortest path on weighted graph
function findShortestPath(
  startNode: string,
  endNode: string,
  nodes: RouteNode[],
  edges: { from: string; to: string; weight: number }[]
): { path: string[]; distance: number } {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  // Build adjacency list
  const adj: Record<string, { node: string; weight: number }[]> = {};
  nodes.forEach((n) => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    adj[n.id] = [];
    unvisited.add(n.id);
  });

  edges.forEach((e) => {
    adj[e.from]?.push({ node: e.to, weight: e.weight });
    adj[e.to]?.push({ node: e.from, weight: e.weight }); // bidirectional campus paths
  });

  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let smallestDist = Infinity;

    for (const node of unvisited) {
      if (distances[node] < smallestDist) {
        smallestDist = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity || current === endNode) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.node)) {
        const alt = distances[current] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = current;
        }
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = endNode;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    path: path[0] === startNode ? path : [startNode, endNode],
    distance: distances[endNode] !== Infinity ? distances[endNode] : 350,
  };
}

export class MockRoutingService implements IRoutingService {
  async getRoute(bookingId: string): Promise<ApiResponse<RouteResult>> {
    await new Promise((r) => setTimeout(r, 250));

    // Retrieve booking to find lab
    const storedBookings = localStorage.getItem('smart_campus_mock_bookings');
    const bookings = storedBookings ? JSON.parse(storedBookings) : bookingsData;
    const booking = bookings.find((b: any) => b.id === bookingId || b.bookingId === bookingId);

    const labId = booking
      ? typeof booking.lab === 'object' && booking.lab !== null
        ? booking.lab.id
        : booking.lab
      : (topologyData.labNodeMap as Record<string, string>)[bookingId] || bookingId.startsWith('lab_')
      ? bookingId
      : 'lab_cse_01';

    const targetNodeId = (topologyData.labNodeMap as Record<string, string>)[labId] || 'node_turing';
    const sourceNodeId = topologyData.sourceDefault || 'node_gate';

    const { path, distance } = findShortestPath(
      sourceNodeId,
      targetNodeId,
      topologyData.nodes as RouteNode[],
      topologyData.edges
    );

    const sourceNode = topologyData.nodes.find((n) => n.id === sourceNodeId);
    const targetNode = topologyData.nodes.find((n) => n.id === targetNodeId);

    // Walking speed: ~80 meters per minute
    const travelTimeMinutes = Math.max(1, Math.round(distance / 80));

    const result: RouteResult = {
      bookingId,
      source: sourceNode ? sourceNode.name : 'Main Gate',
      destination: targetNode ? targetNode.name : 'Destination Lab',
      nodes: topologyData.nodes as RouteNode[],
      edges: topologyData.edges,
      path,
      distanceMeters: distance,
      estimatedTravelTimeMinutes: travelTimeMinutes,
      routeStatus: 'optimal',
    };

    return {
      success: true,
      message: 'Campus route calculated successfully',
      data: result,
    };
  }
}
