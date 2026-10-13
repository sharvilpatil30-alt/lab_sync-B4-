# Team D frontend / Team B routing integration

Branch: `integration/final-delivery`. Team D visual baseline: `b853b62dc6e9a89a9cfe9927870388f28dd2b366`.
Only files under the top-level `frontend/` were imported. No branch merge, commit,
push, nested OS project import, or production database operation was performed.
The root workspace lockfile is authoritative; the duplicate frontend lockfile and
two redundant logo copies were omitted. The public `/RIT.png` asset is present.
Workspace-only inventory/DFD components and services were retained.

## Result

- `/routes/nodes` supplies the actual 18-node CSE map, all 12 labs and weighted edges.
- `/routes/compute` supplies path IDs, meters, algorithm and ETA. SVG coordinates,
  highlighted corridors, navigation steps and cumulative step distances use that
  same graph and response. No A* route or Euclidean-distance fallback remains in
  the live page. Missing/invalid nodes, disconnected paths, invalid responses and
  API failures produce errors and disable navigation.
- Dijkstra is the default; Dijkstra, BFS, DFS and Bellman-Ford are selectable in
  the existing engine information strip. DFS/BFS are labelled alternative routes.
- Lab IDs/UUIDs resolve through lab records and explicit D-codes; booking routes
  resolve the booked lab before computing. Unknown legacy `node_gate` and
  `node_turing` IDs are rejected, never mapped to unrelated destinations.
- Login preserves the destination query string. All lab-detail View Route links
  use `?labId=...`, while booking links retain `/route/:bookingId`.
- Failed recalculation clears cached route geometry and distance; late responses
  cannot replace the current selection. Retry is available.
- Core CSS, Tailwind configuration, navbar, sidebar, student dashboard and all
  three main layouts match Team D byte-for-byte. Existing SVG decoration, map
  controls, cards, panels, colors and responsive classes are retained. The map's
  facility labels and positions now reflect the CSE graph. The old decorative
  campus background is schematic, not a source of walking distances.
- Indoor GPS cannot be calibrated from schematic CSE coordinates. Its existing
  control reports this limitation; navigation starts at CSE PORCH and the moving
  marker remains an explicitly labelled simulation.
- Team C inventory backend and Team A scheduling code are unchanged. Existing
  inventory URLs/services remain available. Booking/resource mapping preserves
  identifiers; failed booking/availability requests are no longer successful empty
  data. Static inventory cannot masquerade as confirmed availability for a slot.

## Validation

- `npm run build --workspace=frontend`: PASS (TypeScript + Vite).
- `npm run test:routing --workspace=backend`: PASS; includes backend TypeScript
  build and 4 test groups covering all 12 labs, all 324 ordered node pairs, all
  four algorithms, independent shortest-distance oracle, HTTP compatibility,
  invalid identifiers and disconnected nodes.
- `npm run test:integration --workspace=frontend`: PASS, 10 tests covering graph
  mapping, route/coordinate/distance consistency, zero-distance routes, strict
  identifiers, booking/lab/resource adapters, all-building filtering, API failures,
  booking-to-lab routing and unavailable indoor GPS.
- `frontend/tests/browser.integration.mjs`: PASS in Chromium at 1440x1000 and
  390x844. Actual local routing API; fixtures for authentication, inventory, labs
  and bookings. Checked login return URL, all algorithms, exact SVG polyline,
  selected destination races, server failure/retry, invalid IDs, lab UUID routing,
  booking routing, lab-detail View Route, dashboard/lab list/booking details,
  mobile overflow and absence of browser runtime errors.
- `git diff --check`: PASS.
- Vite reports a non-failing large-bundle warning (approximately 1.4 MB JS before gzip).

Browser snapshots: `/tmp/lab-sync-route-desktop.png` and
`/tmp/lab-sync-route-mobile.png` (local verification artifacts, not committed).

## Remaining live integration blockers

1. Live authentication was not exercised. Supabase login needs the correct public
   frontend configuration and a test account. The current backend does not mount
   `/auth/login` or `/auth/me`. Browser login used a fixture; it is not proof of
   real account login. Elevated role fallbacks use Supabase app metadata rather
   than user-editable metadata.
