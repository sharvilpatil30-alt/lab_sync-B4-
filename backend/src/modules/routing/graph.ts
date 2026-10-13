export interface RouteNode {
  id: string;
  code?: string;
  name: string;
  subName?: string;
  shortName?: string;
  fullName: string;
  displayName?: string;
  description: string;
  subtext?: string;
  x: number;
  y: number;
  floor: 'ground' | 'first' | 'transition';
  wing?: 'north' | 'south' | 'pg' | 'central';
  type: 'entrance' | 'building' | 'lab' | 'junction' | 'stairwell';
  isLab?: boolean;
}

export interface RouteEdge {
  from: string;
  to: string;
  weight: number;
}

export interface LabDestination {
  id: string;
  nodeId: string;
  code: string;
  name: string;
  fullName: string;
  displayName: string;
  floor: 'ground' | 'first';
  wing: 'north' | 'south' | 'pg';
}

export const CSE_START_NODE_ID = 'node_cse_porch';

export const CSE_NODES: RouteNode[] = [
  // Central Wayfinding Corridor
  {
    id: 'node_cse_porch',
    code: 'PORCH',
    name: 'CSE PORCH',
    shortName: 'CSE PORCH',
    fullName: 'CSE PORCH (Department Porch Entrance)',
    displayName: 'CSE PORCH',
    description: 'Start journey from CSE Department Porch entrance',
    subtext: 'Department Entrance · Main Building 2',
    x: 245,
    y: 360,
    floor: 'ground',
    type: 'entrance',
  },
  {
    id: 'node_main_entrance',
    code: 'ENTRANCE',
    name: 'Main Entrance Hall',
    shortName: 'Main Entrance',
    fullName: 'Main Entrance Hallway',
    displayName: 'Main Entrance Hallway',
    description: 'Traverse corridor waypoint: Main Entrance Hallway',
    x: 350,
    y: 360,
    floor: 'ground',
    type: 'junction',
  },
  {
    id: 'node_central_stairwell',
    code: 'STAIRS',
    name: 'Central Stairwell',
    shortName: 'Central Stairwell',
    fullName: 'Central Stairwell (to 1st Floor)',
    displayName: 'Central Stairwell (to 1st Floor)',
    description: 'Traverse corridor waypoint: Central Stairwell (to 1st Floor)',
    x: 500,
    y: 360,
    floor: 'transition',
    type: 'stairwell',
  },
  {
    id: 'node_first_floor_corridor',
    code: '1F_CORRIDOR',
    name: '1st Floor Corridor',
    shortName: '1st Floor Corridor',
    fullName: 'First Floor PG Wing Corridor',
    displayName: 'First Floor PG Wing Corridor',
    description: 'Traverse corridor waypoint: First Floor PG Wing Corridor',
    x: 640,
    y: 360,
    floor: 'first',
    type: 'junction',
  },

  // Junction Corridors
  {
    id: 'node_north_corridor',
    name: 'North Corridor',
    shortName: 'North Corridor',
    fullName: 'North Corridor',
    displayName: 'North Corridor',
    description: 'Traverse corridor waypoint: North Corridor',
    x: 465,
    y: 230,
    floor: 'ground',
    type: 'junction',
  },
  {
    id: 'node_south_corridor',
    name: 'South Corridor',
    shortName: 'South Corridor',
    fullName: 'South Corridor',
    displayName: 'South Corridor',
    description: 'Traverse corridor waypoint: South Corridor',
    x: 465,
    y: 485,
    floor: 'ground',
    type: 'junction',
  },

  // Ground Floor North Labs (D-01 to D-06)
  {
    id: 'node_d01',
    code: 'D-01',
    name: 'D-01',
    subName: 'Linux Lab',
    fullName: 'D-01 — Linux Lab (Ground Floor)',
    displayName: 'D-01 — Linux Lab',
    description: 'Arrive at destination laboratory facility: Linux Lab',
    x: 405,
    y: 135,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d02',
    code: 'D-02',
    name: 'D-02',
    subName: 'Database Lab',
    fullName: 'D-02 — Database Lab (Ground Floor)',
    displayName: 'D-02 — Database Lab',
    description: 'Arrive at destination laboratory facility: Database Lab',
    x: 510,
    y: 135,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d03',
    code: 'D-03',
    name: 'D-03',
    subName: 'Project Lab',
    fullName: 'D-03 — Project Lab (Ground Floor)',
    displayName: 'D-03 — Project Lab',
    description: 'Arrive at destination laboratory facility: Project Lab',
    x: 615,
    y: 135,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d04',
    code: 'D-04',
    name: 'D-04',
    subName: 'App Dev Tool Lab',
    fullName: 'D-04 — App Dev Tool Lab (Ground Floor)',
    displayName: 'D-04 — App Dev Tool Lab',
    description: 'Arrive at destination laboratory facility: App Dev Tool Lab',
    x: 720,
    y: 135,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d05',
    code: 'D-05',
    name: 'D-05',
    subName: 'OS Lab',
    fullName: 'D-05 — OS Lab (Ground Floor)',
    displayName: 'D-05 — OS Lab',
    description: 'Arrive at destination laboratory facility: OS Lab',
    x: 825,
    y: 135,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d06',
    code: 'D-06',
    name: 'D-06',
    subName: 'Web Dev Lab',
    fullName: 'D-06 — Web Dev Lab (Ground Floor)',
    displayName: 'D-06 — Web Dev Lab',
    description: 'Arrive at destination laboratory facility: Web Dev Lab',
    x: 720,
    y: 240,
    floor: 'ground',
    wing: 'north',
    type: 'lab',
    isLab: true,
  },

  // Ground Floor South Labs (D-07 to D-09, D-12)
  {
    id: 'node_d07',
    code: 'D-07',
    name: 'D-07',
    subName: 'Network Lab',
    fullName: 'D-07 — Network Lab (Ground Floor)',
    displayName: 'D-07 — Network Lab',
    description: 'Arrive at destination laboratory facility: Network Lab',
    x: 405,
    y: 585,
    floor: 'ground',
    wing: 'south',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d08',
    code: 'D-08',
    name: 'D-08',
    subName: 'AI & ML Lab',
    fullName: 'D-08 — AI & ML Lab (Ground Floor)',
    displayName: 'D-08 — AI & ML Lab',
    description: 'Arrive at destination laboratory facility: AI & ML Lab',
    x: 525,
    y: 585,
    floor: 'ground',
    wing: 'south',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d09',
    code: 'D-09',
    name: 'D-09',
    subName: 'Apple Center',
    fullName: 'D-09 — Apple Center (Ground Floor)',
    displayName: 'D-09 — Apple Center',
    description: 'Arrive at destination laboratory facility: Apple Center',
    x: 645,
    y: 585,
    floor: 'ground',
    wing: 'south',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d12',
    code: 'D-12',
    name: 'D-12',
    subName: 'AR/VR Lab',
    fullName: 'D-12 — AR/VR Lab (Ground Floor)',
    displayName: 'D-12 — AR/VR Lab',
    description: 'Arrive at destination laboratory facility: AR/VR Lab',
    x: 765,
    y: 585,
    floor: 'ground',
    wing: 'south',
    type: 'lab',
    isLab: true,
  },

  // First Floor PG Research Wing (D-10, D-11)
  {
    id: 'node_d10',
    code: 'D-10',
    name: 'D-10',
    subName: 'PG Lab-1',
    fullName: 'D-10 — PG laboratory-1 (First Floor)',
    displayName: 'D-10 — PG laboratory-1',
    description: 'Arrive at destination laboratory facility',
    x: 770,
    y: 300,
    floor: 'first',
    wing: 'pg',
    type: 'lab',
    isLab: true,
  },
  {
    id: 'node_d11',
    code: 'D-11',
    name: 'D-11',
    subName: 'PG Lab-2',
    fullName: 'D-11 — PG Lab-2 (First Floor)',
    displayName: 'D-11 — PG Lab-2',
    description: 'Arrive at destination laboratory facility',
    x: 770,
    y: 430,
    floor: 'first',
    wing: 'pg',
    type: 'lab',
    isLab: true,
  },
];

