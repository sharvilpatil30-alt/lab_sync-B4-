import {
  ISchedulingDataProvider,
  ResourceRecord,
  BookingRecord,
} from './types.js';
import { pool, getPostgresPool } from '../../config/postgres.js';

/**
 * Concrete PostgreSQL implementation querying 001_core.sql schema.
 * Strictly read-only for Team A — does NOT insert or update bookings.
 */
export class PostgresSchedulingDataProvider implements ISchedulingDataProvider {
  async getResource(resourceId: string): Promise<ResourceRecord | null> {
    const res = await pool.query(
      `SELECT id, lab_id, label, state, version
       FROM public.resources
       WHERE id = $1`,
      [resourceId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      lab_id: row.lab_id,
      label: row.label,
      state: row.state,
      version: row.version,
    };
  }

  async getActiveBookingsForResource(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BookingRecord[]> {
    // Overlapping condition: start_at < requestedEndTime AND end_at > requestedStartTime
    // Strictly checks authoritative active/leased/confirmed bookings as defined in 001_core.sql GiST constraint.
    const res = await pool.query(
      `SELECT id, user_id, lab_id, resource_id, state, start_at, end_at, priority
       FROM public.bookings
       WHERE resource_id = $1
         AND state IN ('LEASED', 'CONFIRMED', 'ACTIVE')
         AND start_at < $2
         AND end_at > $3
       ORDER BY start_at ASC`,
      [resourceId, endTime.toISOString(), startTime.toISOString()]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      lab_id: row.lab_id,
      resource_id: row.resource_id,
      state: row.state,
      start_at: new Date(row.start_at),
      end_at: new Date(row.end_at),
      priority: row.priority,
    }));
  }
}

/**
 * In-memory provider for deterministic unit testing, local previews,
 * and environments where PostgreSQL is not directly accessible.
 */
export class InMemorySchedulingDataProvider implements ISchedulingDataProvider {
  private resources: Map<string, ResourceRecord> = new Map();
  private bookings: BookingRecord[] = [];

  constructor(initialResources: ResourceRecord[] = [], initialBookings: BookingRecord[] = []) {
    for (const r of initialResources) {
      this.resources.set(r.id, { ...r });
    }
    this.bookings = initialBookings.map((b) => ({ ...b }));
  }

  public setResource(resource: ResourceRecord): void {
    this.resources.set(resource.id, { ...resource });
  }

  public removeResource(resourceId: string): void {
    this.resources.delete(resourceId);
  }

  public addBooking(booking: BookingRecord): void {
    this.bookings.push({ ...booking });
  }

  public clearBookings(): void {
    this.bookings = [];
  }

  public getAllBookings(): BookingRecord[] {
    return [...this.bookings];
  }

  async getResource(resourceId: string): Promise<ResourceRecord | null> {
    const r = this.resources.get(resourceId);
    return r ? { ...r } : null;
  }

  async getActiveBookingsForResource(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BookingRecord[]> {
    const reqStartMs = startTime.getTime();
    const reqEndMs = endTime.getTime();

    const activeStates = new Set(['LEASED', 'CONFIRMED', 'ACTIVE']);

    return this.bookings
      .filter((b) => {
        if (b.resource_id !== resourceId) return false;
        if (!activeStates.has(b.state)) return false;

        const bStartMs = b.start_at.getTime();
        const bEndMs = b.end_at.getTime();

        // Standard half-open interval overlap [start, end)
        return Math.max(reqStartMs, bStartMs) < Math.min(reqEndMs, bEndMs);
      })
      .map((b) => ({ ...b }));
  }
}

// Global default provider
let defaultProvider: ISchedulingDataProvider | null = null;

export function getDefaultDataProvider(): ISchedulingDataProvider {
  if (defaultProvider) {
    return defaultProvider;
  }

  if (process.env.DATABASE_URL && getPostgresPool()) {
    defaultProvider = new PostgresSchedulingDataProvider();
  } else {
    // Default demo in-memory dataset seeded with canonical resources
    defaultProvider = new InMemorySchedulingDataProvider([
      {
        id: '11111111-1111-4111-8111-111111111111',
        lab_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        label: 'D01-PC-01',
        state: 'AVAILABLE',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        lab_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        label: 'D01-PC-02',
        state: 'AVAILABLE',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        lab_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        label: 'D05-PC-01',
        state: 'MAINTENANCE',
      },
    ]);
  }

  return defaultProvider;
}

export function setDefaultDataProvider(provider: ISchedulingDataProvider): void {
  defaultProvider = provider;
}

