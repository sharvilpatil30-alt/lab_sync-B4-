# Team A — Operating Systems: Scheduling & Allocation Engine

**Specification & Handoff Document**  
**Module:** `backend/src/modules/scheduling`  
**Team:** Team A (Operating Systems)  
**Contract Version:** SHARED CONTRACT v1.0  
**Status:** Tested & Operational (Team C HTTP Booking Integration: **BLOCKED**)

---

## 1. Executive Summary & Boundaries

Team A owns the scheduling engine, deterministic queue policy, scheduling preview, and performance metrics.

### Ownership Boundary
- **Team A Owns:**
  - Pure scheduling policy (`evaluateBookingRequest`).
  - Read-only availability and overlap checks.
  - HTTP Preview endpoint: `POST /api/v1/scheduling/preview`.
  - HTTP Metrics endpoint: `GET /api/v1/scheduling/metrics`.
  - Deterministic in-memory request queueing and tie-breaking.
  - OS scheduling simulations (Priority, SJF, Round Robin, Deadlock detection).
- **Team C Owns:**
  - HTTP Booking endpoints (`POST /api/v1/bookings`, `GET /api/v1/bookings/my`, `GET /api/v1/bookings/:id`, cancellation).
  - PostgreSQL database schema, migrations, and connections.
  - Authoritative database transactions (`commit_booking`, `cancel_booking` RPCs).
  - All state writes to `bookings` and `resources` tables.

> [!WARNING]
> **Team C Integration Status: BLOCKED**  
> Across all git branches (`main`, `TEAM-C`, `salman/database-persistence`), all files in `backend/src/modules/bookings/` (`controller.js`, `routes.js`, `queries.js`, `stateMachine.js`) remain 0-byte placeholders. Team C has not implemented the HTTP booking persistence handlers. Team A has exported the complete scheduling API surface and provided the integration pattern below for Team C to consume once their endpoints are ready.

---

## 2. Exported Scheduling Function for Team C

### Function Location
- **Path:** `backend/src/modules/scheduling/index.ts` (or `backend/src/modules/scheduling/fcfs.ts`)

### TypeScript Signature
```typescript
import {
  evaluateBookingRequest,
  BookingRequest,
  SchedulingDecision,
  SchedulingContext
} from './modules/scheduling/index.js';

export async function evaluateBookingRequest(
  request: BookingRequest,
  context?: SchedulingContext
): Promise<SchedulingDecision>;
```

### Request Parameter (`BookingRequest`)
```typescript
interface BookingRequest {
  resourceId: string; // RFC 4122 UUID v1-v5
  startTime: string;  // ISO 8601 with timezone (e.g., '2026-10-12T10:00:00Z' or '+05:30')
  endTime: string;    // ISO 8601 with timezone
  algorithm?: string; // Defaults to 'FCFS'
  requestId?: string; // Optional correlation ID for deterministic tie-breaking
  userId?: string;    // Authenticated user ID
  priority?: number;  // Optional priority level
}
```

### Response (`SchedulingDecision`)
```typescript
interface SchedulingDecision {
  decision: 'ACCEPT' | 'REJECT';
  algorithm: 'FCFS';
  reason: string;
  details?: {
    resourceId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    waitTimeMs: number;
    processedAt: string;
    queuePosition?: number;
  };
}
```

