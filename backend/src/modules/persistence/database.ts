/**
 * Persistence Engine & Authoritative Database
 * Implements the Supabase schema, table constraints, atomic commit_booking transaction,
 * and compensate_booking saga rollback.
 */

import {
  Profile,
  CampusNode,
  CampusEdge,
  Lab,
  Resource,
  Booking,
  SchedulingDecision,
  RouteRecord,
  AuditLogRecord,
  EquipmentCategory,
  Supplier,
  EquipmentModel,
  PurchaseBatch,
  AssetEvent,
} from '../../types/dfd.types.js';
import {
  INITIAL_COMPUTER_BATCHES,
  INITIAL_EQUIPMENT_MODELS,
} from '../inventory/inventoryData.js';

class CampusDatabase {
  // Operational tables
  public profiles: Map<string, Profile> = new Map();
  public campusNodes: Map<string, CampusNode> = new Map();
  public campusEdges: Map<string, CampusEdge> = new Map();
  public labs: Map<string, Lab> = new Map();
  public resources: Map<string, Resource> = new Map();
  public bookings: Map<string, Booking> = new Map();
  public schedulingDecisions: Map<string, SchedulingDecision> = new Map();
  public routes: Map<string, RouteRecord> = new Map();
  public auditLog: AuditLogRecord[] = [];

  // 3NF Dead-stock & Inventory Extension tables
  public equipmentCategories: Map<string, EquipmentCategory> = new Map();
  public suppliers: Map<string, Supplier> = new Map();
  public equipmentModels: Map<string, EquipmentModel> = new Map();
  public purchaseBatches: Map<string, PurchaseBatch> = new Map();
  public assetEvents: Map<string, AssetEvent> = new Map();

  // Secondary index for idempotency keys (DFD Constraint C1)
  private idempotencyIndex: Map<string, string> = new Map(); // idempotency_key -> booking_id

  constructor() {
    this.seedInitialData();
  }

