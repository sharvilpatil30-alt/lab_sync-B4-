# Frontend-Backend Capability Matrix

**Smart Campus Lab & Resource Optimizer**  
*Document Version: 1.0.0*  
*Last Updated: 2026-09-23*  
*Target Environment: Node.js + Express (Backend) / React + Vite + TypeScript (Frontend)*

---

## 1. Executive Summary & Architecture Overview

This document provides a single source of truth mapping the relationship between **Backend Capabilities**, **HTTP Methods**, **Actual Repository Endpoints**, **Role Permissions**, **Frontend Pages**, **Frontend Components**, and **Integration Statuses**.

### Dual-Mode Data Architecture
The Smart Campus application employs a strict **Service-Abstraction Pattern** across both frontend and backend:
1. **Frontend Service Abstraction (`frontend/src/services/`)**:
   - All frontend pages and components consume strongly-typed interfaces defined in `frontend/src/services/types.ts`.
   - The runtime service factory (`frontend/src/services/index.ts`) reads `VITE_DATA_MODE` (`mock` | `api`) and allows live toggling via localStorage (`smart_campus_data_mode`).
   - In **Mock Mode (`mock`)**, mock implementations (`frontend/src/services/mock/*`) serve data with realistic network latency from JSON fixtures in `frontend/src/data/mock/`.
   - In **API Mode (`api`)**, real HTTP client adapters (`frontend/src/services/api/*`) communicate with the backend under `/api/v1` with automatic JWT bearer token attachment, standard envelope unwrapping, and centralized 401 session expiration handling.
2. **Backend Modular Architecture (`backend/src/`)**:
   - Standard REST base path: `/api/v1`
   - Global standard response envelopes:
     - Success: `{ success: true, message: string, data: T }`
     - Error: `{ success: false, message: string, errors?: string[] }`
     - Paginated: `{ success: true, data: T[], pagination: { page, limit, total, pages } }`
   - Layered architecture per domain: `routes -> controller -> service -> repository -> model`.

---

## 2. Frontend-Backend Capability Matrix Table

All endpoints listed below are the **actual endpoints discovered in the repository** (from `backend/src/app.ts` mount points and `frontend/src/services/api/*` client implementations).

