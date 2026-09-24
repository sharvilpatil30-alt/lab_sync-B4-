# Technology Stack Specification

**Smart Campus Lab & Resource Optimizer**  
*Document Version: 1.0.0*  
*Last Updated: 2026-09-23*  
*Scope: Monorepo Frontend Architecture & Technology Alignment*

---

## 1. Overview & Architectural Principles

The frontend has been built strictly adhering to modern TypeScript standards and the project's preferred technology choices. The stack preserves lightweight, robust dependencies while avoiding extraneous packages.

Key Architectural Tenets:
1. **100% TypeScript Coverage**: Zero `.js` or `.jsx` files in `frontend/src`. Every component, hook, service, and data fixture is strictly typed.
2. **Modular Service Abstraction**: Centralized API client using Axios with JWT bearer injection and 401 handling, fully decoupled from page components via TypeScript interfaces.
3. **Zero External Map Key Dependencies**: Interactive SVG topology canvas providing crisp, offline-capable wayfinding without requiring Google Maps or third-party tiles.
4. **Performance & Bundle Discipline**: Tree-shakable Lucide icons, native CSS glassmorphism and Tailwind tokens, avoiding heavy UI component kit bloat.

---

## 2. Technology Stack Inventory & Alignment

| Technology Layer | Selected Tool / Library | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Core Framework** | **React** | `^18.3.1` | Modern component-driven UI with Concurrent Mode support and strict DOM lifecycle management. |
| **Language** | **TypeScript** | `^5.4.5` | Strict compile-time safety, complete type definition for domain entities, filters, and API envelopes. |
| **Build & Dev Tool** | **Vite** | `^5.2.13` | Fast HMR, Rollup-based production chunking, and native ESM support with `@vitejs/plugin-react`. |
| **Client Routing** | **React Router DOM** | `^6.23.1` | Role-based layout nesting (`AuthLayout`, `StudentLayout`, `FacultyLayout`, `AdminLayout`), `ProtectedRoute`, and `RoleRoute` guards. |
| **Styling & Design** | **Tailwind CSS** | `^3.4.4` | Utility-first CSS configured with custom color tokens, glassmorphism (`glass-panel`, `glass-card`), and responsive design breakpoints. |
| **UI Utility** | **tailwind-merge & clsx** | `^2.3.0` / `^2.1.1` | Conditional styling and safe class merging for reusable components without style clashes. |
| **Component Library** | **Custom shadcn/ui-inspired primitives** | Hand-crafted | Button, Input, Select, DatePicker, Modal, ConfirmDialog, Table, Pagination, Search, StatusBadge, Skeleton, Spinner, ErrorMessage, EmptyState, Toast, Breadcrumbs, SystemHealthIndicator. |
| **Server State & Cache** | **TanStack Query** | `^5.40.0` | Global query caching, automatic deduplication, mutation invalidation, and configurable background polling (e.g. 20s heartbeat for live monitoring). |
| **Forms & Input** | **React Hook Form** | `^7.51.5` | High-performance uncontrolled form handling with minimal re-renders for the multi-step booking wizard. |
| **Schema Validation** | **Zod** | `^3.23.8` | Client and server validation for booking dates, times, capacity filters, and login credentials. |
| **Data Visualizations** | **Recharts** | `^2.12.7` | Responsive SVG charts for lab utilization rates, resource usage hours, and booking status trend lines. |
| **Iconography** | **Lucide React** | `^0.390.0` | Consistent, accessible icon set with tree-shakable ES imports. |
| **HTTP Client** | **Axios** | `^1.7.2` | Centralized `apiClient` with request interceptor for JWT injection and response interceptor for 401 session expiration. |
| **Campus Map / Topology** | **Custom SVG Topology Graph** | Hand-crafted | Interactive SVG wayfinding engine rendering campus buildings, nodes, corridors, and shortest path highlights without external tile dependencies. |
| **Linting & Quality** | **ESLint & Prettier** | `^8.57.0` / `^3.3.1` | `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` configured for clean code style enforcement. |

---

## 3. Strict Absence of Unnecessary Libraries

In accordance with project constraints, the following were deliberately avoided to maintain bundle efficiency and prevent security surface expansion:
- **No Heavy UI Bloat**: Avoided bulky full-suite UI libraries (e.g. Material UI, Ant Design, Chakra UI). The app uses tailored, accessible primitives styled with Tailwind CSS.
- **No Third-Party Map Key Dependencies**: Avoided Google Maps JS SDK or Mapbox GL dependencies requiring paid API tokens and external network access. The wayfinding module runs offline.
- **No Redundant State Managers**: Avoided Redux or MobX. Application state is handled cleanly via React Context (`AuthProvider`, `ToastProvider`) and TanStack Query server-state caching.
- **No Fake API Interceptors**: Avoided MirageJS or MSW in production builds; mock data is decoupled at the service interface level (`I*Service`).

---

## 4. Verification

- **Frontend Compilation**: `tsc && vite build` generates clean output bundles in under 8 seconds.
- **Lint Verification**: `eslint src --ext ts,tsx` executes with zero errors.
- **Runtime Modularity**: Supports seamless live switching between `mock` and `api` modes via `VITE_DATA_MODE` and localStorage toggle.
