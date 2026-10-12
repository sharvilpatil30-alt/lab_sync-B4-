# Smart Campus Lab & Resource Optimizer

A full-stack MERN application for managing, booking, and optimizing campus laboratories and resources.

## Monorepo Layout

- `frontend/`: React + Vite + TypeScript frontend with Tailwind CSS and shadcn/ui.
- `backend/`: Node.js + Express + TypeScript modular monolith backend.
- `docs/`: Project documentation and design specifications.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Run test suite
npm test

# Run frontend and backend concurrently in dev mode
npm run dev
```

## Team A — OS Scheduling Module (`backend/src/modules/scheduling`)

- **Service Interface:** `evaluateBookingRequest({ resourceId, startTime, endTime, algorithm }, context)`
- **Endpoints:**
  - `POST /api/v1/scheduling/preview` — Deterministic read-only availability evaluation.
  - `GET /api/v1/scheduling/metrics` — In-memory scheduling performance metrics.
- **Specification & Handoff:** See [docs/TEAM_A_SCHEDULING_SPEC_AND_HANDOFF.md](docs/TEAM_A_SCHEDULING_SPEC_AND_HANDOFF.md) for full integration details.
