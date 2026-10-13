/**
 * Campus Spatial Routing Engine
 * Implements Dijkstra & Bellman-Ford shortest path algorithms on the campus graph.
 */

import { campusDb } from '../persistence/database.js';
import { RoutingAlgorithm } from '../../types/dfd.types.js';

export interface RouteComputationResult {
  algorithm: RoutingAlgorithm;
  originNodeId: string;
  originNodeName: string;
  destinationNodeId: string;
  destinationNodeName: string;
  pathNodeIds: string[];
  pathNodeNames: string[];
  costMeters: number;
  stepDescriptions: string[];
  executionTimeMs: number;
}

export class CampusRouter {
  /**
   * Computes optimal route between two nodes on the campus graph
   */
  public static computeRoute(
    originId: string,
    destinationId: string,
    algorithm: RoutingAlgorithm = 'DIJKSTRA'
  ): RouteComputationResult {
    const startTime = performance.now();

    const origin = campusDb.campusNodes.get(originId);
    const destination = campusDb.campusNodes.get(destinationId);

    if (!origin || !destination) {
      throw new Error(`Invalid route: Origin or Destination node not found in campus_nodes`);
    }

    if (originId === destinationId) {
      return {
        algorithm,
        originNodeId: originId,
        originNodeName: origin.name,
        destinationNodeId: destinationId,
        destinationNodeName: destination.name,
        pathNodeIds: [originId],
        pathNodeNames: [origin.name],
        costMeters: 0,
        stepDescriptions: [`You are already at ${origin.name}`],
        executionTimeMs: performance.now() - startTime,
      };
    }

    // Build adjacency list
    const nodes = Array.from(campusDb.campusNodes.keys());
    const edges = Array.from(campusDb.campusEdges.values());

    const adj: Map<string, Array<{ to: string; weight: number }>> = new Map();
    nodes.forEach((n) => adj.set(n, []));

    edges.forEach((e) => {
      if (adj.has(e.from_node)) {
        adj.get(e.from_node)!.push({ to: e.to_node, weight: e.distance_m * e.weight });
      }
      // Undirected graph assumption for campus walking paths
      if (adj.has(e.to_node)) {
        adj.get(e.to_node)!.push({ to: e.from_node, weight: e.distance_m * e.weight });
      }
    });

    let distances: Map<string, number> = new Map();
    let previous: Map<string, string | null> = new Map();

    nodes.forEach((n) => {
      distances.set(n, Infinity);
      previous.set(n, null);
    });
    distances.set(originId, 0);

    if (algorithm === 'DIJKSTRA') {
      const unvisited = new Set<string>(nodes);

      while (unvisited.size > 0) {
        // Find node with smallest distance
        let current: string | null = null;
        let minDistance = Infinity;

        unvisited.forEach((n) => {
          const d = distances.get(n)!;
          if (d < minDistance) {
            minDistance = d;
            current = n;
          }
        });

        if (!current || minDistance === Infinity) break;
        if (current === destinationId) break;

        unvisited.delete(current);

        const neighbors = adj.get(current) || [];
        for (const neighbor of neighbors) {
          if (unvisited.has(neighbor.to)) {
            const alt = distances.get(current)! + neighbor.weight;
            if (alt < distances.get(neighbor.to)!) {
              distances.set(neighbor.to, alt);
              previous.set(neighbor.to, current);
            }
          }
        }
      }
    } else {
      // Bellman-Ford
      for (let i = 1; i < nodes.length; i++) {
        edges.forEach((e) => {
          const w = e.distance_m * e.weight;
          // Forward
          if (distances.get(e.from_node)! + w < distances.get(e.to_node)!) {
            distances.set(e.to_node, distances.get(e.from_node)! + w);
            previous.set(e.to_node, e.from_node);
          }
          // Reverse
          if (distances.get(e.to_node)! + w < distances.get(e.from_node)!) {
            distances.set(e.from_node, distances.get(e.to_node)! + w);
            previous.set(e.from_node, e.to_node);
          }
        });
      }
    }

    // Reconstruct path
    const pathIds: string[] = [];
    let curr: string | null = destinationId;
    while (curr) {
      pathIds.unshift(curr);
      curr = previous.get(curr) || null;
    }

    // If no path found, fallback to direct traversal
    if (pathIds[0] !== originId) {
      pathIds.length = 0;
      pathIds.push(originId, destinationId);
    }

    const pathNames = pathIds.map((id) => campusDb.campusNodes.get(id)?.name || id);
    const totalCost = Math.round(distances.get(destinationId) || 120);

    const steps = pathNames.map((name, idx) => {
      if (idx === 0) return `Depart from ${name}`;
      if (idx === pathNames.length - 1) return `Arrive at destination: ${name}`;
      return `Walk through ${name}`;
    });

    return {
      algorithm,
      originNodeId: originId,
      originNodeName: origin.name,
      destinationNodeId: destinationId,
      destinationNodeName: destination.name,
      pathNodeIds: pathIds,
      pathNodeNames: pathNames,
      costMeters: totalCost,
      stepDescriptions: steps,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }
}
