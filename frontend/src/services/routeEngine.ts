import type { CampusNode } from '../data/campusMapData';
import type { ComputedRouteResult } from './types';
import { CseGraph, toCampusMap, floorName } from './cseRouting';

export interface RoutePoint {
  x: number;
  y: number;
  nodeId?: string;
  name?: string;
}

export interface TurnByTurnInstruction {
  step: number;
  instruction: string;
  distanceMeters: number;
  nodeId: string;
  targetName: string;
  iconType: 'straight' | 'turn-left' | 'turn-right' | 'arrive' | 'depart';
}

export interface CalculatedRoute {
  algorithm: string;
  shortestDistanceGuaranteed: boolean;
  sourceNodeId: string;
  destinationNodeId: string;
  sourceName: string;
  destinationName: string;
  destinationBuildingName?: string;
  destinationRoom?: string;
  destinationFloor?: string;
  pathNodeIds: string[];
  pathNodes: CampusNode[];
  pathCoordinates: RoutePoint[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  instructions: TurnByTurnInstruction[];
}

export interface PositionOnPath {
  x: number;
  y: number;
  bearing: number; // degrees 0-360
  segmentIndex: number;
  progressPercent: number;
  isComplete: boolean;
}

// Presentation only: the backend selects the path. No local route fallback.
export function routeFromBackend(result: ComputedRouteResult, graph: CseGraph): CalculatedRoute {
  const map = toCampusMap(graph);
  const pathNodes = result.path.map(id => {
    const node = map.nodes.find(n => n.id === id);
    if (!node) throw new Error(`Route contains an unknown CSE node: ${id}`);
    return node;
  });
  if (!pathNodes.length) throw new Error('The routing server returned an empty path.');
  let distance = 0;
  const cumulative = [0];
  for (let i = 1; i < pathNodes.length; i++) {
    const a = pathNodes[i - 1].id, b = pathNodes[i].id;
    const edge = graph.edges.find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    if (!edge) throw new Error(`Route has no corridor between ${a} and ${b}.`);
    distance += edge.weight;
    cumulative.push(distance);
  }
  if (!Number.isFinite(result.distance) || Math.abs(distance - result.distance) > 0.001 || result.distanceUnit !== 'm') {
    throw new Error('Route distance does not match the CSE corridor distances. Please recalculate.');
  }
  const start = pathNodes[0], end = pathNodes[pathNodes.length - 1];
  const destination = graph.nodes.find(n => n.id === end.id)!;
  return {
    sourceNodeId: start.id, destinationNodeId: end.id,
    sourceName: start.name, destinationName: end.name,
    destinationBuildingName: end.name, destinationRoom: destination.code,
    destinationFloor: floorName(destination.floor),
    pathNodeIds: [...result.path], pathNodes,
    pathCoordinates: pathNodes.map(n => ({ x: n.x, y: n.y, nodeId: n.id, name: n.name })),
    totalDistanceMeters: result.distance,
    estimatedMinutes: result.estimatedTravelTimeMinutes ?? Math.ceil(result.distance / 80),
    algorithm: result.algorithm,
    shortestDistanceGuaranteed: result.shortestDistanceGuaranteed === true,
    instructions: pathNodes.map((node, i) => ({
      step: i + 1, nodeId: node.id, targetName: node.name, distanceMeters: cumulative[i],
      iconType: i === 0 ? 'depart' : i === pathNodes.length - 1 ? 'arrive' : 'straight',
      instruction: pathNodes.length === 1 ? `You are already at ${node.name}` :
        i === 0 ? `Depart from ${node.name}` : i === pathNodes.length - 1 ?
        `Arrive at ${node.name}` : `Continue via ${node.name}`,
    })),
  };
}

// Smooth continuous interpolation along the route polyline
export function interpolatePositionOnRoute(
  coords: RoutePoint[],
  progressRatio: number // 0.0 to 1.0
): PositionOnPath {
  if (coords.length === 0) {
    return { x: 0, y: 0, bearing: 0, segmentIndex: 0, progressPercent: 0, isComplete: false };
  }
  if (coords.length === 1) {
    return { x: coords[0].x, y: coords[0].y, bearing: 0, segmentIndex: 0, progressPercent: 100, isComplete: true };
  }
  if (progressRatio <= 0) {
    return {
      x: coords[0].x,
      y: coords[0].y,
      bearing: 0,
      segmentIndex: 0,
      progressPercent: 0,
      isComplete: false,
    };
  }
  if (progressRatio >= 1) {
    const last = coords[coords.length - 1];
    const prev = coords[coords.length - 2];
    const angle = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
    return {
      x: last.x,
      y: last.y,
      bearing: (angle + 360) % 360,
      segmentIndex: coords.length - 2,
      progressPercent: 100,
      isComplete: true,
    };
  }

  // Compute lengths of each segment
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1].x - coords[i].x;
    const dy = coords[i + 1].y - coords[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) {
    return {
      x: coords[0].x,
      y: coords[0].y,
      bearing: 0,
      segmentIndex: 0,
      progressPercent: Math.round(progressRatio * 100),
      isComplete: false,
    };
  }

  const targetDist = progressRatio * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segRatio = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const clampedRatio = Math.max(0, Math.min(1, segRatio));

      const p1 = coords[i];
      const p2 = coords[i + 1];

      const x = p1.x + (p2.x - p1.x) * clampedRatio;
      const y = p1.y + (p2.y - p1.y) * clampedRatio;

      const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const bearing = ((angleRad * 180) / Math.PI + 360) % 360;

      return {
        x,
        y,
        bearing,
        segmentIndex: i,
        progressPercent: Math.min(100, Math.round(progressRatio * 100)),
        isComplete: false,
      };
    }
    accumulated += segLen;
  }

  const last = coords[coords.length - 1];
  return {
    x: last.x,
    y: last.y,
    bearing: 0,
    segmentIndex: coords.length - 2,
    progressPercent: 100,
    isComplete: true,
  };
}