| Backend Capability | HTTP Method | Endpoint | Role | Frontend Page | Frontend Component | Status |
|-------------------|-------------|----------|------|---------------|---------------------|--------|
| **Core System Health Check** | `GET` | `/api/v1/health` | Public / All | Global Navbar, Admin Monitoring (`/admin/monitoring`) | `SystemHealthIndicator`, `AdminMonitoringPage`, `Navbar` | **Active (Live in Backend)** |
| **User Authentication / Login** | `POST` | `/api/v1/auth/login` | Public | Login (`/login`) | `LoginPage` | Pending Backend (Mock Ready / API Client Configured) |
| **User Registration** | `POST` | `/api/v1/auth/register` | Public / Admin | Login / Register (`/login`) | `LoginPage` | Pending Backend (Mock Ready / API Client Configured) |
| **User Session Termination** | `POST` | `/api/v1/auth/logout` | `student`, `faculty`, `admin` | Global Navbar | `Navbar` (Logout action) | Pending Backend (Mock Ready / API Client Configured) |
| **Get Authenticated Session / Identity** | `GET` | `/api/v1/auth/me` | `student`, `faculty`, `admin` | All Authenticated Pages | `ProtectedRoute`, `RoleRoute`, `Navbar` | Pending Backend (Mock Ready / API Client Configured) |
| **Get Current User Profile** | `GET` | `/api/v1/users/me` | `student`, `faculty`, `admin` | Profile (`/:role/profile`) | `ProfilePage` | Pending Backend (Mock Ready / API Client Configured) |
| **Update Current User Profile** | `PATCH` | `/api/v1/users/me` | `student`, `faculty`, `admin` | Profile (`/:role/profile`) | `ProfilePage` | Pending Backend (Mock Ready / API Client Configured) |
| **List Labs with Filters & Search** | `GET` | `/api/v1/labs` | `student`, `faculty`, `admin` | Dashboard (`/:role/dashboard`), Lab Search (`/:role/labs`), Admin Labs (`/admin/labs`) | `LabFilterPanel`, `LabCard`, `AdminLabListPage`, `Dashboard` | Pending Backend (Mock Ready / API Client Configured) |
| **Get Lab Details by ID** | `GET` | `/api/v1/labs/:labId` | `student`, `faculty`, `admin` | Lab Details (`/:role/labs/:labId`), Admin Lab Edit (`/admin/labs/:labId`) | `LabDetailsPage`, `AdminLabDetailsPage`, `AvailabilityIndicator` | Pending Backend (Mock Ready / API Client Configured) |
| **Create Laboratory Facility** | `POST` | `/api/v1/labs` | `admin` | Admin Lab Management (`/admin/labs`) | `AdminLabListPage` (Create Lab Modal) | Pending Backend (Mock Ready / API Client Configured) |
| **Update Laboratory Details & Status** | `PATCH` | `/api/v1/labs/:labId` | `admin` | Admin Lab Details (`/admin/labs/:labId`) | `AdminLabDetailsPage` | Pending Backend (Mock Ready / API Client Configured) |
| **Delete Laboratory Facility** | `DELETE` | `/api/v1/labs/:labId` | `admin` | Admin Labs (`/admin/labs`, `/admin/labs/:labId`) | `AdminLabListPage`, `AdminLabDetailsPage`, `ConfirmDialog` | Pending Backend (Mock Ready / API Client Configured) |
| **List Resources with Filters** | `GET` | `/api/v1/resources` | `student`, `faculty`, `admin` | Lab Details (`/:role/labs/:labId`), Admin Resources (`/admin/resources`), Create Booking (`/:role/bookings/create`) | `ResourceTable`, `ResourceCard`, `BookingForm` | Pending Backend (Mock Ready / API Client Configured) |
| **Get Resource Details by ID** | `GET` | `/api/v1/resources/:resourceId` | `admin` | Admin Resource Details (`/admin/resources/:resourceId`) | `AdminResourceDetailsPage`, `ResourceStatus` | Pending Backend (Mock Ready / API Client Configured) |
| **Register New Hardware / Resource** | `POST` | `/api/v1/resources` | `admin` | Add Resource (`/admin/resources/add`, `/admin/resources/create`) | `AddResourcePage` | Pending Backend (Mock Ready / API Client Configured) |
| **Update Resource State & Specs** | `PATCH` | `/api/v1/resources/:resourceId` | `admin` | Admin Resource Details (`/admin/resources/:resourceId`) | `AdminResourceDetailsPage` (State action buttons) | Pending Backend (Mock Ready / API Client Configured) |
| **Delete / Decommission Resource** | `DELETE` | `/api/v1/resources/:resourceId` | `admin` | Admin Resources (`/admin/resources`, `/admin/resources/:resourceId`) | `AdminResourceListPage`, `AdminResourceDetailsPage`, `ConfirmDialog` | Pending Backend (Mock Ready / API Client Configured) |
| **List Own Bookings** | `GET` | `/api/v1/bookings` | `student`, `faculty` | Dashboard (`/:role/dashboard`), My Bookings (`/:role/bookings`) | `BookingCard`, `MyBookingsPage`, `StudentDashboard`, `FacultyDashboard` | Pending Backend (Mock Ready / API Client Configured) |
| **List All Campus Bookings** | `GET` | `/api/v1/admin/bookings` | `admin` | Admin Bookings (`/admin/bookings`), Admin Dashboard (`/admin/dashboard`) | `AdminAllBookingsPage`, `AdminDashboard` | Pending Backend (Mock Ready / API Client Configured) |
| **Get Booking Details & Queue State** | `GET` | `/api/v1/bookings/:bookingId` | `student`, `faculty`, `admin` | Booking Details (`/:role/bookings/:bookingId`) | `BookingDetailsPage`, `BookingSummary`, `BookingStatusTracker`, `QueueStatus` | Pending Backend (Mock Ready / API Client Configured) |
| **Create Booking & Schedule Slot** | `POST` | `/api/v1/bookings` | `student`, `faculty`, `admin` | Create Booking (`/:role/bookings/create`) | `BookingForm`, `CreateBookingPage` | Pending Backend (Mock Ready / API Client Configured) |
| **Cancel Booking & Release Workstation** | `PATCH` | `/api/v1/bookings/:bookingId/cancel` | `student`, `faculty`, `admin` | My Bookings (`/:role/bookings`), Booking Details (`/:role/bookings/:bookingId`) | `BookingCard`, `BookingDetailsPage`, `ConfirmDialog` | Pending Backend (Mock Ready / API Client Configured) |
| **Transition Booking Status (Admin Override)** | `PATCH` | `/api/v1/bookings/:bookingId/status` | `admin` | Booking Details (`/admin/bookings/:bookingId`) | `BookingDetailsPage` (Admin override controls) | Pending Backend (Mock Ready / API Client Configured) |
| **Calculate Campus Topology Route** | `GET` | `/api/v1/routes/:bookingId` | `student`, `faculty`, `admin` | Campus Route (`/:role/route/:bookingId`), Booking Details (`/:role/bookings/:bookingId`) | `RouteTopology` (SVG Graph), `RouteSummary`, `DistanceDisplay`, `CampusRoutePage` | Pending Backend (Mock Ready / API Client Configured) |
| **Live Operational Monitoring Overview** | `GET` | `/api/v1/monitoring/overview` | `admin` | Admin Monitoring (`/admin/monitoring`), Admin Dashboard (`/admin/dashboard`) | `AdminMonitoringPage`, `MonitoringCard`, `StatusOverview`, `AdminDashboard` | Pending Backend (Mock Ready / API Client Configured) |
| **List Live Operational Alerts** | `GET` | `/api/v1/monitoring/alerts` | `admin` | Admin Monitoring (`/admin/monitoring`) | `AlertList`, `AdminMonitoringPage` | Pending Backend (Mock Ready / API Client Configured) |
| **Resolve System Operational Alert** | `PATCH` | `/api/v1/monitoring/alerts/:alertId/resolve` | `admin` | Admin Monitoring (`/admin/monitoring`) | `AlertList` (Resolve action button) | Pending Backend (Mock Ready / API Client Configured) |
| **Campus Utilization & Booking Analytics** | `GET` | `/api/v1/reports/dashboard` | `admin` | Admin Reports (`/admin/reports`) | `AdminReportsPage`, `ChartContainer`, `UtilizationChart`, `BookingChart`, `ReportFilterPanel` | Pending Backend (Mock Ready / API Client Configured) |
| **List Maintenance Work Orders** | `GET` | `/api/v1/maintenance` | `admin` | Admin Maintenance (`/admin/maintenance`) | `AdminMaintenanceListPage` | Pending Backend (Mock Ready / API Client Configured) |
| **Get Maintenance Order by ID** | `GET` | `/api/v1/maintenance/:id` | `admin` | Admin Maintenance (`/admin/maintenance`) | `AdminMaintenanceListPage` (Detail modal) | Pending Backend (Mock Ready / API Client Configured) |
| **Schedule Facility/Resource Maintenance** | `POST` | `/api/v1/maintenance` | `admin` | Admin Maintenance (`/admin/maintenance`), Admin Resources (`/admin/resources/:resourceId`) | `AdminMaintenanceListPage` (Schedule Modal), `AdminResourceDetailsPage` | Pending Backend (Mock Ready / API Client Configured) |
| **Transition Maintenance Order Status** | `PATCH` | `/api/v1/maintenance/:id` | `admin` | Admin Maintenance (`/admin/maintenance`) | `AdminMaintenanceListPage` (Status action buttons) | Pending Backend (Mock Ready / API Client Configured) |
| **List User Notifications** | `GET` | `/api/v1/notifications` | `student`, `faculty`, `admin` | Global Navbar | `Navbar` (Notification Popover) | Pending Backend (Mock Ready / API Client Configured) |
| **Mark Single Notification as Read** | `PATCH` | `/api/v1/notifications/:id/read` | `student`, `faculty`, `admin` | Global Navbar | `Navbar` (Notification item click) | Pending Backend (Mock Ready / API Client Configured) |
| **Mark All Notifications as Read** | `POST` | `/api/v1/notifications/read-all` | `student`, `faculty`, `admin` | Global Navbar | `Navbar` ("Mark all as read" button) | Pending Backend (Mock Ready / API Client Configured) |

