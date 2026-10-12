import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../../app.js';
import {
  evaluateBookingRequest,
  validateBookingRequest,
  compareRequestsFCFS,
} from '../fcfs.js';
import {
  InMemorySchedulingDataProvider,
  setDefaultDataProvider,
} from '../dataProvider.js';
import { schedulingMetrics } from '../metrics.js';
import { FCFSSchedulingQueue } from '../queue.js';
import { BookingRequest } from '../types.js';
import { DeadlockDetector } from '../deadlock.js';
import { LockManager } from '../lockManager.js';
import { simulatePriorityScheduling } from '../policies/priority.js';
import { simulateSJFScheduling } from '../policies/sjf.js';
import { simulateRoundRobinScheduling } from '../policies/roundRobin.js';

describe('Team A — OS Scheduling & Allocation Engine', () => {
  const resourceId1 = '11111111-1111-4111-8111-111111111111';
  const resourceId2 = '22222222-2222-4222-8222-222222222222';
  const maintenanceResourceId = '33333333-3333-4333-8333-333333333333';
  const labId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  let mockDataProvider: InMemorySchedulingDataProvider;

  beforeEach(() => {
    schedulingMetrics.reset();

    mockDataProvider = new InMemorySchedulingDataProvider(
      [
        {
          id: resourceId1,
          lab_id: labId,
          label: 'PC-01',
          state: 'AVAILABLE',
        },
        {
          id: resourceId2,
          lab_id: labId,
          label: 'PC-02',
          state: 'AVAILABLE',
        },
        {
          id: maintenanceResourceId,
          lab_id: labId,
          label: 'PC-03',
          state: 'MAINTENANCE',
        },
      ],
      []
    );

    setDefaultDataProvider(mockDataProvider);
  });

  describe('1. Input Validation and Time Intervals', () => {
    it('rejects missing or empty resourceId', () => {
      const res = validateBookingRequest({
        resourceId: '',
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_RESOURCE_ID');
    });

    it('rejects invalid non-UUID resourceId format', () => {
      const res = validateBookingRequest({
        resourceId: 'not-a-uuid-1234',
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_RESOURCE_ID');
    });

    it('rejects malformed timestamps and non-date strings', () => {
      const res = validateBookingRequest({
        resourceId: resourceId1,
        startTime: 'invalid-date',
        endTime: '2026-10-12T11:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_TIMESTAMP_FORMAT');
    });

    it('rejects timestamps without timezone offset (must be timezone-aware ISO)', () => {
      const res = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00', // Missing 'Z' or offset
        endTime: '2026-10-12T11:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_TIMESTAMP_FORMAT');
    });

    it('rejects startTime >= endTime (inverted interval)', () => {
      const res = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T14:00:00Z',
        endTime: '2026-10-12T10:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_TIME_INTERVAL');
    });

    it('rejects startTime == endTime (zero duration)', () => {
      const res = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T10:00:00Z',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_TIME_INTERVAL');
    });

    it('rejects unsupported algorithm types', () => {
      const res = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        algorithm: 'ROUND_ROBIN',
      });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'UNSUPPORTED_ALGORITHM');
    });

    it('accepts valid timezone-aware timestamps with Z or offset', () => {
      const resUTC = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
      });
      assert.equal(resUTC.valid, true);

      const resOffset = validateBookingRequest({
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00+05:30',
        endTime: '2026-10-12T11:00:00+05:30',
      });
      assert.equal(resOffset.valid, true);
    });
  });

  describe('2. Resource State and Overlap Checks', () => {
    it('accepts available resource with no conflicts', async () => {
      const decision = await evaluateBookingRequest(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T12:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );

      assert.equal(decision.decision, 'ACCEPT');
      assert.equal(decision.algorithm, 'FCFS');
      assert.ok(decision.reason.includes('available'));
    });

    it('rejects unknown/non-existent resource', async () => {
      const decision = await evaluateBookingRequest(
        {
          resourceId: '99999999-9999-4999-8999-999999999999',
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T12:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );

      assert.equal(decision.decision, 'REJECT');
      assert.ok(decision.reason.includes('not found'));
    });

    it('rejects resource in MAINTENANCE state', async () => {
      const decision = await evaluateBookingRequest(
        {
          resourceId: maintenanceResourceId,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T12:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );

      assert.equal(decision.decision, 'REJECT');
      assert.ok(decision.reason.includes('unavailable'));
    });

    it('rejects overlapping active booking (CONFIRMED)', async () => {
      // Add existing booking 10:00 to 12:00
      mockDataProvider.addBooking({
        id: 'bbbbbbbb-1111-4111-8111-111111111111',
        resource_id: resourceId1,
        user_id: 'user-01',
        lab_id: labId,
        state: 'CONFIRMED',
        start_at: new Date('2026-10-12T10:00:00Z'),
        end_at: new Date('2026-10-12T12:00:00Z'),
      });

      // Try booking 11:00 to 13:00 (overlaps)
      const decision = await evaluateBookingRequest(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T11:00:00Z',
          endTime: '2026-10-12T13:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );

      assert.equal(decision.decision, 'REJECT');
      assert.ok(decision.reason.includes('overlapping'));
    });

    it('accepts strictly adjacent bookings without overlap ([start, end) semantics)', async () => {
      // Existing booking from 10:00 to 12:00
      mockDataProvider.addBooking({
        id: 'bbbbbbbb-1111-4111-8111-111111111111',
        resource_id: resourceId1,
        user_id: 'user-01',
        lab_id: labId,
        state: 'CONFIRMED',
        start_at: new Date('2026-10-12T10:00:00Z'),
        end_at: new Date('2026-10-12T12:00:00Z'),
      });

      // Adjacent booking right before: 08:00 to 10:00
      const decisionBefore = await evaluateBookingRequest(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T08:00:00Z',
          endTime: '2026-10-12T10:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );
      assert.equal(decisionBefore.decision, 'ACCEPT');

      // Adjacent booking right after: 12:00 to 14:00
      const decisionAfter = await evaluateBookingRequest(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T12:00:00Z',
          endTime: '2026-10-12T14:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );
      assert.equal(decisionAfter.decision, 'ACCEPT');
    });

    it('respects actual cancellation statuses: CANCELLED bookings do NOT block availability', async () => {
      // Add a CANCELLED booking in the exact same slot
      mockDataProvider.addBooking({
        id: 'bbbbbbbb-cancelled',
        resource_id: resourceId1,
        user_id: 'user-02',
        lab_id: labId,
        state: 'CANCELLED',
        start_at: new Date('2026-10-12T10:00:00Z'),
        end_at: new Date('2026-10-12T12:00:00Z'),
      });

      const decision = await evaluateBookingRequest(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T12:00:00Z',
        },
        { dataProvider: mockDataProvider }
      );

      assert.equal(decision.decision, 'ACCEPT');
      assert.ok(decision.reason.includes('available'));
    });
  });

  describe('3. Deterministic FCFS Ordering and Tie-Breaking', () => {
    it('orders requests strictly by arrival timestamp', () => {
      const req1 = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        arrivalTimeMs: 100,
        requestId: 'req-b',
      };
      const req2 = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        arrivalTimeMs: 50,
        requestId: 'req-a',
      };

      const diff = compareRequestsFCFS(req1, req2);
      assert.ok(diff > 0, 'Later arrival should sort after earlier arrival');
    });

    it('breaks ties deterministically by requestId when arrival timestamps are identical', () => {
      const req1 = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        arrivalTimeMs: 100,
        requestId: 'req-02',
      };
      const req2 = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        arrivalTimeMs: 100,
        requestId: 'req-01',
      };

      const diff = compareRequestsFCFS(req1, req2);
      assert.ok(diff > 0, 'req-02 should follow req-01 lexicographically');
    });

    it('processes queued requests sequentially in FCFS queue', async () => {
      const queue = new FCFSSchedulingQueue();

      const p1 = queue.enqueue(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          requestId: 'req-1',
        },
        { dataProvider: mockDataProvider }
      );

      const p2 = queue.enqueue(
        {
          resourceId: resourceId1,
          startTime: '2026-10-12T11:00:00Z',
          endTime: '2026-10-12T12:00:00Z',
          requestId: 'req-2',
        },
        { dataProvider: mockDataProvider }
      );

      const [res1, res2] = await Promise.all([p1, p2]);
      assert.equal(res1.decision, 'ACCEPT');
      assert.equal(res2.decision, 'ACCEPT');
    });
  });

  describe('4. Repeated Previews Producing Zero Database Writes', () => {
    it('produces no database writes or record mutations across repeated preview calls', async () => {
      const initialBookingsCount = mockDataProvider.getAllBookings().length;

      for (let i = 0; i < 5; i++) {
        const decision = await evaluateBookingRequest(
          {
            resourceId: resourceId1,
            startTime: '2026-10-12T10:00:00Z',
            endTime: '2026-10-12T11:00:00Z',
          },
          { dataProvider: mockDataProvider }
        );
        assert.equal(decision.decision, 'ACCEPT');
      }

      const finalBookingsCount = mockDataProvider.getAllBookings().length;
      assert.equal(
        finalBookingsCount,
        initialBookingsCount,
        'Zero bookings must be inserted by preview/scheduling service'
      );
    });
  });

  describe('5. HTTP Preview Endpoint: POST /api/v1/scheduling/preview', () => {
    it('fails with 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .send({
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
      assert.ok(res.body.error.message);
    });

    it('fails with 403 when user has an unauthorized role', async () => {
      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-unauthorized')
        .send({
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    it('fails with 400 when input has invalid parameters', async () => {
      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: 'not-uuid',
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_RESOURCE_ID');
    });

    it('fails with 404 when resource is unknown/not found', async () => {
      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: '88888888-8888-4888-8888-888888888888',
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
    });

    it('returns 200 with ACCEPT decision for valid available resource', async () => {
      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.decision, 'ACCEPT');
      assert.equal(res.body.algorithm, 'FCFS');
      assert.ok(res.body.reason);
    });

    it('returns 200 with REJECT decision when slot is conflicted by active booking', async () => {
      mockDataProvider.addBooking({
        id: 'conflicted-slot',
        resource_id: resourceId1,
        user_id: 'user-01',
        lab_id: labId,
        state: 'CONFIRMED',
        start_at: new Date('2026-10-12T10:00:00Z'),
        end_at: new Date('2026-10-12T12:00:00Z'),
      });

      const res = await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: resourceId1,
          startTime: '2026-10-12T10:30:00Z',
          endTime: '2026-10-12T11:30:00Z',
          algorithm: 'FCFS',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.decision, 'REJECT');
      assert.equal(res.body.algorithm, 'FCFS');
      assert.ok(res.body.reason.includes('overlapping'));
    });
  });

  describe('6. HTTP Metrics Endpoint: GET /api/v1/scheduling/metrics', () => {
    it('fails with 401 without Bearer token', async () => {
      const res = await request(app).get('/api/v1/scheduling/metrics');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('returns canonical initial metrics response with zero count', async () => {
      const res = await request(app)
        .get('/api/v1/scheduling/metrics')
        .set('Authorization', 'Bearer mock-token-student');

      assert.equal(res.status, 200);
      assert.equal(res.body.algorithm, 'FCFS');
      assert.equal(res.body.processedRequests, 0);
      assert.equal(res.body.averageWaitMs, 0);
    });

    it('records and returns accurate operational metrics after preview requests', async () => {
      // Execute 2 accepted and 1 rejected previews
      await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: resourceId1,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: resourceId2,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      // Rejected preview (maintenance)
      await request(app)
        .post('/api/v1/scheduling/preview')
        .set('Authorization', 'Bearer mock-token-student')
        .send({
          resourceId: maintenanceResourceId,
          startTime: '2026-10-12T10:00:00Z',
          endTime: '2026-10-12T11:00:00Z',
          algorithm: 'FCFS',
        });

      const metricsRes = await request(app)
        .get('/api/v1/scheduling/metrics')
        .set('Authorization', 'Bearer mock-token-student');

      assert.equal(metricsRes.status, 200);
      assert.equal(metricsRes.body.processedRequests, 3);
      assert.equal(metricsRes.body.acceptedRequests, 2);
      assert.equal(metricsRes.body.rejectedRequests, 1);
      assert.ok(typeof metricsRes.body.averageProcessingLatencyMs === 'number');
    });

    it('resets metrics accurately upon reset request', async () => {
      schedulingMetrics.recordRequest({
        decision: 'ACCEPT',
        waitTimeMs: 15,
        processingLatencyMs: 5,
      });
      assert.equal(schedulingMetrics.getMetrics().processedRequests, 1);

      schedulingMetrics.reset();
      const current = schedulingMetrics.getMetrics();
      assert.equal(current.processedRequests, 0);
      assert.equal(current.averageWaitMs, 0);
      assert.equal(current.acceptedRequests, 0);
    });
  });

  describe('7. Concurrent Overlapping Booking Requests & Concurrency Distinction', () => {
    it('demonstrates FCFS policy decision vs DB transaction concurrency requirement', async () => {
      // Two concurrent booking requests for the same resource and same time slot
      const reqA: BookingRequest = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        requestId: 'req-A',
        userId: 'user-A',
      };
      const reqB: BookingRequest = {
        resourceId: resourceId1,
        startTime: '2026-10-12T10:00:00Z',
        endTime: '2026-10-12T11:00:00Z',
        requestId: 'req-B',
        userId: 'user-B',
      };

      // Both previews evaluate as ACCEPT because neither has committed a booking yet (preview is read-only)
      const previewA = await evaluateBookingRequest(reqA, { dataProvider: mockDataProvider });
      const previewB = await evaluateBookingRequest(reqB, { dataProvider: mockDataProvider });

      assert.equal(previewA.decision, 'ACCEPT');
      assert.equal(previewB.decision, 'ACCEPT');

      // Now simulate Team C authoritative commit for user A:
      mockDataProvider.addBooking({
        id: 'booking-A-committed',
        resource_id: reqA.resourceId,
        user_id: reqA.userId!,
        lab_id: labId,
        state: 'CONFIRMED',
        start_at: new Date(reqA.startTime),
        end_at: new Date(reqA.endTime),
      });

      // Subsequent evaluation for user B's transaction re-check is REJECTED by FCFS and blocked by DB
      const evaluationBAfterA = await evaluateBookingRequest(reqB, { dataProvider: mockDataProvider });
      assert.equal(evaluationBAfterA.decision, 'REJECT');
      assert.ok(evaluationBAfterA.reason.includes('overlapping'));
    });
  });

  describe('8. OS Simulation Concepts (Priority, SJF, RR, Deadlock, Lease Lock)', () => {
    it('simulates Priority scheduling ordering tasks by priority level', () => {
      const tasks = [
        { id: 't1', name: 'Student Task', burstTime: 10, priority: 2, arrivalTime: 0 },
        { id: 't2', name: 'Admin Task', burstTime: 5, priority: 0, arrivalTime: 0 },
        { id: 't3', name: 'Faculty Task', burstTime: 8, priority: 1, arrivalTime: 0 },
      ];

      const results = simulatePriorityScheduling(tasks);
      assert.equal(results[0].id, 't2'); // Admin first
      assert.equal(results[1].id, 't3'); // Faculty second
      assert.equal(results[2].id, 't1'); // Student third
    });

    it('simulates SJF scheduling ordering tasks by shortest burst time', () => {
      const tasks = [
        { id: 't1', name: 'Long Task', burstTime: 20, priority: 1, arrivalTime: 0 },
        { id: 't2', name: 'Short Task', burstTime: 4, priority: 1, arrivalTime: 0 },
        { id: 't3', name: 'Medium Task', burstTime: 10, priority: 1, arrivalTime: 0 },
      ];

      const results = simulateSJFScheduling(tasks);
      assert.equal(results[0].id, 't2'); // 4
      assert.equal(results[1].id, 't3'); // 10
      assert.equal(results[2].id, 't1'); // 20
    });

    it('simulates Round Robin scheduling with time slicing', () => {
      const tasks = [
        { id: 't1', name: 'Task 1', burstTime: 4, priority: 1, arrivalTime: 0 },
        { id: 't2', name: 'Task 2', burstTime: 2, priority: 1, arrivalTime: 0 },
      ];

      const result = simulateRoundRobinScheduling(tasks, 2);
      assert.ok(result.slices.length >= 3);
      assert.equal(result.slices[0].taskId, 't1');
      assert.equal(result.slices[1].taskId, 't2');
      assert.equal(result.slices[2].taskId, 't1');
    });

    it('detects cycles in Wait-For Graph (deadlock detection)', () => {
      // Cycle: T1 -> T2 -> T1
      const cyclicGraph = new Map<string, string[]>([
        ['T1', ['T2']],
        ['T2', ['T1']],
      ]);
      const resCyclic = DeadlockDetector.detectDeadlock(cyclicGraph);
      assert.equal(resCyclic.deadlock, true);

      // Acyclic: T1 -> T2 -> T3
      const acyclicGraph = new Map<string, string[]>([
        ['T1', ['T2']],
        ['T2', ['T3']],
        ['T3', []],
      ]);
      const resAcyclic = DeadlockDetector.detectDeadlock(acyclicGraph);
      assert.equal(resAcyclic.deadlock, false);
    });

    it('manages application lease locks and releases them', () => {
      const lm = new LockManager();
      const acq1 = lm.acquireLease(resourceId1, 'user-A', 5000);
      assert.equal(acq1.acquired, true);

      // User B cannot acquire lease for same resource while held
      const acq2 = lm.acquireLease(resourceId1, 'user-B', 5000);
      assert.equal(acq2.acquired, false);
      assert.ok(acq2.reason?.includes('leased'));

      // User A releases lease
      const rel = lm.releaseLease(resourceId1, acq1.lease?.leaseId);
      assert.equal(rel, true);

      // User B can now acquire lease
      const acq3 = lm.acquireLease(resourceId1, 'user-B', 5000);
      assert.equal(acq3.acquired, true);
    });
  });
});