export const CSE_EDGES: RouteEdge[] = [
  // Central corridor spine
  { from: 'node_cse_porch', to: 'node_main_entrance', weight: 12 },
  { from: 'node_main_entrance', to: 'node_central_stairwell', weight: 16 },
  { from: 'node_central_stairwell', to: 'node_first_floor_corridor', weight: 14 },

  // First Floor Wing
  { from: 'node_first_floor_corridor', to: 'node_d10', weight: 12 },
  { from: 'node_first_floor_corridor', to: 'node_d11', weight: 12 },

  // North Corridor Connections
  { from: 'node_main_entrance', to: 'node_north_corridor', weight: 15 },
  { from: 'node_central_stairwell', to: 'node_north_corridor', weight: 14 },
  { from: 'node_north_corridor', to: 'node_d01', weight: 10 },
  { from: 'node_north_corridor', to: 'node_d02', weight: 10 },
  { from: 'node_north_corridor', to: 'node_d03', weight: 12 },
  { from: 'node_north_corridor', to: 'node_d04', weight: 14 },
  { from: 'node_north_corridor', to: 'node_d05', weight: 18 },
  { from: 'node_north_corridor', to: 'node_d06', weight: 10 },

  // South Corridor Connections
  { from: 'node_central_stairwell', to: 'node_south_corridor', weight: 14 },
  { from: 'node_main_entrance', to: 'node_south_corridor', weight: 16 },
  { from: 'node_south_corridor', to: 'node_d07', weight: 10 },
  { from: 'node_south_corridor', to: 'node_d08', weight: 10 },
  { from: 'node_south_corridor', to: 'node_d09', weight: 12 },
  { from: 'node_south_corridor', to: 'node_d12', weight: 15 },
];

