import { campusNodes, campusEdges, CampusNode, CampusEdge, labDestinationMap } from '../data/campusMapData';

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

// A* (A-Star) algorithm implementation on campus graph
export function calculateCampusRoute(
  startNodeId: string,
  endNodeId: string
): CalculatedRoute | null {
  const nodeMap = new Map<string, CampusNode>();
  campusNodes.forEach((n) => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);
  if (!startNode || !endNode) return null;

  // Build bidirectional adjacency list
  const adj = new Map<string, { to: string; weight: number }[]>();
  campusNodes.forEach((n) => adj.set(n.id, []));

  campusEdges.forEach((edge) => {
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  });

  // Euclidean distance heuristic for A*
  const heuristic = (aId: string, bId: string): number => {
    const a = nodeMap.get(aId);
    const b = nodeMap.get(bId);
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const openSet = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  campusNodes.forEach((n) => gScore.set(n.id, Infinity));
  gScore.set(startNodeId, 0);

  const fScore = new Map<string, number>();
  campusNodes.forEach((n) => fScore.set(n.id, Infinity));
  fScore.set(startNodeId, heuristic(startNodeId, endNodeId));

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      const score = fScore.get(id) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentId = id;
      }
    }

    if (!currentId) break;

    // Arrived at destination
    if (currentId === endNodeId) {
      return reconstructRoute(cameFrom, currentId, nodeMap, startNode, endNode);
    }

    openSet.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const edge of neighbors) {
      const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weight;
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, currentId);
        gScore.set(edge.to, tentativeG);
        fScore.set(edge.to, tentativeG + heuristic(edge.to, endNodeId));
        openSet.add(edge.to);
      }
    }
  }

  // Fallback direct segment if disconnected
  return reconstructRoute(cameFrom, endNodeId, nodeMap, startNode, endNode);
}

function reconstructRoute(
  cameFrom: Map<string, string>,
  currentId: string,
  nodeMap: Map<string, CampusNode>,
  startNode: CampusNode,
  endNode: CampusNode
): CalculatedRoute {
  const path: string[] = [currentId];
  let curr = currentId;

  while (cameFrom.has(curr)) {
    curr = cameFrom.get(curr)!;
    path.unshift(curr);
  }

  // If path doesn't start at startNode (e.g. unreachable), fallback
  if (path[0] !== startNode.id) {
    path.length = 0;
    path.push(startNode.id, endNode.id);
  }

  const pathNodes = path.map((id) => nodeMap.get(id)!).filter(Boolean);
  const pathCoordinates: RoutePoint[] = pathNodes.map((n) => ({
    x: n.x,
    y: n.y,
    nodeId: n.id,
    name: n.name,
  }));

  // Calculate total distance by edge weights or point distances
  let totalDistanceMeters = 0;
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromId = pathNodes[i].id;
    const toId = pathNodes[i + 1].id;
    const edge = campusEdges.find(
      (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (edge) {
      totalDistanceMeters += edge.weight;
    } else {
      const dx = pathNodes[i + 1].x - pathNodes[i].x;
      const dy = pathNodes[i + 1].y - pathNodes[i].y;
      totalDistanceMeters += Math.round(Math.sqrt(dx * dx + dy * dy));
    }
  }

  // Walking speed: ~80 meters per minute (approx 4.8 km/h)
  const estimatedMinutes = Math.max(1, Math.round(totalDistanceMeters / 80));

  // Generate Turn-By-Turn Instructions
  const instructions: TurnByTurnInstruction[] = [];
  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    if (i === 0) {
      instructions.push({
        step: 1,
        instruction: `Depart from ${node.name}`,
        distanceMeters: 0,
        nodeId: node.id,
        targetName: node.name,
        iconType: 'depart',
      });
    } else if (i === pathNodes.length - 1) {
      instructions.push({
        step: i + 1,
        instruction: `Arrive at destination: ${node.name}`,
        distanceMeters: totalDistanceMeters,
        nodeId: node.id,
        targetName: node.name,
        iconType: 'arrive',
      });
    } else {
      const prev = pathNodes[i - 1];
      const next = pathNodes[i + 1];

      // Calculate turn angle
      const angle1 = Math.atan2(node.y - prev.y, node.x - prev.x);
      const angle2 = Math.atan2(next.y - node.y, next.x - node.x);
      let diffAngle = (angle2 - angle1) * (180 / Math.PI);
      while (diffAngle > 180) diffAngle -= 360;
      while (diffAngle < -180) diffAngle += 360;

      let iconType: 'straight' | 'turn-left' | 'turn-right' = 'straight';
      let directionWord = 'Continue straight along pathway';

      if (diffAngle < -25) {
        iconType = 'turn-left';
        directionWord = 'Turn left past';
      } else if (diffAngle > 25) {
        iconType = 'turn-right';
        directionWord = 'Turn right towards';
      }

      instructions.push({
        step: i + 1,
        instruction: `${directionWord} ${node.name}`,
        distanceMeters: Math.round((i / (pathNodes.length - 1)) * totalDistanceMeters),
        nodeId: node.id,
        targetName: node.name,
        iconType,
      });
    }
  }

  // Check if destination is a known lab
  let destinationRoom: string | undefined;
  let destinationFloor: string | undefined;
  for (const lab of Object.values(labDestinationMap)) {
    if (lab.nodeId === endNode.id) {
      destinationRoom = lab.room;
      destinationFloor = lab.floor;
      break;
    }
  }

  return {
    sourceNodeId: startNode.id,
    destinationNodeId: endNode.id,
    sourceName: startNode.name,
    destinationName: endNode.name,
    destinationBuildingName: endNode.name,
    destinationRoom,
    destinationFloor,
    pathNodeIds: path,
    pathNodes,
    pathCoordinates,
    totalDistanceMeters,
    estimatedMinutes,
    instructions,
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
  if (coords.length === 1 || progressRatio <= 0) {
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
