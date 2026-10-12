# TEAM D — Web — React UI, API Integration and Live Updates

**ACTIONABLE AI-AGENT HANDOFF — read entire file before changing code.**

# SHARED CONTRACT — IDENTICAL FOR ALL FOUR TEAMS (v1.0, 9 Oct 2026)

**Deadline:** Monday, 12 October 2026 (India time). **Repo:** https://github.com/sharvilpatil30-alt/lab_sync-B4-. **Integration owner:** Team C. **Do not push to `main`.**

## How to use this document with an AI coding agent
Paste/upload this entire file and give the agent access to a checkout of the actual repository. Say: **“Inspect the repository first, explain what exists and what is missing, then implement ONLY my team's assigned work on my own branch. Keep all API paths, request fields, response fields and environment names exactly as defined in SHARED CONTRACT. Run tests, show results, commit and push only my team's files. Never invent completed tests or deployed services.”** If the agent cannot read the repository, it must ask for relevant source files rather than invent their contents. **Do not provide secrets to a public AI chat.**

## Architecture, ownership, and boundaries
```
React frontend (D) --HTTPS + Bearer token--> existing backend API
    backend/auth verification + role policy (B)
    backend inventory & booking HTTP/persistence (C)
       -> Team A scheduling decision (pure function/service, invoked by C)
       -> PostgreSQL transactions in Supabase (C)
    backend routing computation (B) -> persisted campus graph (C maintains schema)
Supabase Auth: login/logout/session (B owns implementation, D integrates login UI)
```
**One repo, one backend, one shared Supabase development environment, one API contract.** Do not create an unrelated backend, duplicate auth system, or new database. **Team C is sole authority for writing booking state**; A never writes booking rows directly. B can read graph data via C-approved backend repository/data access; C owns schema changes. D never connects to PostgreSQL directly. Backend endpoints enforce permissions, not the role dropdown. Team D owns ALL frontend-to-API wiring; C does not implement D's UI integration.

## Source-of-truth locations and existing evidence
- Existing backend inventory routes: `backend/src/modules/inventory/routes.ts`.
- Existing PostgreSQL connector: `backend/src/config/postgres.ts`.
- Existing SQL migrations: `database/migrations/001_core.sql`, `002_inventory.sql`, `003_booking_cancellation.sql` (verify filenames in checkout and **verify migrations actually applied** before using functions).
- Import pipeline: `database/import/import_inventory.cjs` and `database/import/inventory.json`.
- Existing frontend: `frontend/`; routing work: `backend/src/modules/routing/` (some local uncommitted files and separate unrelated-history branch; verify carefully).
- Six inventory GET routes were previously tested locally against Supabase: `/api/v1/inventory/summary`, `/labs`, `/categories`, `/models`, `/batches`, `/equipment` (all with `/api/v1/inventory` prefix). Last checked: 12 labs, 55 equipment models, 81 purchase batches; **bookable `resources` count was 0**. These are historical stock records, **not evidence of live available resources**.
- Booking SQL/constraints exist in repo but booking HTTP endpoints, production authorization, migrations on live DB, deployment and full UI flow **have not been verified**. Frontend may depend on an older `/api/v1/inventory` response shape; inspect before changing.

## Canonical API contract — freeze these names across all teams
**Base path** `/api/v1`; local backend base `http://localhost:5000` is developer-only. Deployed frontend must use `VITE_API_BASE_URL=https://<deployed-backend-host>` and the backend must use secure environment configuration. Never embed localhost in production UI. JSON request/response bodies use **camelCase**. IDs are strings (UUID for persisted records). Timestamps are ISO 8601 with timezone. Error format `{ "error": { "code": "MACHINE_READABLE_CODE", "message": "Human-readable explanation" } }` and meaningful HTTP statuses (400,401,403,404,409,422,500). All protected routes accept `Authorization: Bearer <supabase_access_token>`; the backend validates token and role. Do not trust `userId` or `role` from the browser.

