import type { CampusNode, CampusEdge, CampusBuilding } from '../data/campusMapData';

export interface CseNode {
  id: string;
  nodeId?: string;
  code?: string;
  name: string;
  displayName?: string;
  fullName?: string;
  subName?: string;
  description?: string;
  x: number;
  y: number;
  floor: string;
  type: string;
}
export interface CseGraph {
  startNodeId: string;
  nodes: CseNode[];
  edges: CampusEdge[];
}
export interface LabMapEntry {
  nodeId: string;
  buildingId: string;
  room: string;
  floor: string;
  department: string;
  displayName: string;
}
export const floorName = (floor: string) => floor === 'first' ? 'First Floor' : floor === 'ground' ? 'Ground Floor' : 'Stairwell';

// Exact identifiers and explicit lab-code aliases only. Database UUIDs must be
// resolved through the lab API; never infer a lab from its ordinal or display text.
export function resolveCseNode(value: unknown, nodes: CseNode[]): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().toLowerCase();
  const exact = nodes.find(n => [n.id, n.nodeId, n.code, n.displayName, n.fullName].some(v => v?.toLowerCase() === key));
  if (exact) return exact.id;
  const match = /^(?:lab_)?d-?(\d{1,2})$/.exec(key);
  return match ? nodes.find(n => n.code?.toLowerCase() === `d-${match[1].padStart(2, '0')}`)?.id ?? null : null;
}

export function resolveLabNode(lab: unknown, nodes: CseNode[]): string | null {
  if (typeof lab === 'string') return resolveCseNode(lab, nodes);
  if (!lab || typeof lab !== 'object') return null;
  const row = lab as Record<string, unknown>;
  for (const key of ['nodeId', 'node_id', 'lab_code', 'labId', 'id']) {
    const match = resolveCseNode(row[key], nodes);
    if (match) return match;
  }
  return null;
}

export function validateGraph(raw: unknown): CseGraph {
  const graph = raw as CseGraph;
  if (!graph || !Array.isArray(graph.nodes) || !graph.nodes.length || !Array.isArray(graph.edges) ||
      !graph.nodes.every(n => typeof n.id === 'string' && typeof n.name === 'string' &&
        typeof n.floor === 'string' && typeof n.type === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y)) ||
      new Set(graph.nodes.map(n => n.id)).size !== graph.nodes.length ||
      !graph.nodes.some(n => n.id === graph.startNodeId) ||
      !graph.edges.every(e => Number.isFinite(e.weight) && e.weight >= 0 &&
        graph.nodes.some(n => n.id === e.from) && graph.nodes.some(n => n.id === e.to))) {
    throw new Error('The routing server returned an incomplete CSE map. Please reload or contact support.');
  }
  return graph;
}

// Feed the existing Team D SVG/card renderers with actual CSE locations. Canvas
// coordinates are schematic; walking distances always come from graph weights.
export function toCampusMap(graph: CseGraph) {
  const nodes: CampusNode[] = graph.nodes.map(n => ({
    ...n, name: n.displayName || n.name,
    type: n.type.toLowerCase() === 'lab' ? 'building' : n.type.toLowerCase() === 'entrance' ? 'entrance' : 'junction',
  }));
  const labs = graph.nodes.filter(n => n.type.toLowerCase() === 'lab');
  const buildings: CampusBuilding[] = labs.map(n => ({
    id: n.id, code: n.code || n.name, name: n.displayName || n.name,
    shortName: n.subName || n.name, department: floorName(n.floor),
    x: n.x - 49, y: n.y - 78, width: 98, height: 78,
    entranceNodeId: n.id, type: 'academic', floors: n.floor === 'first' ? 2 : 1,
    labIds: [n.id], description: n.description || n.name,
  }));
  const labDestinationMap: Record<string, LabMapEntry> = Object.fromEntries(labs.map(n => [n.id, {
    nodeId: n.id, buildingId: n.id, room: n.code || n.name,
    floor: floorName(n.floor), department: 'Computer Science & Engineering',
    displayName: n.displayName || n.name,
  }]));
  return { nodes, edges: graph.edges, buildings, labDestinationMap };
}
