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
import { pool } from '../../config/postgres.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';

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
  const startRaw = req.body?.fromNodeId ?? req.query.start ?? req.body?.start ?? CSE_START_NODE_ID;
  const destRaw = req.body?.toNodeId ?? req.query.destination ?? req.body?.destination;
  const algorithm = req.query.algorithm ?? req.body?.algorithm ?? 'dijkstra';
  const bookingId = req.query.bookingId ?? req.body?.bookingId;
  if (typeof startRaw !== 'string' || !startRaw.trim() ||
      typeof destRaw !== 'string' || !destRaw.trim()) {
    return error(res, 'Provide non-empty string node identifiers: fromNodeId and toNodeId (or start and destination).', [], 400);
  }
  if (typeof algorithm !== 'string') {
    return error(res, 'Algorithm must be a string.', [], 400);
  }
  const algoRaw = algorithm.trim().toUpperCase().replace('_', '-');
  if (!['DIJKSTRA', 'DFS', 'BFS', 'BELLMAN-FORD'].includes(algoRaw)) {
    return error(res, `Unsupported algorithm '${algorithm}'. Use dijkstra, bfs, dfs, or bellman-ford.`, [], 400);
  }

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
      routeResult = runDFS(startNodeId, targetNodeId);
      break;
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
      description = `Start journey from ${startNode.displayName || startNode.name}`;
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

  const travelTimeMinutes = Math.ceil(routeResult.distance / 80);

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
    distance: routeResult.distance,
    distanceUnit: 'm',
    distanceMeters: routeResult.distance,
    hops: routeResult.path.length - 1,
    estimatedTravelTimeMinutes: travelTimeMinutes,
    routeStatus: ['DIJKSTRA', 'BELLMAN-FORD'].includes(algoRaw) ? 'optimal' : 'alternative',
    shortestDistanceGuaranteed: ['DIJKSTRA', 'BELLMAN-FORD'].includes(algoRaw),
  }, 'Verified route calculation successful');
};

// Booking or Lab ID parameterized route
export const getRouteByBookingId = async (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  req.query.bookingId = bookingId;
  const publicDestination = resolveNodeId(bookingId);
  if (publicDestination) {
    req.query.destination = publicDestination;
    return calculateRoute(req, res);
  }
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return error(res, 'Booking destination lookup is unavailable. Supply an explicit destination or use /compute with toNodeId.', [], 400);
  }
  return authenticate(req, res, async (authError?: any) => {
    if (authError) return error(res, authError.message, [], authError.statusCode || 401);
    try {
      const booking = (await pool.query(`SELECT b.user_id,l.lab_code FROM public.bookings b JOIN public.labs l ON l.id=b.lab_id WHERE b.id::text=$1`, [bookingId])).rows[0];
      if (!booking) return error(res, 'Booking not found', [], 404);
      if (booking.user_id !== req.user.id && !['admin','lab_admin'].includes(req.user.role)) return error(res, 'Not authorized to view this booking', [], 403);
      const destination = resolveNodeId(booking.lab_code);
      if (!destination) return error(res, 'Booked laboratory is not mapped', [], 404);
      req.query.destination = destination;
      return calculateRoute(req, res);
    } catch {
      return error(res, 'Unable to retrieve booking destination', [], 503);
    }
  });
};

export const getNodes = async (_req: Request, res: Response) => success(res, {
  startNodeId: CSE_START_NODE_ID,
  edges: CSE_EDGES,
  nodes: CSE_NODES.map(node => ({ ...node, nodeId: node.id, type: node.type.toUpperCase() })),
  destinations: CSE_LAB_DESTINATIONS,
}, 'CSE routing nodes');

export const getAlgorithms = async (_req: Request, res: Response) => success(res, {
  algorithms: ['dijkstra', 'bfs', 'dfs', 'bellman-ford'],
  defaultAlgorithm: 'dijkstra',
  shortestDistanceAlgorithms: ['dijkstra', 'bellman-ford'],
}, 'Supported routing algorithms');