### EXISTING VERIFIED (Team C; response shapes must be inspected, not assumed)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/inventory/summary` | Inventory KPIs |
| GET | `/api/v1/inventory/labs` | Labs inventory |
| GET | `/api/v1/inventory/categories` | Categories |
| GET | `/api/v1/inventory/models` | Equipment models |
| GET | `/api/v1/inventory/batches` | Purchase batches |
| GET | `/api/v1/inventory/equipment` | Bookable resource list (previously empty) |

### AGREED TARGET CONTRACT (planned, not verified yet; avoid duplicate implementations)
| Owner | Method | Path | Request | Successful response |
|---|---|---|---|---|
| B | GET | `/api/v1/auth/me` | Bearer token | `{ "userId":"uuid", "email":"...", "role":"STUDENT" }` |
| C+A | GET | `/api/v1/resources/available?labId=uuid&startTime=ISO&endTime=ISO` | query | `{ "resources":[{"resourceId":"uuid","labId":"uuid","name":"Demo PC","available":true}] }` |
| C+A | POST | `/api/v1/bookings` | `{ "resourceId":"uuid", "startTime":"ISO", "endTime":"ISO" }` | `201 { "bookingId":"uuid", "resourceId":"uuid", "status":"CONFIRMED", "startTime":"ISO", "endTime":"ISO" }` |
| C | GET | `/api/v1/bookings/my` | Bearer token | `{ "bookings":[{"bookingId":"uuid","resourceId":"uuid","status":"CONFIRMED","startTime":"ISO","endTime":"ISO"}] }` |
| C | GET | `/api/v1/bookings/:id` | path id | `{ "bookingId":"uuid","resourceId":"uuid","status":"CONFIRMED","startTime":"ISO","endTime":"ISO" }` |
| C+A | POST | `/api/v1/bookings/:id/cancel` | path id, Bearer token | `{ "bookingId":"uuid", "status":"CANCELLED" }` |
| A | POST | `/api/v1/scheduling/preview` | `{ "resourceId":"uuid","startTime":"ISO","endTime":"ISO","algorithm":"FCFS" }` | `{ "decision":"ACCEPT", "algorithm":"FCFS", "reason":"..." }` (no DB write) |
| A | GET | `/api/v1/scheduling/metrics` | Bearer token | `{ "algorithm":"FCFS","processedRequests":0,"averageWaitMs":0 }` (compute actual measurements) |
| B | GET | `/api/v1/routes/nodes` | Bearer token | `{ "nodes":[{"nodeId":"string","name":"string","type":"LAB"}] }` |
| B | POST | `/api/v1/routes/compute` | `{ "fromNodeId":"string", "toNodeId":"string", "algorithm":"dijkstra" }` | `{ "path":["node1","node2"], "distance":0, "distanceUnit":"m", "algorithm":"dijkstra" }` |
| B | GET | `/api/v1/routes/algorithms` | Bearer token | `{ "algorithms":["bfs","dfs","dijkstra","bellman-ford"] }` (only implemented ones) |

**Canonical role values:** `STUDENT`, `FACULTY`, `ADMIN` (backend-verified). **Canonical booking statuses:** `CONFIRMED`, `CANCELLED` at the API boundary; map existing DB enum/status values explicitly rather than silently changing schema. **Canonical route algorithms:** `bfs`, `dfs`, `dijkstra`, `bellman-ford` (implement only valid graph-weight semantics; Dijkstra cannot handle negative weights). **Canonical scheduling algorithm for MVP:** `FCFS`; additional policies only after working core. **Canonical node IDs** come from real persisted graph records; never assume `LAB_D01` exists. **Canonical equipment/resource IDs** come from real `resources` table, not historical purchase-batch IDs. **Canonical auth:** Supabase Auth password sign-in/sign-out via frontend SDK, verified backend `/auth/me`; do not create duplicate `/auth/login` or `/auth/logout` unless existing architecture requires it.

**Contract compatibility gate:** Before implementation, inspect actual database schema, existing routes, current auth, package scripts, and frontend data types. If a contract conflicts with an already used implementation, coordinate the change with ALL affected teams; do not independently rename endpoints/fields. Record deviations in the PR and update all four copies of this contract together.

