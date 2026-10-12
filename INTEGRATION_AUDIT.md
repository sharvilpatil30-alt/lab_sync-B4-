# INTEGRATION AUDIT: Smart Campus Lab & Resource Optimizer (LabSync)
**Role:** Senior Full-Stack Engineer and Integration Lead  
**Working Directory:** `D:\TY\minirproject`  
**Git Branch:** `feature/team-d-real-api-integration`  
**Date:** October 10, 2026  

---

## 1. Existing Architecture and Monorepo Layout

The project is structured as a full-stack monorepo integrating work from Team A (OS & scheduling), Team B (campus spatial graph & navigation), Team C (database schema, 3NF dead-stock inventory, and persistence), and Team D (web frontend and integration).

```text
D:\TY\minirproject\
├── backend/                             # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/                      # Environment variables, PostgreSQL pool, MongoDB connector
│   │   │   ├── env.ts                   # Environment configuration
│   │   │   ├── postgres.ts              # Resilient PostgreSQL connection pool
│   │   │   └── database.ts              # Mongoose/MongoDB connection
│   │   ├── constants/                   # Canonical roles: STUDENT, FACULTY, ADMIN
│   │   ├── middleware/                  # JWT auth, role authorization (requireRole), error handler
│   │   ├── modules/
│   │   │   ├── auth/                    # Auth routes (login, register, me, logout), User model
│   │   │   ├── bookings/                # Booking routes, double-booking prevention, cancellation
│   │   │   ├── dfd/                     # DFD verifier and state constraints
│   │   │   ├── inventory/               # 3NF dead-stock summary, labs, models, batches, equipment
│   │   │   ├── labs/                    # Lab facilities, maintenance state toggle
│   │   │   ├── maintenance/             # Maintenance work order logs, resolution
│   │   │   ├── monitoring/              # System overview, active facility alerts
│   │   │   ├── persistence/             # Authoritative in-memory / relational repository (campusDb)
│   │   │   ├── reports/                 # Lab & resource utilization analytics
│   │   │   ├── resources/               # Live resource availability engine
│   │   │   └── routing/                 # Dijkstra & A* campus graph router
│   │   ├── types/                       # Shared Data Flow Diagram (DFD) contracts & schemas
│   │   ├── utils/                       # Standardized API response wrappers & AppError
│   │   ├── app.ts                       # Express application, CORS, Helmet, router registration
│   │   └── server.ts                    # HTTP server bootstrap on port 5000
│   └── test_integration.cjs            # End-to-end integration test suite
├── database/
│   ├── data/                            # Canonical 3NF inventory fixtures
│   ├── import/                          # Importer pipeline (import_inventory.cjs)
│   └── migrations/                      # Team C canonical PostgreSQL SQL migrations
│       ├── 001_core.sql                 # Profiles, campus_nodes, campus_edges, labs, resources, bookings
│       ├── 002_inventory.sql            # 3NF dead-stock categories, models, batches, asset events
│       └── 003_booking_cancellation.sql # Booking cancellations log, triggers, refund procedures
├── frontend/                            # React + TypeScript + Vite + Tailwind CSS Frontend
│   ├── public/                          # Static assets and favicons
│   ├── src/
│   │   ├── assets/                      # Official Rajarambapu Institute of Technology (RIT) logo
│   │   ├── components/
│   │   │   ├── booking/                 # Real-time resource/seat booking modal & forms
│   │   │   ├── common/                  # Buttons, Cards, Inputs, Modals, Breadcrumbs, Badges, Tables
│   │   │   ├── lab/                     # Lab cards, status badges, details views
│   │   │   ├── layout/                  # Navbar with RIT branding, role-based Sidebars
│   │   │   └── route/                   # CampusMap2D, NavigationPanel, DeviceVerificationModal
│   │   ├── config/                      # API_BASE_URL, Supabase credentials
│   │   ├── hooks/                       # useAuth, useDataHooks (auto-polling & focus refetch)
│   │   ├── layouts/                     # StudentLayout, FacultyLayout, AdminLayout, AuthLayout
│   │   ├── lib/                         # Supabase JS client and session management
│   │   ├── pages/
│   │   │   ├── admin/                   # Admin Dashboard, Labs, Inventory, Maintenance, Reports
│   │   │   ├── auth/                    # Login, SignUp (Registration), Unauthorized, NotFound
│   │   │   ├── faculty/                 # Faculty Dashboard, Approvals, Reservations
│   │   │   └── student/                 # Student Dashboard, Labs, Booking, Profile, Campus Route
│   │   ├── routes/                      # AppRoutes, ProtectedRoute, RoleRoute
│   │   ├── services/
│   │   │   ├── api/                     # Centralized API clients (ApiAuth, ApiLab, ApiBooking, etc.)
│   │   │   └── index.ts                 # Service registry (exclusively Real API mode)
│   │   ├── types/                       # Shared TypeScript domain contracts
│   │   ├── App.tsx                      # App root with query providers & route definitions
│   │   └── main.tsx                     # React DOM entry point
│   └── vite.config.ts                   # Vite bundler configuration on port 5173
├── docker-compose.yml                   # Optional container definitions (MongoDB port 27017)
├── package.json                         # Monorepo root scripts (`npm run dev`, `npm run build`)
└── TEAM_D_AI_AGENT_HANDOFF.md           # Master integration requirements and API contracts
```

