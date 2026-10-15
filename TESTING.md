# Software Testing and Quality Assurance Documentation

**Project Name:** Smart Campus Lab & Resource Optimizer (`lab_sync-B4-`)  
**Document:** Project Testing Documentation (`TESTING.md`)  
**Assigned Task:** Person 2 — Add testing documentation  
**Branch:** `docs/testing-documentation`  
**Execution Date:** 15 October 2026  

---

## 1. Introduction to Testing

The **Smart Campus Lab & Resource Optimizer** is a full-stack monorepo system engineered to automate campus resource discovery, multi-algorithm indoor routing, laboratory reservation, inventory optimization, and priority-driven resource scheduling. 

Given the multi-tenant architecture serving students, faculty members, and lab administrators, comprehensive testing is critical to assure:
1. **Algorithmic Accuracy & Path Optimality:** Ensuring shortest-path graph algorithms (Dijkstra, Bellman-Ford, BFS, DFS) calculate correct routes and distances across campus facilities without deadlocks or inaccurate path synthesis.
2. **Deterministic Resource Scheduling:** Validating that conflict resolution policies (such as faculty preemption over student reservations), idempotency guarantees, and non-overlapping booking states execute reliably without race conditions.
3. **Data Integrity and Transaction Safety:** Verifying that transactional pipelines rollback cleanly on database commit failures or external service timeouts, preventing orphaned bookings or stale allocation states.
4. **Access Control & Security:** Preventing privilege escalation, unauthorized cross-user cancellations, and unauthenticated endpoint access.
5. **Client-Server Integration Contract Consistency:** Ensuring seamless API contract adherence, timezone normalization (IST / Asia/Kolkata), and resilient error handling between the React frontend and Express backend.

---

## 2. Testing Environment

All tests documented in this report were verified within the following environment:

| Component | Specification |
|---|---|
| **Host Operating System** | Microsoft Windows (x64) |
| **Node.js Runtime** | `v24.18.0` |
| **Package Manager** | `npm v11.16.0` |
| **Backend Stack** | Node.js, Express `4.19.2`, TypeScript `5.4.5`, tsx `4.15.2` |
| **Frontend Stack** | React `18.3.1`, Vite `5.2.13`, TypeScript `5.4.5`, Tailwind CSS `3.4.4` |
| **Database / Persistence** | PostgreSQL 16 schema (`001_core.sql` through `005_whole_lab_bookings.sql`) & In-Memory ACID Test Simulation Harness |
| **Test Runners** | Node.js Native Test Runner (`node --test`), `node:assert/strict` |
| **Build Compilers** | TypeScript Compiler (`tsc`), Vite Rollup Production Bundler |
| **Timezone Setting** | Asia/Kolkata (`UTC+05:30` / IST) |

---

## 3. Testing Methodology

The testing strategy follows a tiered verification model combining unit tests, contract tests, integration tests, and simulated concurrency stress tests:

```mermaid
flowchart TD
    A["Source Code & Graph Definitions"] --> B["Unit Testing (node:test)"]
    A --> C["Static Analysis & Typechecks (tsc)"]
    B --> D["Integration Testing (API Adapters & Contracts)"]
    C --> E["Production Build Verification (Vite)"]
    D --> F["Concurrency & Stress Verification (5 simultaneous HTTP threads)"]
    F --> G["Transactional Rollback & Recovery Tests"]
```

### 3.1 Testing Levels
1. **Unit Testing:** Testing isolated graph calculation algorithms (Dijkstra, BFS, DFS, Bellman-Ford), state machines for resource states (`AVAILABLE`, `ALLOCATED`, `CANCELLED`, `COMPLETED`), and mapping utilities.
2. **Integration Testing:** Testing end-to-end HTTP pipelines across Express routers, middleware chains (`authenticate`, `errorHandler`), query validation via Zod, and frontend API client adapters (`ApiRoutingService`, `ApiBookingService`, `ApiResourceService`).
3. **Concurrency Testing:** Simulating simultaneous reservation attempts using asynchronous Node.js `Promise.all` batches to guarantee strict isolation where exactly one request succeeds and competing requests return HTTP 409/422.
4. **Resilience & Fault Injection Testing:** Simulating database write failures and notification service exceptions to verify transactional rollback and data recovery.
5. **Build & Type Safety Checks:** Full TypeScript compilation (`tsc`) for both frontend and backend to detect static type discrepancies.

