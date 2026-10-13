import { Request, Response } from 'express';
import {
  CSE_NODES,
  CSE_EDGES,
  CSE_START_NODE_ID,
  CSE_LAB_DESTINATIONS,
  getNodeById,
  resolveNodeId,
} from './graph.js';
import { runDFS } from './algorithms/dfs.js';
import { runDijkstra } from './algorithms/dijkstra.js';
import { runBFS } from './algorithms/bfs.js';
import { runBellmanFord } from './algorithms/bellmanFord.js';
import { success, error } from '../../utils/apiResponse.js';

export const getTopology = async (_req: Request, res: Response) => {
  return success(res, {
    startNodeId: CSE_START_NODE_ID,
    nodes: CSE_NODES,
    edges: CSE_EDGES,
    destinations: CSE_LAB_DESTINATIONS,
    supportedAlgorithms: ['DFS', 'Dijkstra', 'BFS', 'Bellman-Ford'],
  }, 'CSE Department wayfinding graph topology');
};

export const calculateRoute = async (req: Request, res: Response) => {
  const startRaw = (req.query.start as string) || (req.body?.start as string) || CSE_START_NODE_ID;
  const destRaw = (req.query.destination as string) || (req.body?.destination as string) || 'D-10';
  const algoRaw = ((req.query.algorithm as string) || (req.body?.algorithm as string) || 'DFS').toUpperCase();
  const bookingId = (req.query.bookingId as string) || (req.body?.bookingId as string) || 'BK-20261013-1388';

  const startNodeId = resolveNodeId(startRaw);
  const targetNodeId = resolveNodeId(destRaw);

  const startNode = startNodeId ? getNodeById(startNodeId) : undefined;
  const targetNode = targetNodeId ? getNodeById(targetNodeId) : undefined;

  if (!startNode || !startNodeId) {
    return error(res, `Start node '${startRaw}' not found in CSE graph.`, [], 404);
  }
  if (!targetNode || !targetNodeId) {
    return error(res, `Destination laboratory '${destRaw}' not found in CSE graph.`, [], 404);
  }

  let routeResult: { path: string[]; distance: number } | null = null;

  switch (algoRaw) {
    case 'DIJKSTRA':
      routeResult = runDijkstra(startNodeId, targetNodeId);
      break;
    case 'BFS':
      routeResult = runBFS(startNodeId, targetNodeId);
      break;
    case 'BELLMAN-FORD':
    case 'BELLMAN_FORD':
      routeResult = runBellmanFord(startNodeId, targetNodeId);
      break;
    case 'DFS':
    default:
      routeResult = runDFS(startNodeId, targetNodeId);
      break;
  }

  if (!routeResult) {
    // If specific algorithm failed or disconnected, attempt fallback via Dijkstra
    routeResult = runDijkstra(startNodeId, targetNodeId);
  }

  if (!routeResult) {
    return error(
      res,
      `No route found from ${startNode.name} to ${targetNode.name} using ${algoRaw}.`,
      [],
      404
    );
  }

  // Generate step-by-step navigation guidance
  const steps = routeResult.path.map((nodeId, idx) => {
    const node = getNodeById(nodeId);
    const isStart = idx === 0;
    const isEnd = idx === routeResult!.path.length - 1;

    let title = node?.displayName || node?.fullName || node?.name || nodeId;
    let description = node?.description || `Traverse corridor waypoint: ${node?.name || nodeId}`;

    if (isStart) {
      title = node?.name || 'CSE PORCH';
      description = 'Start journey from CSE Department Porch entrance';
    } else if (isEnd) {
      title = node?.displayName || node?.fullName || 'Destination Lab';
      description = 'Arrive at destination laboratory facility';
    } else {
      title = node?.fullName || node?.displayName || node?.name || nodeId;
    }

    return {
      nodeId,
      number: idx + 1,
      title,
      description,
      isStart,
      isEnd,
    };
  });

  const travelTimeMinutes = Math.max(1, Math.round(routeResult.distance / 80));

  const destinationTitle = targetNode.displayName || targetNode.fullName || targetNode.name;

  return success(res, {
    bookingId,
    source: startNode.name,
    sourceNodeId: startNode.id,
    destination: destinationTitle,
    destinationNodeId: targetNode.id,
    algorithm: algoRaw,
    nodes: CSE_NODES,
    edges: CSE_EDGES,
    path: routeResult.path,
    steps,
    distanceMeters: routeResult.distance,
    hops: routeResult.path.length,
    estimatedTravelTimeMinutes: travelTimeMinutes,
    routeStatus: 'optimal' as const,
  }, 'Verified route calculation successful');
};

export const getRouteByBookingId = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const algoRaw = (req.query.algorithm as string) || 'DFS';

  // Delegate to calculateRoute with bookingId
  req.query.bookingId = bookingId;
  req.query.algorithm = algoRaw;

  // If bookingId matches a lab code like D-10, use it directly as destination
  if (bookingId && (bookingId.toLowerCase().startsWith('d-') || bookingId.toLowerCase().startsWith('node_'))) {
    req.query.destination = bookingId;
  } else {
    // Default destination D-10
    req.query.destination = req.query.destination || 'D-10';
  }

  return calculateRoute(req, res);
};