---

## 2. Frontend and Backend Entry Points

1. **Frontend Entry Point**:
   - Web application entry point: `frontend/src/main.tsx` mounts `App.tsx` into `#root`.
   - Application Router: `frontend/src/routes/AppRoutes.tsx` configures React Router with route guards (`ProtectedRoute`, `RoleRoute`).
   - Development server runs via Vite on `http://localhost:5173`.
2. **Backend Entry Point**:
   - Server bootstrap: `backend/src/server.ts` imports Express app from `backend/src/app.ts` and listens on port 5000 (`http://localhost:5000`).
   - Root Health Check: `GET /api/v1/health` confirms server operational status and uptime.

---

## 3. Database Technology, Schema, and Migration Strategy

### Database Technologies Identified
1. **Primary / Authoritative (Team C)**: **PostgreSQL / Supabase**
   - Schema defined across 3 canonical SQL migrations in `database/migrations/`:
     - `001_core.sql`: Defines `public.profiles` (with check constraint `role in ('student','faculty','lab_admin')`), `public.campus_nodes`, `public.campus_edges`, `public.labs`, `public.resources`, and `public.bookings` (enforcing PostgreSQL `tstzrange` exclusion constraints preventing overlapping resource leases).
     - `002_inventory.sql`: Implements the 3NF dead-stock schema (`equipment_categories`, `suppliers`, `equipment_models`, `purchase_batches`, `asset_events`).
     - `003_booking_cancellation.sql`: Implements `booking_cancellations` log table, cancellation audit triggers, and atomic cancellation procedures.
2. **Secondary / Legacy MERN Stack**: **MongoDB / Mongoose**
   - Defined in `backend/src/config/database.ts` and `docker-compose.yml` (`smart_campus_optimizer` on `mongodb://localhost:27017`).
3. **Resilient Persistence Layer (`campusDb` / `postgres.ts`)**:
   - `backend/src/config/postgres.ts` safely connects to PostgreSQL when `DATABASE_URL` is configured in `backend/.env`.
   - When running locally without a live PostgreSQL instance, the backend transparently utilizes the pre-seeded, memory-persistent repository (`backend/src/modules/persistence/database.ts`), which holds all 12 RIT labs, 28 procurement batches, 55 equipment models, and campus spatial graph nodes.

---

## 4. Implemented API Endpoints (Shared Contract)