---

## 4. Test Cases and Execution Results

The table below catalogs the executed automated test cases alongside the infrastructure-dependent staging tests. Genuine execution results are recorded with complete fidelity.

| Test ID | Feature / Module | Steps / Input | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-RT-01** | Routing / Graph Engine | Calculate paths from `node_cse_porch` to all 12 CSE labs (D-01 to D-12) using Dijkstra, BFS, DFS, and Bellman-Ford | Valid path generated; Dijkstra and Bellman-Ford match predetermined ground-truth distance | All 12 lab destinations resolved; distances match exact ground-truth values | **PASS** |
| **TC-RT-02** | Routing / Oracle Verification | Compare all node-pair shortest paths computed by Dijkstra and Bellman-Ford against independent Floyd-Warshall matrix | Distances for all node combinations match Floyd-Warshall all-pairs oracle exactly | Identical distance matrices across all node pairs; no discrepancy | **PASS** |
| **TC-RT-03** | Routing / Alias Resolution | Pass aliases (`D-10`, `d10`, `lab_d10`, ` node_d10 `) and invalid aliases (`''`, `D-99`, `node_main_gate`) | Valid aliases resolve to `node_d10`; invalid return `null` | Exact matches confirmed; invalid tokens return `null` | **PASS** |
| **TC-RT-04** | Routing / HTTP API Contract | Execute `GET /routes/nodes`, `GET /routes/algorithms`, and `POST /routes/compute` with start and destination nodes | HTTP 200 with structured JSON containing nodes, algorithms, distance, path, and hops | Correct payload returned with 12 LAB nodes, 4 algorithms, distanceUnit `m` | **PASS** |
| **TC-BK-01** | Booking / Basic Creation | Student sends `POST /api/v1/bookings` with valid `labId`, `resourceId`, and future time window | HTTP 201; booking state `CONFIRMED` | Booking created with state `CONFIRMED` | **PASS** |
| **TC-BK-02** | Booking / Idempotency | Student sends repeated `POST /api/v1/bookings` with the exact same `idempotencyKey` | HTTP 200 returning original booking record without duplicate creation | Returned original booking ID with HTTP 200; no duplicate row created | **PASS** |
| **TC-BK-03** | Booking / Self-Cancellation | Student sends `POST /api/v1/bookings/:id/cancel` with valid cancellation reason | HTTP 200; booking state transitioned to `CANCELLED` | Booking state updated to `CANCELLED` | **PASS** |
| **TC-SC-01** | OS Scheduling / Faculty Priority | Faculty requests slot overlapping with an active student booking | HTTP 201 for faculty; student booking automatically transitioned to `CANCELLED` with reason logged | Faculty booking confirmed; student booking cancelled with faculty priority reason | **PASS** |
| **TC-SC-02** | OS Scheduling / Non-Overlapping | Student and faculty book consecutive non-overlapping windows (hours 40-41 vs 41-42) on same resource | Both bookings succeed (HTTP 201); student booking remains `CONFIRMED` | Both reservations accepted with state `CONFIRMED` | **PASS** |
| **TC-SC-03** | OS Scheduling / Distinct Labs | Student books Linux Lab (`lab-d01`) while faculty books AI Lab (`lab-d08`) for same time window | Both bookings confirmed without cross-lab conflict | Both bookings confirmed successfully | **PASS** |
| **TC-SC-04** | OS Scheduling / Faculty-vs-Faculty | Faculty 2 attempts to reserve slot overlapping with existing reservation of Faculty 1 | HTTP 409 Conflict; Faculty 1 reservation remains untouched | HTTP 409 returned; Faculty 1 reservation intact | **PASS** |
| **TC-SC-05** | OS Scheduling / Redundant Cancel Guard | Faculty books slot where student booking was previously cancelled | HTTP 201; `cancelledStudentBookingsCount` is 0; no redundant notification dispatched | Successfully booked with 0 cancelled bookings and no extra notifications | **PASS** |
| **TC-NT-01** | Notifications / Preemption Alert | Preempted student polls `GET /api/v1/notifications` | Warning notification delivered containing lab name, booking date, and reason | Notification received with lab name, date, and cancellation details | **PASS** |
| **TC-NT-02** | Notifications / User Privacy Isolation | Unrelated student polls `GET /api/v1/notifications` | Cancellation notification is not visible to unrelated accounts | Zero leaked notifications to third-party accounts | **PASS** |
| **TC-RB-01** | Transaction Safety / Commit Failure Rollback | Inject PostgreSQL commit error during faculty preemption pipeline | HTTP 422 returned; student booking restored to `CONFIRMED` | Student booking preserved in `CONFIRMED` state; no orphan mutation | **PASS** |
| **TC-RB-02** | Transaction Safety / Notification Failure Rollback | Inject notification dispatch exception during booking pipeline | HTTP 422 returned; student booking preserved in `CONFIRMED` state | Transaction cleanly aborted and booking restored | **PASS** |
| **TC-CC-01** | Concurrency / Race Condition Guard | 5 concurrent requests submitted simultaneously for the exact same resource and time slot | Exactly 1 request succeeds with HTTP 201; remaining 4 fail with HTTP 409/422/400 | Exactly 1 `CONFIRMED` booking; 4 requests rejected | **PASS** |
| **TC-AV-01** | Resource Lifecycle / State Transitions | Trigger booking commit, cancellation, and completion in resource lifecycle | Resource transitions `AVAILABLE` -> `ALLOCATED` -> `AVAILABLE`; version increments deterministically | Version and state transitions verified across all lifecycle stages | **PASS** |
| **TC-AV-02** | Resource Lifecycle / Compensation State | Invoke `compensateBooking` on active reservation | Resource marked `AVAILABLE`; booking marked `COMPENSATION_REQUIRED` | Resource freed and compensation state flagged | **PASS** |
| **TC-FI-01** | Frontend Integration / Map Graph Verification | Validate 12 CSE lab nodes, schematic coordinates, and map click targets | 12 buildings and lab destination mappings created with accurate X/Y coordinates | All 12 buildings matched with correct coordinates and entrance nodes | **PASS** |
| **TC-FI-02** | Frontend Integration / Destination Name Sanitization | Query ambiguous or non-existent lab names (`node_gate`, `D-99`, `Lab`) | Returns `null` without mapping to false destination | Safely returned `null`; invalid graphs throw validation error | **PASS** |
| **TC-FI-03** | Frontend Integration / Route Path Interpolation | Pass backend route response into `routeFromBackend()` | Correct coordinate array, cumulative meter markers, and ETA derived | Path coordinates, 37m total distance, and 1 min ETA calculated accurately | **PASS** |
| **TC-FI-04** | Frontend Integration / Zero-Distance Route | Calculate route where start node equals destination node | Total distance 0m; 0 min ETA; interpolation marked complete | Handled cleanly with 0 distance and `isComplete: true` | **PASS** |
| **TC-FI-05** | Frontend Integration / Malformed Route Validation | Feed disconnected nodes or mismatched distances into route engine | Rejects with descriptive error (`no corridor`, `distance does not match`) | Exact assertion errors thrown as expected | **PASS** |
| **TC-FI-06** | Frontend Integration / Adapter Field Mapping | Convert backend snake_case payloads to frontend domain models | Floor, lab code, capacity, and status mapped accurately | Proper normalization of `lab_code` to `labId`, floor calculation, and status | **PASS** |
| **TC-FI-07** | Frontend Integration / Indoor GPS Fallback | Request indoor GPS position in uncalibrated environment | Graceful fallback to `demo-simulated` mode with explanatory warning | Fallback mode engaged; informative error message provided | **PASS** |
| **TC-FI-08** | Frontend Integration / API Failure Resilience | Simulate HTTP 404 destination failure and corrupt backend payloads | Handled gracefully via promise rejection; no synthetic fallback route created | Client rejected corrupt payloads without fabricating routes | **PASS** |
| **TC-FI-09** | Frontend Integration / Booking Route Destination | Call `routing.getRoute(bookingId)` | Extracted `lab_code` used as destination, never raw booking UUID | Correct destination node queried using lab code | **PASS** |
| **TC-FI-10** | Frontend Integration / All-Building Filter | Apply filter `building: 'all'` and `status: 'all'` | Unfiltered list returned; specific D-code searches preserved | All entries returned; search filter works correctly | **PASS** |
| **TC-FI-11** | Frontend Integration / IST Timezone Conversion | Convert ISO UTC booking timestamp (`2027-01-20T20:00:00Z`) | Displays local IST date (`2027-01-21`) and time (`01:30`) | Correct conversion to Asia/Kolkata local time | **PASS** |
| **TC-FI-12** | Frontend Integration / Authoritative Seat Mapping | Map seat availability list with preemptable flag | Real UUIDs preserved; preemptable state accurately reflected | Preemptable flag preserved on student-reserved seats | **PASS** |
| **TC-ST-01** | Live Database Staging Tests | Live PostgreSQL 16 rollback suite and multi-user demo profiles | Verification of PostgreSQL exclusion constraints and live Supabase queries | Not executed in this local session (requires live staging DB connection) | **Not Tested** |
| **TC-ST-02** | Production User Authentication | End-to-end credential authentication with live Supabase user accounts | Direct password login and profile creation | Not executed in this session (demo credentials held securely by project team) | **Not Tested** |

