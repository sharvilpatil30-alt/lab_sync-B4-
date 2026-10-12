/**
 * Smart Campus Lab & Resource Optimizer
 * Supabase Data Models & Authoritative Schema Type Definitions
 */

export type UserRole = 'student' | 'faculty' | 'lab_admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export type NodeType = 'lab' | 'building' | 'landmark';

export interface CampusNode {
  id: string;
  name: string;
  node_type: NodeType;
  created_at?: string;
}

export interface CampusEdge {
  id: string;
  from_node: string;
  to_node: string;
  distance_m: number;
  weight: number;
  created_at?: string;
}

export interface Lab {
  id: string;
  name: string;
  node_id?: string;
  capacity: number;
  lab_code?: string;
  investment?: number;
}

export type ResourceState = 'AVAILABLE' | 'RESERVED' | 'ALLOCATED' | 'RELEASING' | 'MAINTENANCE';

export interface Resource {
  id: string;
  lab_id: string;
  label: string;
  state: ResourceState;
  version: number;
  batch_id?: string;
  serial_no?: string;
  updated_at: string;
}

export type BookingState =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'QUEUED'
  | 'LEASED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPENSATION_REQUIRED';

export interface Booking {
  id: string;
  user_id: string;
  lab_id: string;
  resource_id?: string;
  state: BookingState;
  priority: number; // 0=lab_admin, 1=faculty, 2=student
  start_at: string;
  end_at: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export type SchedulingPolicy = 'FCFS' | 'SJF' | 'ROUND_ROBIN' | 'PRIORITY';
export type SchedulingDecisionType = 'ALLOCATED' | 'WAITLISTED' | 'REJECTED';

export interface SchedulingDecision {
  id: string;
  booking_id: string;
  request_id: string;
  policy: SchedulingPolicy;
  decision: SchedulingDecisionType;
  lease_id?: string;
  metrics?: Record<string, any>;
  created_at: string;
}

export type RoutingAlgorithm = 'DIJKSTRA' | 'BELLMAN_FORD';

export interface RouteRecord {
  id: string;
  booking_id?: string;
  origin_node?: string;
  destination_node?: string;
  algorithm: RoutingAlgorithm;
  path: string[]; // sequence of node ids or names
  cost: number;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id?: string;
  action: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  correlation_id: string;
  created_at: string;
}

// 3NF Dead-stock & Inventory Extension
export interface EquipmentCategory {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
}

export interface EquipmentModel {
  id: string;
  category_id: string;
  brand?: string;
  model_name: string;
  config_key: string;
}

export interface PurchaseBatch {
  id: string;
  acquisition_lab_id: string;
  model_id: string;
  supplier_id?: string;
  register_sr_no: string;
  purchase_date?: string;
  reference_no?: string;
  quantity_original: number;
  quantity_current: number;
  unit_rate?: number;
  total_cost?: number;
  status?: string;
  source_file: string;
  source_page: number;
  source_description?: string;
}

export type AssetEventType =
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'WRITEOFF'
  | 'CONDITION_CHANGE'
  | 'GIFT_RECEIVED'
  | 'INSPECTION_OK';

export interface AssetEvent {
  id: string;
  batch_id: string;
  event_type: AssetEventType;
  quantity_change: number;
  from_lab_id?: string;
  to_lab_id?: string;
  event_date?: string;
  details?: string;
  created_at: string;
}

// DFD Constraint Verification Models
export interface DFDConstraintRule {
  id: string;
  name: string;
  targetEntity: string;
  description: string;
  sourceTeam: 'Scheduling & Queue Service' | 'Campus Spatial Routing' | 'Persistence & ACID Engine' | 'Interface Gateway';
  passed: boolean;
  message: string;
  executionTimeMs: number;
  evidence?: Record<string, any>;
}

export interface DFDVerificationReport {
  timestamp: string;
  overallStatus: 'PASSED' | 'FAILED';
  totalConstraints: number;
  passedCount: number;
  failedCount: number;
  pipelineLatencyMs: number;
  constraints: DFDConstraintRule[];
  sampleTransactionId?: string;
}