  /**
   * Pre-seeds initial authoritative data matching the campus graph and 3NF inventory
   */
  public seedInitialData(): void {
    // 1. Profiles
    const defaultProfiles: Profile[] = [
      { id: 'usr-student-01', full_name: 'Anya Bandgar', role: 'student', created_at: new Date().toISOString() },
      { id: 'usr-faculty-01', full_name: 'Prof. Rajesh Kulkarni', role: 'faculty', created_at: new Date().toISOString() },
      { id: 'usr-admin-01', full_name: 'Dr. Vikramaditya (Lab Head)', role: 'lab_admin', created_at: new Date().toISOString() },
    ];
    defaultProfiles.forEach((p) => this.profiles.set(p.id, p));

    // 2. Campus Nodes (Spatial Graph)
    const nodes: CampusNode[] = [
      { id: 'node-main-gate', name: 'Main Campus Gate', node_type: 'landmark' },
      { id: 'node-cs-building', name: 'Computer Science Building', node_type: 'building' },
      { id: 'node-lab-ai', name: 'AI & Deep Learning Lab (Room 301)', node_type: 'lab' },
      { id: 'node-lab-systems', name: 'Systems & OS Lab (Room 204)', node_type: 'lab' },
      { id: 'node-lab-networks', name: 'Advanced Networking Lab (Room 108)', node_type: 'lab' },
      { id: 'node-library', name: 'Central University Library', node_type: 'building' },
    ];
    nodes.forEach((n) => this.campusNodes.set(n.id, n));

    // 3. Campus Edges (Weighted Graph)
    const edges: CampusEdge[] = [
      { id: 'edge-1', from_node: 'node-main-gate', to_node: 'node-cs-building', distance_m: 120, weight: 1.0 },
      { id: 'edge-2', from_node: 'node-cs-building', to_node: 'node-lab-ai', distance_m: 45, weight: 1.2 },
      { id: 'edge-3', from_node: 'node-cs-building', to_node: 'node-lab-systems', distance_m: 30, weight: 1.0 },
      { id: 'edge-4', from_node: 'node-cs-building', to_node: 'node-lab-networks', distance_m: 25, weight: 1.0 },
      { id: 'edge-5', from_node: 'node-main-gate', to_node: 'node-library', distance_m: 90, weight: 1.0 },
      { id: 'edge-6', from_node: 'node-library', to_node: 'node-cs-building', distance_m: 60, weight: 1.1 },
    ];
    edges.forEach((e) => this.campusEdges.set(e.id, e));

    // 4. Labs (Populated from Department Laboratories D-01 through D-12 from Official Inventory Master)
    const departmentalLabs: Lab[] = [
      { id: 'lab-d01', name: 'Linux Laboratory', lab_code: 'D-01', node_id: 'node-lab-systems', capacity: 42, investment: 1419544.04 },
      { id: 'lab-d02', name: 'Database Laboratory', lab_code: 'D-02', node_id: 'node-lab-systems', capacity: 46, investment: 3601318.0 },
      { id: 'lab-d03', name: 'Project Laboratory', lab_code: 'D-03', node_id: 'node-lab-systems', capacity: 49, investment: 2603775.0 },
      { id: 'lab-d04', name: 'Application Development Tool Laboratory', lab_code: 'D-04', node_id: 'node-lab-ai', capacity: 17, investment: 1459513.0 },
      { id: 'lab-d05', name: 'Operating System Laboratory', lab_code: 'D-05', node_id: 'node-lab-systems', capacity: 38, investment: 2664951.5 },
      { id: 'lab-d06', name: 'Web Development Tool Lab', lab_code: 'D-06', node_id: 'node-lab-ai', capacity: 27, investment: 2025848.99 },
      { id: 'lab-d07', name: 'Network Laboratory', lab_code: 'D-07', node_id: 'node-lab-networks', capacity: 40, investment: 2759191.89 },
      { id: 'lab-d08', name: 'Artificial Intelligence & Machine Learning Laboratory', lab_code: 'D-08', node_id: 'node-lab-ai', capacity: 50, investment: 2572968.8 },
      { id: 'lab-d09', name: 'Apple Education Center Laboratory', lab_code: 'D-09', node_id: 'node-lab-ai', capacity: 65, investment: 5470034.99 },
      { id: 'lab-d10', name: 'PG laboratory-1', lab_code: 'D-10', node_id: 'node-lab-systems', capacity: 34, investment: 1492856.0 },
      { id: 'lab-d11', name: 'PG laboratory-2', lab_code: 'D-11', node_id: 'node-lab-systems', capacity: 24, investment: 2083780.0 },
      { id: 'lab-d12', name: 'Augmented Reality/ Virtual Reality Laboratory (ARVR LAB)', lab_code: 'D-12', node_id: 'node-lab-ai', capacity: 30, investment: 6046650.0 },
    ];
    departmentalLabs.forEach((l) => this.labs.set(l.id, l));

    // 5. 3NF Categories (Master CAT01 through CAT07)
    const masterCategories: EquipmentCategory[] = [
      { id: 'CAT01', name: 'Computers' },
      { id: 'CAT02', name: 'Laptop' },
      { id: 'CAT03', name: 'Printer' },
      { id: 'CAT04', name: 'UPS' },
      { id: 'CAT05', name: 'Battery' },
      { id: 'CAT06', name: 'LCD Projector' },
      { id: 'CAT07', name: 'Interactive Panel' },
    ];
    masterCategories.forEach((c) => this.equipmentCategories.set(c.id, c));

    // Suppliers Master
    const suppliers: Supplier[] = [
      {
        id: 'sup-veetrag',
        name: 'Veetrag Computers Private Ltd.',
        gstin: '27AABCV1234F1Z8',
        address: 'Veetrag Chambers, Pune, Maharashtra, India',
      },
      {
        id: 'sup-aegis',
        name: 'Aegis Infotech Private Limited',
        gstin: '27AABCA5678G2Z1',
        address: 'Aegis House, Mumbai, Maharashtra, India',
      },
      {
        id: 'sup-direct',
        name: 'Direct Equipment Supplier / OEM',
        address: 'Industrial Area, India',
      },
    ];
    suppliers.forEach((s) => this.suppliers.set(s.id, s));

    // 55 Normalized Equipment Models
    INITIAL_EQUIPMENT_MODELS.forEach((m) => {
      this.equipmentModels.set(m.model_id, {
        id: m.model_id,
        category_id: m.category_id,
        brand: m.brand,
        model_name: m.model_name,
        config_key: m.configuration_summary || `${m.brand}-${m.model_name}`,
      });
    });

    // 28 Computer Purchase Batches (BAT0005 - BAT0032)
    INITIAL_COMPUTER_BATCHES.forEach((b) => {
      const targetLabId = departmentalLabs.find((l) => l.lab_code === b.lab_code)?.id || 'lab-d01';
      const supplierId = b.supplier_name.includes('Aegis') ? 'sup-aegis' : 'sup-veetrag';

      this.purchaseBatches.set(b.batch_id, {
        id: b.batch_id,
        acquisition_lab_id: targetLabId,
        model_id: 'MOD004', // default computer model
        supplier_id: supplierId,
        register_sr_no: b.dead_stock_sr_no,
        purchase_date: b.purchase_date,
        reference_no: `PO-${b.batch_id}-${b.lab_code}`,
        quantity_original: b.quantity_original,
        quantity_current: b.quantity_current,
        unit_rate: b.unit_rate,
        total_cost: b.total_cost,
        status: b.status,
        source_file: 'DeadStock_Register_Computers.xlsx',
        source_page: parseInt(b.dead_stock_sr_no, 10) || 1,
        source_description: b.raw_description,
      });

      // Seed resources representing systems in this batch
      const sysCount = Math.min(b.quantity_current, 3); // Seed sample live workstation entities
      for (let i = 1; i <= sysCount; i++) {
        const resId = `res-${b.batch_id.toLowerCase()}-${i}`;
        const serialNo = b.serial_numbers_list[i - 1] || `SN-${b.brand.toUpperCase()}-${b.batch_id}-${i}`;
        this.resources.set(resId, {
          id: resId,
          lab_id: targetLabId,
          label: `${b.lab_code}-PC-${String(i).padStart(2, '0')} (${b.model_name})`,
          state: 'AVAILABLE',
          version: 1,
          batch_id: b.batch_id,
          serial_no: serialNo,
          updated_at: new Date().toISOString(),
        });
      }
    });

    // 6. Resources
    const sampleResources: Resource[] = [
      {
        id: 'res-ai-gpu-01',
        lab_id: 'lab-ai-301',
        label: 'AI-WS-01 (RTX 4080)',
        state: 'AVAILABLE',
        version: 1,
        batch_id: 'batch-2026-cse-01',
        serial_no: 'SN-DELL-98214-A',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'res-ai-gpu-02',
        lab_id: 'lab-ai-301',
        label: 'AI-WS-02 (RTX 4080)',
        state: 'AVAILABLE',
        version: 1,
        batch_id: 'batch-2026-cse-01',
        serial_no: 'SN-DELL-98214-B',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'res-sys-ws-01',
        lab_id: 'lab-sys-204',
        label: 'SYS-WS-01 (Linux Dev)',
        state: 'AVAILABLE',
        version: 1,
        serial_no: 'SN-SYS-33011-C',
        updated_at: new Date().toISOString(),
      },
    ];
    sampleResources.forEach((r) => this.resources.set(r.id, r));
  }