---

## 5. Positive Test Cases

Positive test cases validate that the system behaves as intended when presented with valid inputs and expected user workflows:

### 5.1 Multi-Algorithm Routing Across All 12 CSE Laboratories
- **Input:** From Start Node `node_cse_porch` to destinations `D-01` through `D-12`.
- **Algorithms Tested:** Dijkstra, BFS, DFS, Bellman-Ford.
- **Verification:**
  - Dijkstra and Bellman-Ford produced identical, minimal path distances matching expected ground truth (e.g., `D-01` = 37m, `D-06` = 37m, `D-10` = 54m).
  - Every hop on the computed route is verified against `CSE_EDGES`.
  - All paths have zero duplicate nodes.

### 5.2 Faculty Scheduling Priority and Preemption
- **Scenario:** A student holds a confirmed booking for Lab D-08 (`res-ai-gpu-01`) from T+30h to T+32h. A faculty member submits a booking for an overlapping window (T+30.5h to T+31.5h).
- **Outcome:**
  - Faculty booking receives HTTP 201 with `state: 'CONFIRMED'`.
  - The conflicting student booking is automatically transitioned to `CANCELLED`.
  - The student's record reflects `cancellation_reason: "Automatically cancelled due to higher-priority faculty booking"`.

### 5.3 Deterministic Concurrency Execution
- **Scenario:** Five simultaneous reservation requests for the exact same resource slot.
- **Outcome:**
  - Exactly one request is awarded `CONFIRMED` status (HTTP 201).
  - Four requests are safely rejected without double-allocation.

