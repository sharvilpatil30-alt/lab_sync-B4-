# Final integration test report

Date: 14 October 2026. Branch: `integration/final-v2`.

## Final publish verification (supersedes the earlier run below)

**78 current checks passed, 0 failed:** backend 15, frontend integration 12, Chromium 14, live HTTP/admin 32, production auth/profile 5. Backend and frontend builds pass. No additional live bookings were created. Existing approved test records remain CANCELLED and COMPLETED; the earlier actual restart/concurrency evidence below is retained, not rerun.

Additional fixes: admin `lab=all` no longer hides all inventory; status/type filters work; real historical reporting replaces a missing route; audit/scheduling panels display persisted events; guarded admin lab/resource status and metadata updates are transactional and audited; profile edits persist without permitting role changes; password changes now call Supabase instead of reporting simulated success. Default report dates use the current month. Queues without historical samples display “No queued history”.

| Current verification | Status | Evidence |
|---|---|---|
| Admin reports, audit, scheduling endpoints | PASS | Real PostgreSQL HTTP reads; student access denied. |
| Inventory status and audit writes | PASS | Maintenance/release tested in a rolled-back transaction; no committed inventory changes. An initial JSON-array serialization failure was fixed and the test passed. |
| All-resource filter and resource details | PASS | 432 real resources; real metadata queries. |
| Profile role escalation | PASS | PATCH rejects role/identity changes with 403. |
| Faculty badge, session reload, logout, protected access after logout | PASS | Chromium with intercepted identity transport. Initial browser assertions/navigation timing were corrected. |
| Six-step wizard and conflict handling | PASS | Browser fixtures; no live create calls. |
| Prior booking persistence | PASS | Read-only check of both previously approved records and route lookup. |
| Real Supabase password login/change | BLOCKED | Credentials remain team-held. No actual password change was attempted. |
| Full lab/resource metadata and profile edits | NOT TESTED with committed writes | Implemented; validation/build checked. No team profiles or catalog metadata changed during tests. |
| Maintenance work-order creation and catalog import | BLOCKED / incomplete | Status controls work; separate work-order API remains absent. New catalog items use reviewed import, not the disabled Add Resource button. |

Report utilization is allocated resource-hours divided by resource count × hours in the selected date range (24-hour denominator), not a classroom-hours occupancy estimate. Peak hour uses allocated session starts in IST. Queue resolution is derived from persisted WAITLISTED decisions; no sample returns null.

## Earlier integration run (historical evidence)

**82 checks passed in the earlier integration run.** Both TypeScript/production builds pass. This does **not** mean every application feature is complete: real password login is blocked on team-held credentials, and the pre-existing historical-report and maintenance-work-order APIs remain unavailable. Those limits are recorded below rather than hidden by fake data.

Machine-readable measured results: [test-evidence/final-results.json](test-evidence/final-results.json).

| Suite | Passed | Failed | What was actually exercised |
|---|---:|---:|---|
| Backend regression (`npm test --workspace=backend`) | 15 | 0 | Existing OS scheduler/memory regression and campus routing, including HTTP tests. Legacy memory tests are explicitly isolated; they are not persistence evidence. |
| Frontend integration | 12 | 0 | API adapters, lab mapping, routing contracts, IST dates, state preservation, UUID/availability/preemption mapping. |
| Chromium browser | 13 | 0 | Actual React pages; intercepted Auth/booking responses, catalog snapshot read from PostgreSQL. Role redirects, six wizard steps, cancellation, date/conflict/error states. |
| Live PostgreSQL rollback suite | 11 | 0 | Real schema/foreign keys; allocation, conflicts, authorization, faculty preemption, notification/audit creation, inventory release. All changes rolled back. Trusted-role fixtures do not establish actual faculty password login. |
| Read-only live HTTP | 19 | 0 | Real PostgreSQL lab/resource/booking/monitoring/notification/route reads; local signed role fixtures; validation, role restrictions, CORS. |
| Production auth middleware / live profiles | 5 | 0 | Real demo database roles with stubbed Supabase identity transport; ignores editable role metadata, denies unverified email and invalid identity. |
| Approved committed live test | 7 | 0 | Two labelled bookings, concurrent HTTP attempts, real backend process restarts, final cancellation/return. Uses real authorized Student Demo profile with local signed test transport. |
| Backend build | PASS | — | `tsc` |
| Frontend build | PASS | — | `tsc && vite build`; non-blocking large-bundle warning remains. |