## End-to-end acceptance test (all teams must support)
1. Authorized user signs in using real Supabase Auth; invalid login fails. A fake Admin selection does not grant Admin permissions.
2. UI loads labs and bookable *demo* resources from backend (no hardcoded availability). Data remains after browser refresh.
3. Two users requesting overlapping times for the same resource cannot both receive confirmed bookings; backend transaction/constraint is authoritative.
4. Booking appears in `/bookings/my` after refresh and on another device logged into the same account.
5. Campus route uses persisted graph, returns real node IDs and valid path; unknown/disconnected nodes handled.
6. Owner cancels booking; unauthorized user cannot cancel another user's booking; availability updates on all clients after refresh/polling.
7. Hosted frontend calls a publicly reachable hosted HTTPS backend; backend connects to Supabase securely. **GitHub push alone is not deployment.** Validate CORS, environment variables, migrations, RLS/roles, health checks, and hosted smoke tests.

## Security, environment and deployment contract
- Frontend: `VITE_API_BASE_URL` (public backend HTTPS URL), `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` or equivalent publishable key (public client config; never service-role key). Verify exact existing Vite env names before standardizing; update code and `.env.example` together.
- Backend: `DATABASE_URL` (server only), Supabase project URL and appropriate auth/JWKS verification configuration (server only), `BACKEND_PORT` or existing port variable, `FRONTEND_ORIGIN` for CORS. Confirm actual env names in source and standardize with C/B. Do not log credentials or tokens. Restrict database role permissions; prefer separate development/staging DB. If full DB password has been exposed, rotate it.
- Backend developers A/B/C may run local backend configured with securely shared **development** credentials; do not send secrets in WhatsApp, public prompts, Git commits or screenshots. A and B should use C's existing DB repository/connector, not direct ad hoc credentials in files. Frontend uses backend URLs, not direct PostgreSQL.
- For true cross-device live behavior, persistent database + frontend refetch after mutation + polling every ~5–15 seconds while active is MVP; Supabase Realtime optional only after access policies and publication tested. Backend must run on reachable HTTPS host, not localhost, for hosted demo.
- Deployment owner/integrator must select actual hosting, configure environment, apply migrations, test CORS and auth, and publish both frontend and backend. No hosting provider or live URL is assumed in these files.

## Team delivery and Git rules
- Deadline Mon 12 Oct; Friday freeze contract, Saturday push modules, Sunday integrated testing, Monday hosted demo and evidence.
- Stay on your assigned branch; do not merge unrelated-history branches blindly. Team B routing branch contains committed `node_modules` and no common ancestor with `main`; copy/select needed source only after inspection. Local unstaged routing files belong to a working tree and must not be reset/overwritten. Integrator already made local backup of branches, diffs and untracked files.
- Do not commit `.env`, credentials, `node_modules`, `dist`, test dumps, or secrets. Use explicit `git add <owned paths>`, inspect `git diff --cached`, run builds/tests, commit, push, and send branch name + commit hash + API examples + test outputs + changed files + migration requirements + any breaking changes.
- Each team fixes its own failing code. Team D connects all frontend screens; Team C integrates/test-drives but does not rewrite others' modules. Do not claim tests passed without executing them.

---

## YOUR TEAM'S EXACT MISSION — TEAM D
**You own ALL frontend pages AND all frontend-to-backend integration.** Do not ask C to wire every UI action. Backend APIs are owned by A/B/C; you consume them, report mismatches, and coordinate fixes. Use one reusable HTTP client and real server responses, not mock bookings or local-only storage.

### Inspect before writing
1. Read `frontend/` routes/components, login/role selector, current mock services, API clients, Vite config, existing `package.json` scripts. Inspect the current backend endpoints and Team C's six inventory GET responses. Current `/api/v1/inventory` legacy dashboard response may be incompatible; inspect rather than assume.
2. Confirm auth API contract with B and booking API contract with C/A. Ask C for demo resource IDs from live GET endpoints; never hardcode IDs. Ask B for campus nodes and route response examples.
3. Preserve existing UI styling and functionality. Replace mocked data only for screens whose backend endpoints are ready; show explicit loading/empty/error states for unfinished features, not fake success.