  // ============================================================
  // DFD Constraint Checks & Transactional Operations
  // ============================================================

  /**
   * Checks if an idempotency key is already used (DFD Flow 1 & C1)
   */
  public checkIdempotency(idempotencyKey: string): Booking | null {
    const existingId = this.idempotencyIndex.get(idempotencyKey);
    if (existingId && this.bookings.has(existingId)) {
      return this.bookings.get(existingId)!;
    }
    return null;
  }

  /**
   * Atomically commits a booking according to the exact Supabase plpgsql procedure:
   * commit_booking(p_booking_id, p_resource_id, p_decision, p_lease_id, p_request_id,
   *                p_policy, p_metrics, p_route, p_route_cost, p_algorithm,
   *                p_origin_node, p_destination_node, p_actor_id, p_correlation_id)
   */
  public commitBooking(params: {
    bookingId: string;
    resourceId?: string;
    decision: 'ALLOCATED' | 'WAITLISTED' | 'REJECTED';
    leaseId?: string;
    requestId: string;
    policy: 'FCFS' | 'SJF' | 'ROUND_ROBIN' | 'PRIORITY';
    metrics?: Record<string, any>;
    routePath?: string[];
    routeCost?: number;
    algorithm?: 'DIJKSTRA' | 'BELLMAN_FORD';
    originNode?: string;
    destinationNode?: string;
    actorId?: string;
    correlationId: string;
  }): { success: boolean; error?: string } {
    const booking = this.bookings.get(params.bookingId);
    if (!booking) {
      return { success: false, error: `Booking ${params.bookingId} not found` };
    }

    // Verify resource exists if allocated
    let resource: Resource | undefined;
    if (params.decision === 'ALLOCATED') {
      if (!params.resourceId) {
        return { success: false, error: 'Allocation decision requires a valid resourceId' };
      }
      resource = this.resources.get(params.resourceId);
      if (!resource) {
        return { success: false, error: `Resource ${params.resourceId} not found` };
      }
      if (resource.state !== 'AVAILABLE' && resource.state !== 'RESERVED') {
        return {
          success: false,
          error: `Resource ${params.resourceId} cannot be allocated: current state is ${resource.state}`,
        };
      }
    }

    // Begin atomic mutation
    // 1. Update Booking state
    booking.state =
      params.decision === 'ALLOCATED'
        ? 'CONFIRMED'
        : params.decision === 'WAITLISTED'
        ? 'WAITLISTED'
        : 'REJECTED';
    booking.resource_id = params.resourceId;
    booking.updated_at = new Date().toISOString();

    // 2. Insert Scheduling Decision record
    const decisionRecord: SchedulingDecision = {
      id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      booking_id: params.bookingId,
      request_id: params.requestId,
      policy: params.policy,
      decision: params.decision,
      lease_id: params.leaseId,
      metrics: params.metrics,
      created_at: new Date().toISOString(),
    };
    this.schedulingDecisions.set(decisionRecord.id, decisionRecord);

    // 3. Update Resource State if Allocated
    if (params.decision === 'ALLOCATED' && resource) {
      resource.state = 'ALLOCATED';
      resource.version += 1;
      resource.updated_at = new Date().toISOString();
    }

    // 4. Insert Route if provided (Spatial Wayfinding Output)
    if (params.routePath && params.algorithm) {
      const routeRecord: RouteRecord = {
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        booking_id: params.bookingId,
        origin_node: params.originNode,
        destination_node: params.destinationNode,
        algorithm: params.algorithm,
        path: params.routePath,
        cost: params.routeCost || 0,
        created_at: new Date().toISOString(),
      };
      this.routes.set(routeRecord.id, routeRecord);
    }

    // 5. Insert Audit Log
    const auditRecord: AuditLogRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actor_id: params.actorId,
      action: 'BOOKING_COMMIT',
      after: {
        booking_id: params.bookingId,
        decision: params.decision,
        resource_id: params.resourceId,
        policy: params.policy,
      },
      correlation_id: params.correlationId,
      created_at: new Date().toISOString(),
    };
    this.auditLog.push(auditRecord);