### How Team C Must Call the Service in `POST /api/v1/bookings`
```typescript
// Example: Team C's booking controller
import { evaluateBookingRequest } from '../scheduling/index.js';
import { pool } from '../../config/postgres.js';

export async function createBookingHandler(req, res) {
  const { resourceId, startTime, endTime } = req.body;

  // 1. Team A Scheduling Evaluation (Pure policy evaluation)
  const decision = await evaluateBookingRequest({
    resourceId,
    startTime,
    endTime,
    algorithm: 'FCFS',
    userId: req.user.userId
  });

  if (decision.decision !== 'ACCEPT') {
    return res.status(409).json({
      error: {
        code: 'SCHEDULE_CONFLICT',
        message: decision.reason
      }
    });
  }

  // 2. Team C Authoritative Database Transaction (ACID Commit)
  // Recheck availability inside PostgreSQL transaction and commit atomically:
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Call commit_booking RPC function defined in 001_core.sql
    const result = await client.query(
      `SELECT commit_booking($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [/* parameters */]
    );

    await client.query('COMMIT');
    return res.status(201).json({ /* booking response */ });
  } catch (dbError) {
    await client.query('ROLLBACK');
    // If double-booking exclusion constraint violated:
    if (dbError.code === '23P01') { // exclusion_violation
      return res.status(409).json({
        error: { code: 'DOUBLE_BOOKING', message: 'Resource was committed concurrently' }
      });
    }
    throw dbError;
  } finally {
    client.release();
  }
}
```

---

## 3. Policy vs Database Concurrency Safety

> [!IMPORTANT]
> **Distinction Between FCFS Policy and DB Concurrency Safety:**
> - Team A's FCFS evaluator is a **pure decision policy**: it validates inputs, checks resource operational state, queries existing active bookings using $[start, end)$ half-open interval overlap semantics, and produces a decision without writing to the database.
> - An in-memory queue or JavaScript mutex only sequences requests within a single Node.js runtime process. It **cannot** guarantee multi-process, cross-server, or distributed concurrency safety.
> - **Authoritative concurrency safety is strictly enforced by PostgreSQL:**
>   - Table exclusion constraint `prevent_double_booking` in `database/migrations/001_core.sql`:
>     `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (resource_id IS NOT NULL AND state IN ('LEASED', 'CONFIRMED', 'ACTIVE'))`.
>   - Row-level locking (`SELECT ... FOR UPDATE`) in `database/migrations/003_booking_cancellation.sql`.

---

## 4. HTTP Endpoints Implemented

### A. Preview Endpoint: `POST /api/v1/scheduling/preview`
- **Purpose:** Test eligibility and availability without creating any booking record.
- **Authentication:** Requires `Authorization: Bearer <token>` (STUDENT, FACULTY, ADMIN).
- **Request Body:**
```json
{
  "resourceId": "11111111-1111-4111-8111-111111111111",
  "startTime": "2026-10-12T10:00:00Z",
  "endTime": "2026-10-12T12:00:00Z",
  "algorithm": "FCFS"
}
```

- **Response (200 OK — Available):**
```json
{
  "decision": "ACCEPT",
  "algorithm": "FCFS",
  "reason": "Resource is available for the requested time slot under FCFS policy"
}
```

- **Response (200 OK — Overlapping active booking):**
```json
{
  "decision": "REJECT",
  "algorithm": "FCFS",
  "reason": "Resource has an overlapping active booking (CONFIRMED) between 2026-10-12T10:00:00.000Z and 2026-10-12T12:00:00.000Z"
}
```

- **Error Responses (Conforms strictly to SHARED CONTRACT):**
  - **400 Bad Request (Invalid parameters):**
    ```json
    {
      "error": {
        "code": "INVALID_TIME_INTERVAL",
        "message": "Invalid time interval: startTime must be strictly before endTime"
      }
    }
    ```
  - **401 Unauthorized (Missing/invalid token):**
    ```json
    {
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Authentication required. Missing Bearer token."
      }
    }
    ```
  - **403 Forbidden (Unauthorized role):**
    ```json
    {
      "error": {
        "code": "FORBIDDEN",
        "message": "Role \"GUEST\" is not authorized for this resource."
      }
    }
    ```
  - **404 Not Found (Resource does not exist):**
    ```json
    {
      "error": {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Resource not found with ID: 99999999-9999-4999-8999-999999999999"
      }
    }
    ```

### B. Metrics Endpoint: `GET /api/v1/scheduling/metrics`
- **Purpose:** Returns real operational metrics of the scheduling engine.
- **Authentication:** Requires `Authorization: Bearer <token>`.
- **Response (200 OK — Canonical Initial Response):**
```json
{
  "algorithm": "FCFS",
  "processedRequests": 0,
  "averageWaitMs": 0,
  "acceptedRequests": 0,
  "rejectedRequests": 0,
  "averageProcessingLatencyMs": 0,
  "activeQueueDepth": 0,
  "metricScope": "in_memory_process",
  "lastResetAt": "2026-10-09T16:55:00.000Z"
}
```
- **Reset Endpoint:** `POST /api/v1/scheduling/metrics/reset` (administrative helper).

---

## 5. OS Concepts Implemented & Simulated

1. **FCFS Policy with Half-Open Interval Semantics:**  
   Adheres to $[start, end)$ interval semantics matching PostgreSQL `tstzrange(..., '[)')`. Adjacent bookings (where $end_1 = start_2$) do NOT conflict and are accepted.
2. **Deterministic In-Memory Queue (`FCFSSchedulingQueue`):**  
   Tracks arrival timestamps and provides deterministic tie-breaking using request ID lexicographical ordering.
3. **Deadlock Detection (`DeadlockDetector`):**  
   Wait-For Graph (WFG) cycle detection using Depth-First Search (DFS) for educational OS simulations.
4. **Lease Locks (`LockManager`):**  
   Application-level TTL lease locks to prevent double-submissions while maintaining strict separation from DB transactional isolation.
5. **CPU Scheduling Simulations:**  
   Simulations for Priority (`simulatePriorityScheduling`), Shortest Job First (`simulateSJFScheduling`), and Round Robin (`simulateRoundRobinScheduling`) with time quantum slicing.

---

## 6. Test Suite & Verification Results

Test runner: `npm test` (or `tsx --test "src/**/__tests__/*.test.ts"`)

### Verification Output:
```
▶ Team A — OS Scheduling & Allocation Engine
  ▶ 1. Input Validation and Time Intervals
    ✔ rejects missing or empty resourceId
    ✔ rejects invalid non-UUID resourceId format
    ✔ rejects malformed timestamps and non-date strings
    ✔ rejects timestamps without timezone offset (must be timezone-aware ISO)
    ✔ rejects startTime >= endTime (inverted interval)
    ✔ rejects startTime == endTime (zero duration)
    ✔ rejects unsupported algorithm types
    ✔ accepts valid timezone-aware timestamps with Z or offset
  ✔ 1. Input Validation and Time Intervals
  ▶ 2. Resource State and Overlap Checks
    ✔ accepts available resource with no conflicts
    ✔ rejects unknown/non-existent resource
    ✔ rejects resource in MAINTENANCE state
    ✔ rejects overlapping active booking (CONFIRMED)
    ✔ accepts strictly adjacent bookings without overlap ([start, end) semantics)
    ✔ respects actual cancellation statuses: CANCELLED bookings do NOT block availability
  ✔ 2. Resource State and Overlap Checks
  ▶ 3. Deterministic FCFS Ordering and Tie-Breaking
    ✔ orders requests strictly by arrival timestamp
    ✔ breaks ties deterministically by requestId when arrival timestamps are identical
    ✔ processes queued requests sequentially in FCFS queue
  ✔ 3. Deterministic FCFS Ordering and Tie-Breaking
  ▶ 4. Repeated Previews Producing Zero Database Writes
    ✔ produces no database writes or record mutations across repeated preview calls
  ✔ 4. Repeated Previews Producing Zero Database Writes
  ▶ 5. HTTP Preview Endpoint: POST /api/v1/scheduling/preview
    ✔ fails with 401 when Authorization header is missing
    ✔ fails with 403 when user has an unauthorized role
    ✔ fails with 400 when input has invalid parameters
    ✔ fails with 404 when resource is unknown/not found
    ✔ returns 200 with ACCEPT decision for valid available resource
    ✔ returns 200 with REJECT decision when slot is conflicted by active booking
  ✔ 5. HTTP Preview Endpoint: POST /api/v1/scheduling/preview
  ▶ 6. HTTP Metrics Endpoint: GET /api/v1/scheduling/metrics
    ✔ fails with 401 without Bearer token
    ✔ returns canonical initial metrics response with zero count
    ✔ records and returns accurate operational metrics after preview requests
    ✔ resets metrics accurately upon reset request
  ✔ 6. HTTP Metrics Endpoint: GET /api/v1/scheduling/metrics
  ▶ 7. Concurrent Overlapping Booking Requests & Concurrency Distinction
    ✔ demonstrates FCFS policy decision vs DB transaction concurrency requirement
  ✔ 7. Concurrent Overlapping Booking Requests & Concurrency Distinction
  ▶ 8. OS Simulation Concepts (Priority, SJF, RR, Deadlock, Lease Lock)
    ✔ simulates Priority scheduling ordering tasks by priority level
    ✔ simulates SJF scheduling ordering tasks by shortest burst time
    ✔ simulates Round Robin scheduling with time slicing
    ✔ detects cycles in Wait-For Graph (deadlock detection)
    ✔ manages application lease locks and releases them
  ✔ 8. OS Simulation Concepts (Priority, SJF, RR, Deadlock, Lease Lock)
✔ Team A — OS Scheduling & Allocation Engine
ℹ tests 34
ℹ suites 9
ℹ pass 34
ℹ fail 0
```