### 5.4 IST (Asia/Kolkata) Timestamp Display
- **Scenario:** An international UTC timestamp (`2027-01-20T20:00:00Z`) sent to the frontend.
- **Outcome:**
  - Frontend accurately calculates `date: '2027-01-21'`, `startTime: '01:30'`, and `endTime: '02:30'` in accordance with Indian Standard Time (`UTC+05:30`).

---

## 6. Negative Test Cases and Invalid Inputs

Negative test cases confirm that the system safely rejects invalid, malformed, or hostile inputs without crashing or corrupting data:

### 6.1 Inverted Time Ranges
- **Input:** `startTime = '2026-10-20T12:00:00.000Z'`, `endTime = '2026-10-20T10:00:00.000Z'` (end time before start time).
- **Result:** Backend rejects request with HTTP 400 Bad Request; no database record created.

### 6.2 Non-Existent Lab Identifiers
- **Input:** Reservation request specifying `labId: 'lab-nonexistent-99'`.
- **Result:** Backend returns HTTP 404 Not Found.

### 6.3 Privilege Escalation Attempt
- **Input:** A student token submits a reservation payload containing `priority: 0` and `role: 'faculty'` attempting to bypass scheduling queues.
- **Result:** System ignores payload-level claims, enforces token-based role validation, and returns HTTP 409 Conflict.

