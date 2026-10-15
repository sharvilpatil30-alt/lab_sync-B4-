# Smart Campus Lab & Resource Optimizer (`lab_sync-B4-`)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791.svg)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ECF8E.svg)](https://supabase.com/)

A full-stack campus management and optimization platform built to orchestrate computer laboratory reservations, hardware asset allocation, turn-by-turn indoor wayfinding, and real-time lab utilization analytics. 

Developed as a modular monorepo, the platform combines Operating System scheduling algorithms, graph-based routing theories, ACID-compliant database transactions, and a glassmorphic React frontend.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Subsystem Architecture](#subsystem-architecture)
- [Project Folder Structure](#project-folder-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup Instructions](#installation-and-setup-instructions)
- [Environment Variables and Configuration](#environment-variables-and-configuration)
- [How to Run the Project](#how-to-run-the-project)
- [Usage Instructions](#usage-instructions)
- [Testing and Verification Steps](#testing-and-verification-steps)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Contributing Guidelines](#contributing-guidelines)
- [License](#license)

---

## Project Overview

In higher education institutions, computing laboratories frequently face high contention, uncoordinated scheduling, double bookings, lack of visibility into available workstations, and untracked dead-stock inventory. 

**Smart Campus Lab & Resource Optimizer** solves these operational challenges across the Computer Science & Engineering (CSE) department through a unified web portal. The system models physical campus infrastructure (12 departmental labs, 18 graph nodes, and individual workstations), enforces strict concurrency controls, and provides role-tailored dashboards for students, faculty members, and lab administrators.

---

## Objectives

1. **Eliminate Resource Contention & Overlaps**: Guarantee conflict-free bookings using PostgreSQL exclusion constraints (`btree_gist`) and atomic transactions.
2. **Apply Core Operating System Principles**: Implement and evaluate OS scheduling algorithms (FCFS, SJF, Round Robin, Priority) and priority-based resource preemption (faculty over student) for physical lab sessions.
3. **Campus Indoor Wayfinding**: Provide deterministic shortest-path navigation across department corridors and labs using Dijkstra and Bellman-Ford algorithms on an interactive, self-contained SVG map (requiring no external paid map API keys).
4. **Third Normal Form (3NF) Inventory Tracking**: Structure and maintain physical equipment records (purchase batches, hardware specifications, vendors, and dead-stock status) in strict relational 3NF.
5. **Role-Based Operational Oversight**: Empower students to discover and book seats, faculty to book workstations or entire labs, and administrators to track live occupancy, manage maintenance, and analyze long-term utilization.

---

## Key Features

### 1. Multi-Tier Role-Based Access Control
- **Student**: Browse active laboratories, view real-time seat availability, book individual workstations, receive displacement notifications, and navigate to assigned rooms.
- **Faculty**: Reserve individual workstations or **Entire Laboratories** for instructional sessions, preview potential booking conflicts before confirming, and displace lower-priority student reservations when necessary with explicit confirmation.
- **Lab Administrator**: Manage laboratory capacities and metadata, toggle operational and maintenance modes, inspect historical audit logs, monitor system health, and generate resource utilization reports.

### 2. ACID-Compliant Booking Engine
- **Atomic State Transitions**: Bookings progress through structured states (`REQUESTED`, `VALIDATED`, `QUEUED`, `LEASED`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `COMPENSATION_REQUIRED`).
- **PostgreSQL Concurrency Guarantees**: Stored procedures (`commit_booking`, `cancel_booking`, `compensate_booking`) execute inside transactions with `SET LOCAL lock_timeout = '8s'` and GIST exclusion constraints on `booking_claims` to physically prevent double-booking at the database engine level.
- **Full Audit Trail**: Every booking state change, cancellation reason, profile edit, and inventory update is logged to `public.audit_log`.

### 3. Operating System Scheduling & Preemption (Team A)
- **Configurable Policies**: First-Come First-Served (FCFS), Shortest Job First (SJF), Round Robin, and Priority scheduling.
- **Deadlock Avoidance & Locks**: In-memory and transactional lock management to safeguard shared workstation assignments.
- **Faculty Preemption**: Faculty whole-lab reservations gracefully cancel overlapping student sessions with logged notifications and atomic resource reclamation.

### 4. Graph-Based Campus Wayfinding (Team B)
- **Department Topology**: Accurately models the 18-node CSE building network covering all 12 labs (`D-01` through `D-12`), main entrances, and corridor intersections.
- **Multiple Graph Algorithms**: Live path calculation supporting **Dijkstra** (default shortest path), **Bellman-Ford**, **Breadth-First Search (BFS)**, and **Depth-First Search (DFS)**.
- **Offline Interactive SVG Map**: Interactive SVG canvas displaying real walking paths, cumulative step distances, and estimated travel times without relying on Google Maps or external map tile servers.

### 5. 3NF Hardware & Dead-Stock Inventory (Team C)
- **Normalized Relational Models**: Categorized into equipment categories, suppliers, equipment models, purchase batches, asset lifecycle events, and component-specific specification tables (`computer_specs`, `laptop_specs`, `printer_specs`, `projector_specs`, `ups_specs`, `network_switch_specs`).
- **Procurement & Financial History**: Tracks register serial numbers, original/current quantities, unit rates, source registers, and total lab investments.

### 6. Modern Responsive UI/UX (Team D)
- **Glassmorphic Design**: Built with Tailwind CSS, custom glass panels, accessible form inputs, and responsive desktop/mobile layouts.
- **Data Visualizations**: Integrated Recharts components for lab utilization rates, peak usage hour trends, and queue resolution metrics.
- **Client Cache & State**: Efficient server-state caching, background re-validation, and optimistic updates powered by TanStack Query.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Monorepo Runtime** | **Node.js** | `>=20.0.0` (LTS) | Unified JavaScript/TypeScript runtime with npm workspaces |
| **Frontend Framework** | **React** | `^18.3.1` | Component-driven user interface with StrictMode |
| **Frontend Build Tool** | **Vite** | `^5.2.13` | Fast local HMR, Rollup production bundling, and proxying |
| **Frontend Language** | **TypeScript** | `^5.4.5` | Strict end-to-end type safety for components and services |
| **Styling & Design** | **Tailwind CSS** | `^3.4.4` | Utility-first CSS with glassmorphism utility classes |
| **Client Routing** | **React Router DOM**| `^6.23.1` | Nested layouts (`StudentLayout`, `FacultyLayout`, `AdminLayout`) and guards |
| **Server State Cache**| **TanStack Query** | `^5.40.0` | Query caching, background refetching, and mutation invalidation |
| **Forms & Validation** | **React Hook Form + Zod** | `^7.51` / `^3.23` | High-performance uncontrolled form state and schema validation |
| **Data Visualizations**| **Recharts** | `^2.12.7` | Responsive SVG charts for lab analytics and booking trends |
| **Icons** | **Lucide React** | `^0.390.0` | Tree-shakable clean icon set |
| **Backend Framework** | **Express.js** | `^4.19.2` | REST API routing, custom error handling, and middleware |
| **Backend Runtime** | **Node.js + tsx** | `^4.15.2` | Fast TypeScript execution with live reload in development |
| **Database Engine** | **PostgreSQL** | `15+` / `16` | Relational database with stored procedures, RLS, and GIST indexing |
| **Database Access** | **pg (node-postgres)** | `^8.23.1` | Connection pooling (`PoolClient`) and transactional query client |
| **Identity & Auth** | **Supabase Auth** | `^2.117.3` | Institutional email authentication (`@ritindia.edu`) and JWT sessions |
| **Security** | **Helmet & CORS** | `^7.1` / `^2.8` | HTTP security headers and strictly configured CORS origins |

> **Note on MongoDB / Mongoose**: Early project prototypes explored MongoDB (reflected in `docker-compose.yml` and unused model declarations). The production runtime relies on PostgreSQL for relational integrity, transactions, and stored procedures.

---

## Subsystem Architecture

The project is structured as a monorepo partitioned into four functional subsystems:

```
                            +----------------------------------------+
                            |          Client Browser (UI)           |
                            |   React 18 + Vite + Tailwind + SVG     |
                            +-------------------+--------------------+
                                                |
                                    HTTP / JSON API Requests
                                    Bearer JWT Auth Header
                                                v
                            +----------------------------------------+
                            |     Express.js Application Gateway     |
                            |     (CORS, Helmet, Auth Middleware)    |
                            +-------------------+--------------------+
                                                |
         +----------------------+---------------+----------------------+----------------------+
         |                      |                                      |                      |
         v                      v                                      v                      v
+-----------------+   +--------------------+                 +--------------------+   +-------------------+
|     Team A      |   |       Team B       |                 |       Team C       |   |      Team D       |
|  OS Scheduling  |   |   Campus Routing   |                 |   ACID Bookings    |   |    Frontend &     |
|   & Preemption  |   |   Engine & Graph   |                 |  & 3NF Inventory   |   |   Client State    |
| (FCFS/SJF/RR/P) |   | (Dijkstra/Bellman) |                 | (Postgres Trx/RLS) |   |  (TanStack Query) |
+-----------------+   +--------------------+                 +--------------------+   +-------------------+
         |                      |                                      |                      |
         +----------------------+---------------+----------------------+----------------------+
                                                |
                                      SQL Queries / Stored RPCs
                                                v
                            +----------------------------------------+
                            |         PostgreSQL Database            |
                            |  - Profiles & Institutional Roles      |
                            |  - Labs & Hardware Resources           |
                            |  - Bookings & GIST Exclusion Claims    |
                            |  - Scheduling Decisions & Audit Log    |
                            |  - 3NF CSE Hardware Inventory Batches  |
                            +----------------------------------------+
```

### Subsystem Responsibilities

1. **Team A (Scheduling & OS Simulation)**: Implements task queues, priority scheduling policies, and conflict resolution rules when lab capacity is exceeded.
2. **Team B (Topology & Wayfinding)**: Maintains the coordinate grid and weighted adjacency matrix for the CSE department building, computing step-by-step navigational directions.
3. **Team C (Database, Inventory, & Transactions)**: Manages relational schemas, database migrations, atomic PL/pgSQL procedures, audit logs, and hardware dead-stock procurement records.
4. **Team D (Frontend Experience)**: Delivers an interactive web portal featuring role-tailored dashboards, booking wizards, interactive SVG path renderers, and analytics.

---

## Project Folder Structure

```
lab_sync-B4-/
├── package.json                   # Root monorepo workspace configuration
├── package-lock.json              # Authoritative lockfile for dependencies
├── .env.example                   # Master environment variable reference
├── docker-compose.yml             # Docker composition for database services
├── render.yaml                    # Cloud deployment blueprint (Render web service)
├── schema.sql                     # Base Supabase schema (profiles, labs, bookings, RLS)
├── inventory_extension_3NF.sql    # 3NF relational schema extension for CSE inventory
├── metadata.json                  # Monorepo metadata description
├── database/                      # Database scripts and migration assets
│   ├── migrations/                # Versioned SQL migrations
│   │   ├── 001_core.sql           # Base tables, RLS policies, commit_booking()
│   │   ├── 002_inventory.sql      # 3NF equipment models, categories, purchase batches
│   │   ├── 003_booking_cancellation.sql # Atomic cancel_booking() stored procedure
│   │   ├── 004_resource_availability.sql # Resource status and commit updates
│   │   └── 005_whole_lab_bookings.sql   # Whole-lab reservations and GIST claims table
│   └── import/                    # Inventory import utilities and raw dataset
│       ├── import_inventory.cjs   # Batch processor for parsed inventory data
│       └── inventory.json         # Normalized inventory JSON records
├── backend/                       # Node.js + Express + TypeScript modular backend
│   ├── package.json               # Backend dependencies, test scripts, and build tasks
│   ├── tsconfig.json              # TypeScript configuration for backend modules
│   ├── .env.example               # Backend environment variable template
│   ├── scripts/                   # Automated regression and verification suites
│   │   ├── verify-auth.cjs        # Middleware role verification tests
│   │   ├── verify-faculty.cjs     # Isolated PostgreSQL faculty preemption tests
│   │   ├── verify-http.cjs        # Live HTTP endpoint integration checks
│   │   ├── verify-live.cjs        # Database live connection assertions
│   │   └── verify-rollback.cjs    # Transaction failure rollback assertions
│   └── src/
│       ├── server.ts              # Server startup and listener entry point
│       ├── app.ts                 # Express configuration and API router bindings
│       ├── config/                # PostgreSQL connection pool (postgres.ts) and env parsing
│       ├── middleware/            # Supabase JWT authentication & error handling
│       └── modules/               # Domain feature modules
│           ├── admin/             # Lab/resource metadata updates, audits, reports
│           ├── auth/              # Institutional profile routes (/auth/me, /auth/logout)
│           ├── bookings/          # Transactional booking logic and route handlers
│           ├── inventory/         # 3NF batches, equipment models, and lab summaries
│           ├── labs/              # Active lab listings, capacities, and availability
│           ├── monitoring/        # Live occupancy counters and maintenance alerts
│           ├── notifications/     # Audit-driven user notification endpoints
│           ├── resources/         # Live seat-level availability and workstation status
│           ├── routing/           # Graph topology, Dijkstra/Bellman-Ford algorithms
│           └── scheduling/        # Scheduling policy engine and concurrency locks
├── frontend/                      # React 18 + Vite + TypeScript frontend
│   ├── package.json               # Frontend dependencies and scripts
│   ├── vite.config.ts             # Vite dev server configuration and /api proxy
│   ├── tailwind.config.js         # Custom Tailwind theme tokens and glassmorphism
│   ├── tsconfig.json              # Frontend TypeScript configuration
│   ├── .env.example               # Frontend environment variable template
│   ├── tests/                     # Automated frontend test suites
│   │   └── integration.test.ts    # Graph mapping, adapter, and routing integration tests
│   └── src/
│       ├── App.tsx                # Root application component
│       ├── main.tsx               # DOM entry point and React root mount
│       ├── components/            # UI components (buttons, dialogs, badges, SVG canvas)
│       ├── hooks/                 # Custom React hooks (useAuth, useLabs, etc.)
│       ├── layouts/               # Role-based shell layouts (Student, Faculty, Admin, Auth)
│       ├── pages/                 # Role pages (student, faculty, admin, auth)
│       ├── routes/                # Protected routes and role-based redirects
│       └── services/              # API abstraction layer calling /api/v1 endpoints
└── docs/                          # Architecture specifications, diagrams, and test reports
```

---

## Prerequisites

Before running the application, ensure the following tools are installed:

- **Node.js**: `v20.x` or later (LTS recommended; tested with Node `v20`, `v22`, and `v24`).
- **npm**: `v9.x` or later (bundled with Node.js).
- **PostgreSQL Database**: A running PostgreSQL instance (v15 or v16) with permissions to create extensions (`uuid-ossp`, `btree_gist`). You can use:
  - A hosted **[Supabase](https://supabase.com/)** PostgreSQL project (recommended), or
  - A local PostgreSQL database server.
- **Supabase Account**: Required for user authentication and session management.
- **Git**: For version control.

---

## Installation and Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/sharvilpatil30-alt/lab_sync-B4-.git
cd lab_sync-B4-
```

### 2. Install Dependencies

Install all root, backend, and frontend dependencies via npm workspaces from the project root:

```bash
npm ci
```

*(Alternatively, use `npm install` if you are adding new dependencies).*

### 3. Database Initialization & Migration

Execute the migration scripts in sequential order against your PostgreSQL database (via the Supabase SQL Editor or `psql` command-line utility):

1. **`database/migrations/001_core.sql`**: Sets up extensions (`uuid-ossp`), core tables (`profiles`, `campus_nodes`, `campus_edges`, `labs`, `resources`, `bookings`, `scheduling_decisions`, `routes`, `audit_log`), Row Level Security policies, and the `commit_booking()` / `compensate_booking()` functions.
2. **`database/migrations/002_inventory.sql`**: Creates the 3NF hardware inventory tables (`equipment_categories`, `suppliers`, `equipment_models`, `purchase_batches`, `asset_events`, specification sub-tables).
3. **`database/migrations/003_booking_cancellation.sql`**: Installs the atomic `cancel_booking()` stored procedure with state validation and resource release.
4. **`database/migrations/004_resource_availability.sql`**: Enhances resource constraints and atomic allocation handling.
5. **`database/migrations/005_whole_lab_bookings.sql`**: Adds the `booking_scope` column (`WORKSTATION` / `WHOLE_LAB`), creates the `booking_claims` table with a GIST exclusion constraint (`EXCLUDE USING gist`), and installs the `booking_claims_refresh` trigger.

*(Optional)* To populate sample 3NF inventory equipment data:
```bash
node database/import/import_inventory.cjs
```

---

## Environment Variables and Configuration

Both the backend and frontend require environment configuration files. Copy the provided `.env.example` templates:

```bash
# From the project root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend Configuration (`backend/.env`)

Configure the following variables in `backend/.env`:

```ini
# PostgreSQL connection string (Supabase connection pooler or direct URI)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres?sslmode=require

# Supabase API Credentials
SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Port for Express API server
BACKEND_PORT=5000

# Allowed CORS client URL (Frontend origin)
CLIENT_URL=http://localhost:5173

# Application runtime environment (development, production, test)
NODE_ENV=development
```

### Frontend Configuration (`frontend/.env`)

Configure the following variables in `frontend/.env`:

```ini
# Base URL prefix for backend REST API (defaults to /api/v1 via Vite proxy)
VITE_API_BASE_URL=/api/v1

# Supabase Public API Credentials (matching the backend project)
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

> [!IMPORTANT]
> - Never commit `.env` files or hardcode real database passwords or service-role keys into Git.
> - The frontend `VITE_SUPABASE_ANON_KEY` is public by design and must only contain the client `anon` key, never the administrative `service_role` key.
> - User signups are automatically validated against institutional email addresses ending in `@ritindia.edu`.

---

## How to Run the Project

### Running in Development Mode

Run the backend and frontend concurrently in two separate terminal windows from the repository root:

#### Terminal 1: Backend Server
```bash
npm run dev:backend
```
*The Express API server starts on `http://localhost:5000` with `tsx watch` enabled for auto-reloading.*

#### Terminal 2: Frontend Application
```bash
npm run dev:frontend
```
*The Vite development server starts on `http://localhost:5173` with fast Hot Module Replacement (HMR). The Vite server automatically proxies `/api` requests to `http://127.0.0.1:5000`.*

Open your browser and navigate to: **`http://localhost:5173`**

---

### Running in Production Mode (Unified Server)

In production environments (or on hosting platforms like Render), the backend Express server can compile and serve the static frontend bundle alongside the API:

1. **Build both workspaces**:
   ```bash
   npm run build --workspace=backend
   npm run build --workspace=frontend
   ```

2. **Start the production server**:
   ```bash
   # On Windows (PowerShell)
   $env:SERVE_FRONTEND="true"; $env:NODE_ENV="production"; $env:PORT="5000"; npm start --workspace=backend

   # On Linux / macOS
   SERVE_FRONTEND=true NODE_ENV=production PORT=5000 npm start --workspace=backend
   ```

3. Access the unified application at: **`http://localhost:5000`**

---

## Usage Instructions

### 1. Authentication & Role Assignment
- Navigate to `/login` or `/signup`.
- Sign up with an institutional email format:
  - **Student**: `[student_id]@ritindia.edu` (e.g., `2101001@ritindia.edu`).
  - **Faculty**: Approved departmental email prefix (e.g., `faculty.name@ritindia.edu`). The user must match an active record in `public.faculty`.
  - **Admin**: Configured with `role = 'admin'` or `role = 'lab_admin'` in `public.profiles`.

### 2. Student Workflow
1. Log in to access the **Student Dashboard** (`/student/dashboard`).
2. Navigate to **Labs** (`/student/labs`) to view capacity, occupancy, and equipment status.
3. Select an open lab and click **Book Workstation** (`/student/bookings/create`).
4. Select a future date and timeslot, choose an available workstation, and submit the booking.
5. In **My Bookings** (`/student/bookings`), inspect booking status or view the route.
6. Click **View Route** (`/student/route`) to display interactive turn-by-turn navigation on the CSE building SVG map.

### 3. Faculty Workflow
1. Log in to access the **Faculty Dashboard** (`/faculty/dashboard`).
2. Navigate to **Bookings -> Create Booking** (`/faculty/bookings/create`).
3. Choose between **Single Workstation** or **Entire Lab**:
   - In **Entire Lab** mode, all individual workstations in the target lab are claimed for the selected slot.
4. Review the real-time **Conflict Preview**. If student sessions overlap, the system presents an explicit displacement confirmation dialog.
5. Confirm the reservation. Displaced student bookings are atomically marked `CANCELLED`, notifications are generated, and claims are locked to the faculty session.

### 4. Administrator Workflow
1. Access the **Admin Dashboard** (`/admin/dashboard`) to view live campus statistics.
2. In **Labs & Resources** (`/admin/labs`, `/admin/resources`), update lab capacity, rename resources, or switch individual workstations into `MAINTENANCE` mode.
3. Access **Monitoring** (`/admin/monitoring`) to see real-time active/queued bookings and active maintenance alerts.
4. Access **Reports** (`/admin/reports`) to filter utilization metrics, peak hours, and booking distributions by custom date ranges.
5. View **Inventory** (`/admin/inventory`) to inspect 3NF hardware procurement records and dead-stock assets.

---

## Testing and Verification Steps

The codebase includes automated test suites covering backend algorithms, graph properties, API routing contracts, and frontend mapping logic.

### 1. Backend Routing & Graph Tests
Validates all 12 CSE labs, all 4 graph traversal algorithms (Dijkstra, Bellman-Ford, BFS, DFS), and cross-checks all 324 ordered node pairs against an independent Floyd-Warshall shortest-path oracle:

```bash
npm run test:routing --workspace=backend
```

### 2. Frontend Integration Tests
Validates node identifier resolution, coordinate interpolation, adapter mapping for bookings/labs/resources, and API contract failure handling:

```bash
npm run test:integration --workspace=frontend
```

### 3. Backend Full Test Suite
Executes all compiled backend unit and routing tests:

```bash
npm run test --workspace=backend
```

### 4. Code Quality & Linting
Run static type checks and ESLint across the workspaces:

```bash
# Type check and build compilation
npm run build --workspace=backend
npm run build --workspace=frontend

# Linting
npm run lint --workspace=backend
npm run lint --workspace=frontend
```

### 5. Automated Health Check Endpoint
When the backend is running, verify the API health status:

```bash
curl http://localhost:5000/api/v1/health
```

Expected JSON response:
```json
{
  "success": true,
  "message": "Smart Campus Lab & Resource Optimizer API is healthy",
  "data": {
    "status": "ok",
    "environment": "development"
  }
}
```

---

## Troubleshooting Common Issues

### 1. `Error: DATABASE_URL is missing from the environment`
- **Cause**: The backend server was started without a valid `backend/.env` file or the `DATABASE_URL` key is unset.
- **Resolution**: Ensure `backend/.env` exists and contains a valid PostgreSQL connection string.

### 2. `tsc` is not recognized as an internal or external command
- **Cause**: Project dependencies have not been installed in the workspace.
- **Resolution**: Run `npm ci` from the repository root to install all required developer dependencies.

### 3. Database Connection Failure / SSL Error
- **Cause**: Connecting to Supabase without SSL or using an invalid database password.
- **Resolution**: Append `?sslmode=require` to your PostgreSQL connection string in `backend/.env`. Check that your Supabase database instance is active and not paused.

### 4. Port Conflict (`EADDRINUSE: address already in use :::5000` or `:::5173`)
- **Cause**: Another process or previous server instance is already running on port 5000 or 5173.
- **Resolution**: Terminate the conflicting process or change the port by setting `BACKEND_PORT=5001` in `backend/.env`.

### 5. `403 Forbidden: Use your verified institutional email`
- **Cause**: User attempted to sign up or log in with a non-institutional email.
- **Resolution**: The authentication middleware requires email addresses ending in `@ritindia.edu`. For testing, ensure your account matches the accepted institutional format.

### 6. `409 Conflict: Scheduling conflict: reservation already exists`
- **Cause**: PostgreSQL's GIST exclusion constraint detected a timeslot overlap for the selected workstation or whole-lab claim.
- **Resolution**: Select an alternative timeslot or workstation that is not currently booked.

---

## Contributing Guidelines

1. **Create a Dedicated Branch**: Never commit directly to the `main` branch. Create a feature or bugfix branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Follow Coding Standards**:
   - Write clean, type-safe TypeScript code with explicit types.
   - Run `npm run lint --workspace=backend` and `npm run lint --workspace=frontend` before submitting code.
3. **Verify Tests**:
   - Ensure `npm run test:routing --workspace=backend` and `npm run test:integration --workspace=frontend` pass cleanly.
4. **Submit a Pull Request**: Push your branch to GitHub and open a Pull Request against `main` with a clear explanation of your changes.

---

## License

No explicit open-source license file is currently present in this repository. All rights are reserved by the original project authors and contributors. 

If this project is distributed or published open-source, consider adding a recognized open-source license (such as the [MIT License](https://opensource.org/licenses/MIT) or [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0)).
