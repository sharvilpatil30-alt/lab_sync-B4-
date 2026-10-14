# Demo guide — 14 October 2026

## Start the integrated application

From the repository root, in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Production build checks:

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
npm start --workspace=backend
```

Backend loads ignored `backend/.env` (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`; optional `BACKEND_PORT`, `CLIENT_URL`). Frontend loads ignored `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never place a service-role key in frontend configuration.

Prefer `VITE_API_BASE_URL=/api/v1`. Vite proxies `/api` to `http://127.0.0.1:5000`; override `API_PROXY_TARGET` when needed. The LAN browser then uses the frontend host automatically. No LAN IP is hardcoded in source. For production hosting, configure the equivalent reverse proxy or set `VITE_API_BASE_URL` to the deployed API and `CLIENT_URL` to the deployed frontend origin. Frontend environment changes require restarting Vite/rebuilding.

## Existing demo profiles

Read-only verification found these Supabase accounts, confirmed email ownership, and the following database roles. No accounts were created or changed by this implementation.

| Account | Email | `public.profiles.role` | Expected landing page |
|---|---|---|---|
| Student Demo | 2553016@ritindia.edu | student | `/student/dashboard` |
| Faculty Demo | faculty.demo@ritindia.edu | faculty | `/faculty/dashboard` |
| Admin Demo | admin.demo@ritindia.edu | lab_admin | `/admin/dashboard` |

Passwords remain with the team. **Actual password sign-in was not tested.** Browser redirect tests used intercepted authentication fixtures; production middleware tests used real profiles with stubbed Supabase identity responses. Do not describe these as verified real credential logins.

The database accepts `lab_admin`, not `admin`. `/auth/me` normalizes `lab_admin` to the frontend's `admin`. Login and session restoration read `/auth/me`; editable signup metadata and cached user roles cannot grant permissions.

If a demo password fails, use Supabase Dashboard → Authentication → Users to reset that existing account's password. Do not put passwords in SQL, Git, screenshots, or chat. Do not disable email confirmation globally. For normal faculty signup, email must be confirmed and match an active record in `public.faculty` before automatic faculty provisioning.

If a trusted administrator needs to repair these existing profile assignments, the following **Dashboard SQL procedure** is idempotent. It creates no Auth accounts, requires an already verified matching Auth user, and is never exposed through public signup:

```sql
INSERT INTO public.profiles (id, full_name, role)
SELECT u.id, d.full_name, d.role
FROM (VALUES
  ('2553016@ritindia.edu', 'Student Demo', 'student'),
  ('faculty.demo@ritindia.edu', 'Faculty Demo', 'faculty'),
  ('admin.demo@ritindia.edu', 'Admin Demo', 'lab_admin')
) AS d(email, full_name, role)
JOIN auth.users u ON lower(u.email) = d.email
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
```

## Screenshot walkthrough

1. Sign in as Student Demo; capture dashboard and Search Labs (12 labs).
2. Open a lab and capture its actual resources.
3. Open Create Booking. Select lab → future IST date/time → workstation → purpose → review → confirm. A selected seat has a checkmark and highlighted border. Unavailable seats stay disabled. Requests fail visibly with retry guidance.
4. Capture the booking detail and My Bookings. Cancel the newly created demo booking after the demonstration. Do not cancel unrelated users' bookings.
5. Sign out before changing accounts. Faculty and Admin Demo must land on their own dashboards.
6. Faculty-priority seats are explicitly labelled as cancelling student reservations. Do not demonstrate preemption against real users. The rollback-only tests already verify preemption and notifications without leaving real cancellations.
7. Use the booking's Route button to view the mapped CSE lab destination.

The approved two-record integration test has already run. Its records are terminal and must not be reused as active bookings. Their exact IDs and statuses are in `FINAL_TEST_REPORT.md`. Further live test bookings require fresh authorization; `verify-live.cjs` refuses reruns with the existing marker.

## Repeatable verification

```bash
npm test --workspace=backend
npm run test:integration --workspace=frontend
node backend/scripts/verify-rollback.cjs
node backend/scripts/verify-http.cjs
node backend/scripts/verify-auth.cjs
node frontend/tests/browser.cjs
```

The HTTP script writes a catalog snapshot to `/tmp/campus-browser-catalog.json`; the browser script needs that file, a current frontend build, and Chromium. Set `CHROME_BIN` to a local Chromium executable if the detected machine-specific default is unavailable. Browser tests intercept Auth and booking requests and never create live bookings. `verify-auth.cjs` explicitly stubs the identity provider but queries real profiles. HTTP tests use loopback-only local signed test credentials; production rejects that fallback. `verify-rollback.cjs` always rolls its outer transaction back.

## Known limits

- Actual Supabase password sign-in and emailed verification/reset links need the team to check with its credentials.
- The existing maintenance-work-order and historical reporting APIs are not implemented/mounted. Admin UI now says unavailable rather than fabricating empty maintenance data or 68% utilization. Current operational dashboard counts come from PostgreSQL.
- Push/email notifications are not configured; preemption notifications are persisted in audit events and available through `/notifications` with read/unread support.
- No database migrations were needed. Existing schema, foreign keys, exclusion constraint, and audit history were preserved. Purpose and cancellation/notification metadata use existing audit records because the live schema has no purpose or notifications columns/tables.