### Implement, in order
1. Centralize configuration: `VITE_API_BASE_URL` (public HTTPS backend when deployed; local URL only in local `.env`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable). Do not include DB password/service-role key. Build reusable `apiFetch(path, {method, body})` that obtains current Supabase access token, adds Bearer header, parses JSON, handles non-2xx standardized errors, handles 401 and does not log tokens.
2. Connect existing login screen to B's Supabase Auth implementation. Keep three role-specific views but render access based on **server-verified** role from `/api/v1/auth/me`, not the dropdown alone. Support logout and session restoration on refresh.
3. Inventory pages: fetch `/api/v1/inventory/summary`, `/labs`, `/categories`, `/models`, `/batches`, `/equipment` as needed. Map the ACTUAL JSON shape, with UUIDs and empty equipment state; never display fake availability from historical stock.
4. Availability form: fetch real labs and `GET /api/v1/resources/available?labId=...&startTime=...&endTime=...`. Use user-selected time range; show local timezone clearly and transmit ISO timestamps with offset.
5. Book button: POST `/api/v1/bookings` with `{ resourceId, startTime, endTime }`, no userId or role in body. Disable while pending; show confirmation only after HTTP 201. Handle 409 conflict by showing resource no longer available and refetching.
6. My Bookings: GET `/api/v1/bookings/my`, render real server records, cancel via `POST /api/v1/bookings/:id/cancel`, refetch bookings and availability after success; never mark cancelled only in local state.
7. Routing: GET `/api/v1/routes/nodes`, POST `/api/v1/routes/compute` with `{fromNodeId,toNodeId,algorithm:'dijkstra'}` using actual node IDs. Display route/path/distance, and clear empty/unreachable/error state; do not invent map coordinates. If no actual map geometry, render a textual route/graph rather than a misleading geographic map.
8. Dynamic cross-user updates: refetch after every mutation, refetch on focus, and poll relevant pages every ~5–15 seconds while visible; stop polling on unmount. Optionally use Realtime later only if B/C configure RLS/publication. Update dashboard from fresh APIs; no localStorage as authoritative bookings.
9. Make production build use deployed HTTPS API URL, handle CORS and auth expiration, show friendly network errors. Keep `.env.example` with placeholders only. Never bake `localhost` into deployed build.

### Mandatory tests
- Successful login, failed login, refresh retains session; changing role dropdown cannot unlock admin UI or backend action.
- Inventory loads from Supabase-backed API; empty resources displays helpful message.
- Booking success persists across refresh/second browser; conflicting booking shows 409 and refresh; cancellation persists and frees slot.
- Route displays actual path; disconnected/unknown node handled.
- No hardcoded inventory/bookings/route results in demo flow; API unreachable shows error rather than fake success; deployed frontend reaches deployed backend from another device/network.
- Run actual frontend build and document commands/output, not guessed scripts.

### Handoff to integrator
Send changed frontend files, API endpoint usage list, env variable names (no secrets), screenshots or demo recording, build output, deployment steps, commit hash and any backend mismatch requiring A/B/C fix. Keep branch isolated; do not push to main.

### Definition of done
Real Supabase Auth login/roles + all inventory/booking/routing screens using canonical APIs + loading/errors + after-action refetch + cross-user polling + hosted frontend connected to hosted backend + pushed branch.

## Exact next message to send your AI agent
> You are the implementation engineer for Team D. First inspect this repository and produce a brief gap analysis mapping every required file, route and database dependency. Ask only for missing secrets through secure local configuration, never in chat. Then implement the Team D mission in small testable steps, preserving the SHARED CONTRACT exactly. Run real tests and builds, show their output, stage only owned files, commit and push to the existing team branch. Do not claim any endpoint is complete until tested. Report integration blockers to Team C.