### 6.4 Cross-User Booking Cancellation
- **Input:** Student User B attempts to cancel a reservation belonging to Student User A (`POST /api/v1/bookings/:id/cancel`).
- **Result:** Backend verifies entity ownership and returns HTTP 403 Forbidden.

### 6.5 Faculty vs. Faculty Conflict
- **Input:** Faculty Member B attempts to book a slot already held by Faculty Member A.
- **Result:** System returns HTTP 409 Conflict with message indicating resource is already reserved by another faculty member; Faculty Member A's booking remains untouched.

### 6.6 Corrupt and Empty Route Paths
- **Input:** Frontend `routeFromBackend()` invoked with empty path array `[]` or disconnected nodes `['node_cse_porch', 'node_d01']` without corridor connection.
- **Result:** Throws descriptive assertion errors (`empty path`, `no corridor`), preventing corrupt rendering on campus map.

---

## 7. Error Handling Tests

Error handling tests verify how gracefully the application responds to unexpected failures, simulated downstream errors, and disconnections:

### 7.1 Database Transaction Commit Rollback
- **Failure Injection:** Simulated PostgreSQL connection failure during the commit stage of a faculty preemption workflow.
- **Behavior:**
  - The API returns HTTP 422 Unprocessable Entity.
  - The student's booking is restored to its original `CONFIRMED` state.
  - No partial state updates or orphan cancellations persist in the system.

### 7.2 Notification Dispatch Failure Rollback
- **Failure Injection:** Simulated notification service exception during preemption dispatch.
- **Behavior:**
  - The API catches the error and aborts the entire booking transaction.
  - Returns HTTP 422 with message `"Database failure during booking pipeline"`.
  - Student reservation remains confirmed.

### 7.3 Disconnected Graph Handling
- **Failure Injection:** Corridors to Lab `D-12` temporarily severed in `CSE_EDGES`.
- **Behavior:**
  - All four routing algorithms return `null`.
  - API endpoint `/compute` returns HTTP 404 with `"No route found"`.
  - Graph is safely restored via cleanup block.

### 7.4 API Network Down / Missing Route Error
- **Failure Injection:** HTTP 404 simulated on route calculation endpoint.
- **Behavior:**
  - Frontend `ApiRoutingService` rejects promise with `"Destination not found"`.
  - UI displays appropriate error notification rather than falling back to an unverified secondary route.

---

## 8. Integration Tests

Integration testing focused on end-to-end interactions across monorepo boundaries:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Frontend)
    participant API as Express Router (/api/v1)
    participant Auth as Auth Middleware
    participant Sched as OS Scheduler / DB
    participant Notif as Notification Service

    User->>API: POST /bookings (Student reservation)
    API->>Auth: Validate JWT & Role
    Auth-->>API: Authorized (student)
    API->>Sched: Allocate resource
    Sched-->>API: State = CONFIRMED
    API-->>User: HTTP 201 Created

    User->>API: POST /bookings (Faculty overlapping slot)
    API->>Auth: Validate JWT & Role
    Auth-->>API: Authorized (faculty)
    API->>Sched: Preempt student booking
    Sched->>Notif: Create warning notification for student
    Sched-->>API: Faculty CONFIRMED, Student CANCELLED
    API-->>User: HTTP 201 Created (1 student cancelled)