---

## 3. Discovered Backend Feature: UI Representation Created

### Feature: Backend Core Health Check (`GET /api/v1/health`)
- **Backend Location**: `backend/src/app.ts` (lines 28–38)
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "Smart Campus Lab & Resource Optimizer API is healthy",
    "data": {
      "status": "ok",
      "timestamp": "2026-09-23T14:45:00.000Z",
      "environment": "development"
    }
  }
  ```
- **Discovered Gap**: The backend endpoint existed, but the frontend did not have an interactive UI representation or telemetry probe consuming it.
- **Implemented Frontend UI**:
  1. **Telemetry Service Contract**:
     - Added `SystemHealthData` interface to `frontend/src/types/index.ts`.
     - Extended `IMonitoringService` in `frontend/src/services/types.ts` with `checkHealth(): Promise<ApiResponse<SystemHealthData>>`.
     - Implemented `ApiMonitoringService.checkHealth()` in `frontend/src/services/api/ApiMonitoringService.ts` calling `GET /health` with live roundtrip ping calculation.
     - Implemented `MockMonitoringService.checkHealth()` in `frontend/src/services/mock/MockMonitoringService.ts` for offline mock parity.
  2. **Reactive Hook**:
     - Added `useSystemHealth(refetchInterval)` to `frontend/src/hooks/useDataHooks.ts` for auto-polling telemetry every 25–30 seconds.
  3. **Visual UI Components**:
     - **`SystemHealthIndicator` (`frontend/src/components/common/SystemHealthIndicator.tsx`)**: An interactive status indicator component rendered in the top `Navbar` next to the Data Mode switcher. Features live status ping animation (green for healthy, red for offline), measured roundtrip latency in milliseconds, and an expandable popover showing endpoint `/api/v1/health`, environment, mode, and timestamp.
     - **`AdminMonitoringPage` (`frontend/src/pages/admin/Monitoring/index.tsx`)**: Added a dedicated "Backend Core Endpoint: `GET /api/v1/health`" live telemetry bar displaying real-time probe status, environment, latency, and heartbeat time.

---

## 4. Architectural Readiness for Pending Backend Endpoints

For all endpoints marked as **Pending Backend**, the frontend adheres to strict engineering guidelines to guarantee zero disruptions when real endpoints go live:

### 1. No Faking of Production APIs
- The application does not emulate HTTP endpoints by monkey-patching Axios or creating synthetic network intercepts.
- Instead, the architectural boundary sits squarely at the service layer via TypeScript interfaces (`IAuthService`, `ILabService`, `IBookingService`, etc.).

### 2. Clean Service Interfaces (`frontend/src/services/types.ts`)
- Every domain has a contract with explicit input types and return types wrapped in `Promise<ApiResponse<T>>`.
- Both `Mock*Service` and `Api*Service` classes implement the exact same interface.

### 3. Realistic Mock Implementations (`frontend/src/services/mock/*`)
- Fully functional in-memory and `localStorage`-backed implementations for offline presentation and Phase 1 testing.
- Includes realistic latency simulation (`setTimeout`) to test asynchronous loading skeletons and spinners.
- Preserves optimistic state mutations across page reloads (e.g. creating bookings, toggling resource maintenance status, updating profiles).

### 4. Production-Ready API Adapters (`frontend/src/services/api/*`)
- Fully written Axios API services targeting the standard endpoints.
- Ready to communicate with the Node/Express backend immediately upon mounting of the corresponding domain router in `backend/src/app.ts`.

---

## 5. Cross-Team Integration Points

| Integration Boundary | External Team | Target File / Module | Environment Variable | Current State & Interface Contract |
|----------------------|---------------|----------------------|----------------------|-------------------------------------|
| **Workstation Scheduling & Queue Optimization** | **Team A** | `backend/src/integrations/scheduling/` | `SCHEDULING_PROVIDER` (`basic` \| `external`) | `SchedulingService` interface defined. Default provider is `BasicSchedulingService` with deterministic slot-conflict checking. Stubbed `ExternalSchedulingAdapter` ready for Team A API integration. |
| **Campus Routing & Topology Algorithm** | **Team B** | `backend/src/integrations/routing/` | `ROUTING_PROVIDER` (`mock` \| `external`) | `RoutingService` interface defined. Default is `MockRoutingService` with campus graph topology (8–12 nodes) and shortest-path calculation. Stubbed `ExternalRoutingAdapter` ready for Team B integration. |
| **Core Database & Master Entity Schema** | **Team C** | `backend/src/config/database.ts`, `backend/src/modules/*/` | `CORE_DATA_PROVIDER` / `MONGODB_URI` | Mongoose schema definitions for `User`, `Lab`, `Resource`, `Booking`, `MaintenanceRecord`, `Notification`, and `Alert` matching specification. |

---

## 6. Verification and Parity Checklist

- [x] Actual backend endpoints discovered in repository without invented route names.
- [x] Backend capability `GET /api/v1/health` verified and integrated with new frontend UI (`SystemHealthIndicator` in `Navbar` and telemetry panel in `AdminMonitoringPage`).
- [x] Clear role access separation documented (`student`, `faculty`, `admin`).
- [x] All 10 main frontend pages mapped to corresponding components and service methods.
- [x] Full TypeScript type safety verified (`tsc && vite build` passing cleanly).
- [x] Architecture verified ready for seamless transition to backend API mode via `VITE_DATA_MODE=api`.
