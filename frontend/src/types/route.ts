export interface RouteNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type?: 'entrance' | 'building' | 'lab' | 'junction';
}

export interface RouteEdge {
  from: string;
  to: string;
  weight: number;
}

export interface RouteResult {
  bookingId?: string;
  source: string;
  destination: string;
  nodes: RouteNode[];
  edges: RouteEdge[];
  path: string[];
  distanceMeters: number;
  estimatedTravelTimeMinutes: number;
  routeStatus: 'optimal' | 'alternative' | 'degraded' | 'unavailable';
}