    return { success: true };
  }

  /**
   * Saga Compensation Procedure:
   * compensate_booking(p_booking_id, p_resource_id, p_actor_id, p_correlation_id, p_reason)
   */
  public compensateBooking(params: {
    bookingId: string;
    resourceId?: string;
    actorId?: string;
    correlationId: string;
    reason: string;
  }): { success: boolean; error?: string } {
    const booking = this.bookings.get(params.bookingId);
    if (!booking) {
      return { success: false, error: `Booking ${params.bookingId} not found` };
    }

    booking.state = 'COMPENSATION_REQUIRED';
    booking.updated_at = new Date().toISOString();

    if (params.resourceId) {
      const resource = this.resources.get(params.resourceId);
      if (resource) {
        resource.state = 'AVAILABLE';
        resource.version += 1;
        resource.updated_at = new Date().toISOString();
      }
    }

    this.auditLog.push({
      id: `aud-comp-${Date.now()}`,
      actor_id: params.actorId,
      action: 'BOOKING_COMPENSATE',
      after: {
        booking_id: params.bookingId,
        reason: params.reason,
        resource_id: params.resourceId,
      },
      correlation_id: params.correlationId,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Creates a pending booking with strict idempotency verification
   */
  public createRequestedBooking(booking: Booking): { success: boolean; booking?: Booking; error?: string } {
    if (this.idempotencyIndex.has(booking.idempotency_key)) {
      return {
        success: false,
        error: `Idempotency constraint violation: Key '${booking.idempotency_key}' has already been processed`,
      };
    }

    this.bookings.set(booking.id, booking);
    this.idempotencyIndex.set(booking.idempotency_key, booking.id);

    return { success: true, booking };
  }
}

export const campusDb = new CampusDatabase();