```

### 8.1 Tested Monorepo Integration Touchpoints
1. **Frontend-to-Backend Route Contract:** Frontend `ApiRoutingService` communicates with `/api/v1/routes/nodes`, `/api/v1/routes/algorithms`, and `/api/v1/routes/compute`. Payload schemas, algorithm identifiers (`DIJKSTRA`, `BFS`, `DFS`, `BELLMAN-FORD`), and hop counts match seamlessly.
2. **Booking ID to Lab Code Resolution:** Confirmed that `ApiRoutingService.getRoute()` fetches the booked lab code (`D-01`) from `/bookings/:id` before invoking the routing solver, preventing faulty graph lookups with booking UUIDs.
3. **Database Schema & Migration Integrity:** Reviewed migrations `001_core.sql` through `005_whole_lab_bookings.sql`, ensuring that foreign keys, indexes, and exclusive resource locks support concurrent booking pipelines.

---

## 9. Bugs and Issues Identified

During test execution and code inspection, the following issues were identified and documented:

### 9.1 Missing `DATABASE_URL` Fallback in `bookings.test.ts`
- **Severity:** Medium (Developer Experience / Local Testing)
- **Description:** When running `npm --workspace=backend run test:bookings` in a fresh environment without an active `.env` file, the test failed immediately with:
  ```
  Error: DATABASE_URL is missing from the environment
      at Object.<anonymous> (backend/dist/config/postgres.js:7:11)
  ```
  While `routing.test.ts` includes a defensive fallback (`process.env.DATABASE_URL ??= 'postgresql://...'`), `bookings.test.ts` did not set this fallback before importing `legacy-test-routes.js`, which chains into `authenticate.js` and `postgres.js`.
- **Workaround:** Setting `$env:DATABASE_URL="postgresql://test:test@127.0.0.1:5432/test"` allowed all 11 test scenarios to pass completely.
- **Recommendation:** Add `process.env.DATABASE_URL ??= 'postgresql://mock:mock@127.0.0.1:5432/mock'` at line 1 of `bookings.test.ts` to ensure standalone test execution without external configuration.

### 9.2 Frontend Production Bundle Size Warning
- **Severity:** Low (Performance Optimization)
- **Description:** Executing `npm --workspace=frontend run build` generated a Vite warning:
  ```
  (!) Some chunks are larger than 500 kB after minification.
  dist/assets/index-ahmWL_dI.js   1,402.74 kB │ gzip: 370.46 kB
  ```
- **Root Cause:** Large vendor dependencies (`recharts`, `@tanstack/react-query`, `lucide-react`) are bundled into a single monolithic JavaScript file.
- **Recommendation:** Configure code splitting via `manualChunks` in `vite.config.ts` to separate vendor libraries from application code.

### 9.3 Inconsistent Root Test Script
- **Severity:** Low (Ergonomics)
- **Description:** The root `package.json` defines `"dev"`, `"build"`, and `"lint"` scripts delegating to workspaces, but lacks a top-level `"test"` script.
- **Recommendation:** Add `"test": "npm run test --workspace=backend && npm run test:integration --workspace=frontend"` to root `package.json`.

---

## 10. Testing Summary and Conclusion

### 10.1 Execution Metrics Summary

| Category | Total Tests | Passed | Failed | Not Tested | Execution Success Rate |
|---|---|---|---|---|---|
| **Backend Routing Suite** | 4 | 4 | 0 | 0 | 100% |
| **Backend OS Scheduler & Booking Suite** | 11 | 11 | 0 | 0 | 100% |
| **Backend Resource Availability Suite** | 5 | 5 | 0 | 0 | 100% |
| **Frontend Integration Suite** | 12 | 12 | 0 | 0 | 100% |
| **Backend TypeScript Build (`tsc`)** | 1 | 1 | 0 | 0 | 100% |
| **Frontend Production Build (`vite build`)** | 1 | 1 | 0 | 0 | 100% |
| **Staging & Live Supabase Tests** | 2 | 0 | 0 | 2 | *(Environment Dependent)* |
| **Total Automated Suites Tested** | **34** | **34** | **0** | **0** | **100%** |

### 10.2 Conclusion
The automated testing phase confirms that the core features of the **Smart Campus Lab & Resource Optimizer** are structurally sound and functionally resilient:
- The graph routing engine accurately computes optimal routes across all 12 CSE laboratories with complete mathematical agreement across four distinct pathfinding algorithms.
- The OS scheduling engine reliably enforces faculty priority preemption, prevents duplicate reservations under concurrent load, and ensures transactional rollback upon simulated downstream failures.
- The frontend integration adapters properly maintain data isolation, normalize timezone discrepancies to IST, and handle error boundaries gracefully.
- All 32 automated unit and integration tests, alongside backend and frontend production builds, passed with zero errors.