Initial test attempts encountered sandbox socket restrictions and a browser-harness preflight issue. Backend tests passed once loopback sockets were allowed. Browser fixture OPTIONS handling was corrected, then all checks passed. A compile error after removing the inventory fallback was fixed before final validation. These intermediate failures are not presented as product passes.

## Fixes verified

- Root cause of workstation blocker: live labs use UUIDs while the availability endpoint used seeded memory. Empty availability triggered a fallback inventory grid containing permanently disabled buttons. Availability now uses PostgreSQL UUIDs; the disabled fallback grid is removed.
- Explicit seat registration, highlighted selected state, Next enablement, selection reset on lab/time changes, full final validation, duplicate-submit guard, retry-stable per-form idempotency key, and clear failure feedback.
- IST input is converted with `+05:30`, independent of browser timezone; booking display also uses Asia/Kolkata. Past starts, reversed windows, missing purpose, and cross-lab resources are rejected.
- Production booking/list/detail/cancel/return APIs use PostgreSQL. Lab/resource row locks and the existing exclusion constraint protect concurrent allocation; scheduler rules are reused with a transaction-local database snapshot rather than rewritten.
- Preemption, scheduling decision, booking, inventory, audit, and notification events are written in one transaction. Cancellation/return preserves allocation if another future booking still needs the resource.
- Booking ownership checks protect reads, cancellation, completion, and route lookup. Administrative status changes require admin and allow only supported terminal transitions.
- Notifications and read acknowledgements use existing audit records and survive process memory loss. Frontend notification failures are no longer reported as fake success.
- `/auth/me` is authoritative for login/session roles. `lab_admin` maps to frontend `admin`; cross-role return URLs are ignored; cached query data clears between accounts. Production no longer accepts local JWT fallback when Supabase configuration is absent.
- Live monitoring/alerts endpoints support dashboard counts. Available-seat KPI uses real counts, not full lab capacity. Removed hardcoded 68% utilization and fake empty maintenance success. Errors have explicit feedback.
- Same-origin API default and Vite proxy avoid hardcoded LAN addresses. Unrecognized CORS origins are not granted access. Errors are returned as JSON.
- Legacy DFD memory-mutating endpoints are not exposed outside test mode. Original scheduler and legacy regression contributions are retained.

## Approved live records and isolation

Authorization: maximum two records, only authorized demo accounts, exact label `INTEGRATION_TEST_20261014_DO_NOT_USE`, unused AVAILABLE resource, concurrency, restart persistence, cleanup, preserved audit history.

Preflight found verified `Student Demo` (`2553016@ritindia.edu`) and selected resource `00aa5e46-ad8a-48ae-9af3-5cadf4826961`, with state `AVAILABLE` and **no booking records at all**. The script refuses to run if an earlier audit event contains the marker. No real users' bookings were changed. No accounts, schema, purchase batches, or inventory catalog records were created/deleted; the selected test resource only received normal booking lifecycle state/version updates and ended `AVAILABLE`.

| Booking ID | Exact label (persisted purpose in audit, exposed on booking API) | Final state |
|---|---|---|
| `aa4f1c25-a0c8-448c-bde7-997ceac42eba` | `INTEGRATION_TEST_20261014_DO_NOT_USE` | CANCELLED |
| `bc37eb73-5b24-46aa-be01-9a210e564789` | `INTEGRATION_TEST_20261014_DO_NOT_USE` | COMPLETED |