export const CSE_LAB_DESTINATIONS: LabDestination[] = CSE_NODES.filter(
  (n) => n.isLab
).map((n) => ({
  id: n.id,
  nodeId: n.id,
  code: n.code || n.name,
  name: n.name,
  fullName: n.fullName,
  displayName: n.displayName || n.fullName,
  floor: n.floor as 'ground' | 'first',
  wing: (n.wing || 'north') as 'north' | 'south' | 'pg',
}));

// Build bidirectional adjacency list
export function getAdjacencyList(): Record<string, { node: string; weight: number }[]> {
  const adj: Record<string, { node: string; weight: number }[]> = {};
  CSE_NODES.forEach((n) => {
    adj[n.id] = [];
  });
  CSE_EDGES.forEach((e) => {
    if (adj[e.from]) adj[e.from].push({ node: e.to, weight: e.weight });
    if (adj[e.to]) adj[e.to].push({ node: e.from, weight: e.weight });
  });
  return adj;
}

export function getNodeById(id: string): RouteNode | undefined {
  return CSE_NODES.find(
    (n) => n.id === id || n.code === id || n.fullName === id || n.displayName === id
  );
}

export function resolveNodeId(identifier: string): string | null {
  if (!identifier) return null;
  const normalized = identifier.trim().toLowerCase();
  const direct = CSE_NODES.find(
    (n) =>
      n.id.toLowerCase() === normalized ||
      (n.code && n.code.toLowerCase() === normalized) ||
      (n.displayName && n.displayName.toLowerCase().includes(normalized)) ||
      (n.fullName && n.fullName.toLowerCase().includes(normalized))
  );
  if (direct) return direct.id;

  // Handle common mappings like D-10, lab_d10, D10, etc.
  const match = normalized.match(/d-?(\d+)/);
  if (match) {
    const num = match[1].padStart(2, '0');
    const byCode = CSE_NODES.find((n) => n.code === `D-${num}`);
    if (byCode) return byCode.id;
  }

  return null;
}