2. The current workspace's `backend/src/modules/bookings/routes.js` and
   `controller.js` are zero-byte placeholders and `/bookings` is not mounted.
   `/resources/available` is also unmounted. Real reservation creation,
   scheduling/availability and real booking lookup require those implementations;
   they were not replaced with Team D's backend or fabricated frontend results.
   The existing scheduling TypeScript implementation is preserved.
3. Supabase inventory reads require a working `DATABASE_URL`. Tests intentionally
   used a dummy local URL and intercepted non-routing browser requests, so no
   live SQL data was read or written. Inventory mutation endpoints remain disabled
   by the existing backend; the inventory root response intentionally supplies a
   summary with an empty equipment array pending operational verification.
4. Full live dashboard telemetry also depends on currently unmounted booking,
   notification and monitoring endpoints. Dashboard rendering passed with fixtures;
   live business data is not claimed to be verified.
5. Indoor GPS needs real georeferenced/floor-aware coordinates before it can select
   an accurate departure node.

## Reproduce browser checks without production access

Install Playwright in a temporary directory and Chromium outside the repository:

```sh
npm install --prefix /tmp/lab-sync-browser playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/lab-sync-browser/browsers node /tmp/lab-sync-browser/node_modules/playwright/cli.js install chromium
```

Run these two local servers in separate terminals (after building the backend):

```sh
DATABASE_URL=postgresql://routing_test:routing_test@127.0.0.1:1/routing_test BACKEND_PORT=5057 CLIENT_URL=http://127.0.0.1:4175 node backend/dist/server.js
VITE_API_BASE_URL=http://127.0.0.1:5057/api/v1 VITE_SUPABASE_URL='' VITE_SUPABASE_ANON_KEY='' npm run dev --workspace=frontend -- --host 127.0.0.1 --port 4175
```

Then:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/lab-sync-browser/browsers PLAYWRIGHT_MODULE=file:///tmp/lab-sync-browser/node_modules/playwright/index.mjs node frontend/tests/browser.integration.mjs
```

## Exact file manifest for this turn

101 frontend files changed or were added relative to the starting workspace.
The following 25 files contain integration edits or are new integration
helpers/tests (rather than an unchanged copy of Team D):

- `frontend/package.json`
- `frontend/src/components/booking/BookingForm.tsx`
- `frontend/src/components/route/CampusMap2D.tsx`
- `frontend/src/components/route/NavigationPanel.tsx`
- `frontend/src/config/index.ts`
- `frontend/src/hooks/index.ts`
- `frontend/src/hooks/useAuth.tsx`
- `frontend/src/pages/auth/Login/index.tsx`
- `frontend/src/pages/student/Bookings/BookingDetails/index.tsx`
- `frontend/src/pages/student/Labs/LabDetails/index.tsx`
- `frontend/src/pages/student/Route/index.tsx`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/services/api/ApiAuthService.ts`
- `frontend/src/services/api/ApiBookingService.ts`
- `frontend/src/services/api/ApiLabService.ts`
- `frontend/src/services/api/ApiResourceService.ts`
- `frontend/src/services/api/ApiRoutingService.ts`
- `frontend/src/services/api/client.ts`
- `frontend/src/services/api/index.ts`
- `frontend/src/services/cseRouting.ts`
- `frontend/src/services/locationProvider.ts`
- `frontend/src/services/routeEngine.ts`
- `frontend/src/services/types.ts`
- `frontend/tests/browser.integration.mjs`
- `frontend/tests/integration.test.ts`

These 76 files were imported unchanged from Team D's visual baseline:

- `frontend/.env.example`
- `frontend/index.html`
- `frontend/public/RIT.png`
- `frontend/src/App.tsx`
- `frontend/src/components/common/Breadcrumbs.tsx`
- `frontend/src/components/common/Button.tsx`
- `frontend/src/components/common/Card.tsx`
- `frontend/src/components/common/ConfirmDialog.tsx`
- `frontend/src/components/common/DatePicker.tsx`
- `frontend/src/components/common/Drawer.tsx`
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/common/ErrorMessage.tsx`
- `frontend/src/components/common/Filters.tsx`
- `frontend/src/components/common/Input.tsx`
- `frontend/src/components/common/Modal.tsx`
- `frontend/src/components/common/Pagination.tsx`
- `frontend/src/components/common/Search.tsx`
- `frontend/src/components/common/Select.tsx`
- `frontend/src/components/common/Skeleton.tsx`
- `frontend/src/components/common/StatusBadge.tsx`
- `frontend/src/components/common/SystemHealthIndicator.tsx`
- `frontend/src/components/common/Table.tsx`
- `frontend/src/components/common/Tabs.tsx`
- `frontend/src/components/common/Toast.tsx`
- `frontend/src/components/common/index.ts`
- `frontend/src/components/lab/LabCard.tsx`
- `frontend/src/components/lab/LabFilterPanel.tsx`
- `frontend/src/components/lab/index.ts`
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/index.ts`
- `frontend/src/components/route/DeviceVerificationModal.tsx`
- `frontend/src/components/route/index.ts`
- `frontend/src/data/campusMapData.ts`
- `frontend/src/data/mock/bookings.json`
- `frontend/src/data/mock/labs.json`
- `frontend/src/data/mock/maintenance.json`
- `frontend/src/data/mock/resources.json`
- `frontend/src/data/mock/topology.json`
- `frontend/src/data/mock/users.json`
- `frontend/src/hooks/useDataHooks.ts`
- `frontend/src/index.css`
- `frontend/src/layouts/AdminLayout/index.tsx`
- `frontend/src/layouts/AuthLayout/index.tsx`
- `frontend/src/layouts/FacultyLayout/index.tsx`
- `frontend/src/layouts/StudentLayout/index.tsx`
- `frontend/src/lib/supabase.ts`
- `frontend/src/pages/admin/Labs/LabList/index.tsx`
- `frontend/src/pages/admin/Maintenance/MaintenanceList/index.tsx`
- `frontend/src/pages/admin/Monitoring/index.tsx`
- `frontend/src/pages/admin/Reports/index.tsx`
- `frontend/src/pages/admin/Resources/ResourceList/index.tsx`
- `frontend/src/pages/admin/index.ts`
- `frontend/src/pages/auth/NotFound.tsx`
- `frontend/src/pages/auth/SignUp/index.tsx`
- `frontend/src/pages/auth/Unauthorized.tsx`
- `frontend/src/pages/auth/index.ts`
- `frontend/src/pages/student/Dashboard/index.tsx`
- `frontend/src/pages/student/Labs/LabSearch/index.tsx`
- `frontend/src/pages/student/Profile/index.tsx`
- `frontend/src/routes/ProtectedRoute.tsx`
- `frontend/src/routes/RoleRoute.tsx`
- `frontend/src/services/api/ApiMaintenanceService.ts`
- `frontend/src/services/api/ApiNotificationService.ts`
- `frontend/src/services/deviceAuth.ts`
- `frontend/src/services/index.ts`
- `frontend/src/services/mock/MockAuthService.ts`
- `frontend/src/services/mock/MockBookingService.ts`
- `frontend/src/services/mock/MockLabService.ts`
- `frontend/src/services/mock/MockMaintenanceService.ts`
- `frontend/src/services/mock/MockMonitoringService.ts`
- `frontend/src/services/mock/MockReportsService.ts`
- `frontend/src/services/mock/MockResourceService.ts`
- `frontend/src/services/mock/MockRoutingService.ts`
- `frontend/tailwind.config.js`
- `frontend/vite.config.ts`

Additional files changed in this turn:

- `backend/src/modules/routing/controller.ts` — add weighted edges to `/nodes`.
- `backend/src/modules/routing/routing.test.ts` — assert `/nodes` graph metadata.
- `package-lock.json` — install Team D's declared Supabase dependency.
- `docs/TEAM_D_ROUTING_INTEGRATION.md` — this report and exact manifest.

Carried forward from the preceding Team B integration, not newly changed in this
turn: `backend/package.json`, `backend/src/app.ts`, routing `graph.ts`, `routes.ts`
and all four routing algorithm TypeScript files. The imported routing TypeScript
files remain untracked, as they were when this turn began; nothing has been staged.