Two simultaneous overlapping POST requests returned **one 201 and one 409**. After cancellation, a third POST created the second record. Thus 2/3 raw create attempts succeeded (66.7%); the rejected attempt was the required conflict test. Both expected grants succeeded (2/2), and the expected conflicting attempt was rejected (1/1). This sample is too small for a production reliability estimate.

The backend process was terminated and started again before reading the confirmed booking and purpose. It was restarted a second time before verifying both final states. This is actual process restart evidence, not an in-memory snapshot test. Audit history was retained, and the final resource state was verified as AVAILABLE. No destructive SQL or migration was run.

## Measured API timings

Single local-loopback HTTP observations against remote PostgreSQL; these are not p50/p95 benchmarks. Test-signed transport avoids Supabase credential latency and must not be quoted as real login timing.

| Endpoint/check | Elapsed |
|---|---:|
| GET labs (12 records) | 139.4 ms |
| GET resources (432 records) | 496.8 ms |
| GET availability (42 resources in sampled lab) | 302.6 ms |
| GET monitoring overview | 404.6 ms |
| GET own bookings | 148.1 ms |
| GET notifications | 138.7 ms |
| GET persisted booking route | 163.3 ms |
| Concurrent creates (combined test) | 3005.2 ms |
| Cancellation (single operation) | 1375.0 ms |
| Second successful create | 1477.6 ms |

The live database exclusion constraint `prevent_double_booking` covers `LEASED`, `CONFIRMED`, `ACTIVE` using `[start,end)` ranges. `valid_booking_time`, profile role checks, and foreign keys were inspected and preserved. Profile RLS exposed only a SELECT policy; there were no auth.users signup triggers assigning metadata roles.

## Status matrix and remaining limits

| Area | Status | Evidence/limit |
|---|---|---|
| Labs/resources/current operational KPIs | PASS | 12 labs, 432 resources; live HTTP and SQL. |
| Six-step wizard, selected state, submission feedback | PASS | Chromium DOM interaction with intercepted writes; live HTTP creation separately verified. |
| Concurrent conflict prevention and persistence | PASS | Approved live test and process restarts. |
| Cancellation/return/inventory consistency | PASS | Live final states plus rollback tests for additional future reservations. |
| Faculty priority and notifications | PASS | Real PostgreSQL transaction with role fixtures, rolled back; UI eligibility checked in Chromium. |
| Audit creation | PASS | Real writes in approved test; purpose/preemption/cancellation assertions in rollback suite. |
| Student/faculty/admin routing and trusted profile roles | PASS | Browser and production-middleware tests; real profiles verified read-only. |
| Real Supabase password authentication for all three demos | BLOCKED | Passwords held by team, no credentials supplied; not tested and no account changes made. |
| Normal faculty email verification flow | NOT TESTED end-to-end | Middleware rejects unverified identity; approved-faculty matching retained. No real signup/email-link delivery performed. |
| Push/email notification delivery | NOT TESTED | No delivery provider configured; persisted in-app notification availability is implemented. |
| Historical reporting and maintenance-work-order APIs | FAIL / pre-existing incomplete integration | Routes remain unmounted; UI reports unavailable. Current monitoring and inventory read/reservation operations work. |
| Profile editing and administrative catalog mutation | NOT TESTED | Outside tested booking/dashboard path; existing endpoints are incomplete. |
| Sustained load / multi-host concurrency | NOT TESTED | Two concurrent requests against one test backend verified; database row locks/exclusion constraint provide protection across processes, but no load benchmark performed. |
| Real-account documentation screenshots | NOT TESTED | Team can capture after password sign-in; fixture browser renders must not be passed off as real authenticated demo screenshots. |

## Reproduction and delivery

See [DEMO_GUIDE.md](DEMO_GUIDE.md) for start commands, account emails, safe role repair, and test commands. Do not rerun the committed live script: the two-record authorization has been consumed and its marker guard will stop it. Rollback-only/read-only tests can be repeated independently.

Publishing is gated on the current successful builds/tests. See the final delivery response and Git history for the integration and main merge hashes and remote push result.