| HTTP Method & Path | Authorization | Module / Handler | Verified Operation |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/health` | Public | System Health | Returns status `ok` and uptime timestamp |
| `POST /api/v1/auth/login` | Public | Auth | Authenticates credentials, signs JWT session |
| `POST /api/v1/auth/register` | Public | Auth | Registers student profile, returns JWT |
| `GET /api/v1/auth/me` | Bearer Token | Auth | Returns authenticated user & verified role |
| `POST /api/v1/auth/logout` | Public | Auth | Clears active session |
| `GET /api/v1/inventory/labs` | Public | Inventory | Lists 12 campus departmental labs |
| `GET /api/v1/inventory/summary` | Public | Inventory | Returns 3NF dead-stock batches & models |
| `GET /api/v1/inventory/models` | Public | Inventory | Returns procurement equipment specifications |
| `GET /api/v1/inventory/batches` | Public | Inventory | Returns asset procurement batches & warranty |
| `GET /api/v1/inventory/equipment` | Public | Inventory | Returns workstation hardware assets |
| `GET /api/v1/resources/available` | Student/All | Resources | Dynamic seat availability by lab & time range |
| `POST /api/v1/bookings` | Authenticated | Bookings | Creates reservation; blocks overlap with 409 |
| `GET /api/v1/bookings/my` | Authenticated | Bookings | Returns logged-in student's reservations |
| `GET /api/v1/bookings/:id` | Authenticated | Bookings | Returns single reservation details |
| `POST /api/v1/bookings/:id/cancel` | Authenticated | Bookings | Cancels booking & releases workstation seat |
| `POST /api/v1/labs/:id/maintenance` | Admin / Lab Asst | Labs | Toggles maintenance; suspends student bookings |
| `GET /api/v1/maintenance` | Authenticated | Maintenance | Retrieves maintenance work order records |
| `POST /api/v1/maintenance` | Admin / Lab Asst | Maintenance | Logs new laboratory maintenance work order |
| `GET /api/v1/monitoring/overview` | Authenticated | Monitoring | Real-time facility occupancy and alerts |
| `GET /api/v1/monitoring/alerts` | Authenticated | Monitoring | Active maintenance and facility notifications |
| `GET /api/v1/reports/dashboard` | Authenticated | Reports | Lab utilization & booking trends metrics |
| `GET /api/v1/routes/nodes` | Public | Routing | 6 spatial campus graph landmarks/labs |
| `POST /api/v1/routes/compute` | Public | Routing | Dijkstra / A* path computation with distances |
| `GET /api/v1/routes/algorithms` | Public | Routing | Supported algorithms (`dijkstra`, `astar`) |

---

## 5. Discovered Issues & Resolved Discrepancies

1. **Role Constraint Mismatch**:
   - In Supabase PostgreSQL, `profiles.role` allows `student`, `faculty`, `lab_admin`.
   - In frontend/backend canonical roles, the allowed values were `student`, `faculty`, `admin`.
   - **Fix Applied**: Implemented canonical normalization in `authenticate.ts` and `requireRole.ts` mapping `lab_admin` to `admin` so Lab Assistants can execute administrative operations without 403 Forbidden errors.
2. **MongoDB Mongoose Buffer Timeout**:
   - In offline local environments where MongoDB is not running, Mongoose calls buffered for 10 seconds before rejecting.
   - **Fix Applied**: Guarded all MongoDB queries with `mongoose.connection.readyState === 1`. In offline mode, the backend queries the persistence repository (`campusDb`) instantly (< 5ms response time).
3. **Missing Maintenance, Monitoring & Reports Routes**:
   - Frontend `ApiMaintenanceService`, `ApiMonitoringService`, and `ApiReportsService` called endpoints that were previously unmounted.
   - **Fix Applied**: Implemented `maintenance.routes.ts`, `monitoring.routes.ts`, and `reports.routes.ts` and mounted them in `backend/src/app.ts`.
4. **Maintenance Reason Serialization**:
   - Lab JSON serialization omitted `maintenanceStatus` in `findLabByIdOrCode`.
   - **Fix Applied**: Updated `toJSON` in `lab.routes.ts` to output `maintenanceStatus`.
5. **Mock Mode Deprecation**:
   - The frontend formerly had demo role-switching buttons and Mock Mode toggles.
   - **Fix Applied**: Completely removed all mock/demo toggles; configured `frontend/src/services/index.ts` to operate strictly in Real API mode.

---

## 6. Build and Test Verification

1. **Backend Integration Suite**:
   - Command: `node test_integration.cjs`
   - Result: **18/18 test suites passed with exit code 0**.
2. **Backend TypeScript Compilation**:
   - Command: `npm run build --prefix backend` (`tsc`)
   - Result: **0 errors, exit code 0**.
3. **Frontend Production Build**:
   - Command: `npm run build --prefix frontend` (`tsc && vite build`)
   - Result: **Built successfully in 8.56s, exit code 0**.

---

## 7. Ordered Integration & Execution Guide

To run the complete integrated application locally:

```bash
# 1. Install all dependencies across root, backend, and frontend
npm run install:all

# 2. Run both applications concurrently
npm run dev

# Or start services in separate terminals:
# Terminal 1: Backend
npm run dev:backend
# Terminal 2: Frontend
npm run dev:frontend
```

### Pre-Seeded Academic Credentials for Local Testing
* **Student Account**: `student@ritindia.edu` / `password123` (Role: `student`)
* **Faculty Account**: `faculty@ritindia.edu` / `password123` (Role: `faculty`)
* **Lab Assistant / Admin**: `admin@ritindia.edu` / `password123` (Role: `admin`)
