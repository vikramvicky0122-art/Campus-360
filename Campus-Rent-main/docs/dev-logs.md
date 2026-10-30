# CampusRent Development Log

**Project:** CampusRent
**Document Type:** Engineering Development Journal
**Last Updated:** 2026-07-02

## Phase 1 — Product Foundation and Core Frontend (Mar 19 – Apr 16, 2026)

### Phase 1.1 — Frontend Setup and Project Scaffolding
- Initialized CampusRent using React + Vite and established base folder structure.
- Added global styling, reusable UI primitives, and shared component conventions.
- Set up initial page routing for landing, auth, marketplace, item details, booking, and chat.

### Phase 1.2 — Listing Domain and Marketplace Baseline
- Implemented `ListingContext` to centralize listing state operations.
- Added listing visibility controls (hide/unhide) and delete handling for owner-managed listings.
- Introduced `localStorage` persistence for listings with safe fallback to seed data.
- Delivered Marketplace discovery UI with filtering, sorting, and responsive grid behavior.

## Phase 2 — Dashboard Architecture and User Modules

### Phase 2.1 — Dashboard Routing Refactor
- Refactored dashboard navigation into nested routes under a shared dashboard layout.
- Applied protected-route access rules for authenticated user sections.
- Separated dashboard layout concerns from top-level application routing.

### Phase 2.2 — My Listings Module
- Built owner workflows for Active Listings, Pending Approvals, and Rental History.
- Connected listing operations to booking state for approval, rejection, cancellation, and return actions.
- Refined hidden listing behavior so Marketplace visibility follows listing-domain rules only.

### Phase 2.3 — My Borrowings Module
- Implemented borrower workflows for Pending, Upcoming, Ongoing, and History views.
- Added borrower-side request controls and lifecycle-aligned status presentation.
- Normalized booking display models (dates, totals, owner/requester metadata) across tabs.

## Phase 3 — Booking Lifecycle Engine and Data Integrity

### Phase 3.1 — BookingContext and Lifecycle State Engine
- Created `BookingContext` as the canonical source for booking state.
- Implemented lifecycle actions: create, approve, reject, cancel, and mark returned.
- Added booking persistence in `localStorage` with resilient hydration behavior.
- Standardized booking status constants and transition handling across modules.

### Phase 3.2 — Approval Workflow and Overlap Conflict Prevention
- Hardened approval flow so approvals update existing records rather than creating new entries.
- Enforced overlap checks at approval time against confirmed bookings for the same listing.
- Excluded non-confirmed statuses from overlap validation.

### Phase 3.3 — Duplicate Booking and Rendering Fixes
- Traced booking creation path from booking confirmation and removed duplicate insertion paths.
- Added guarded booking creation logic and deduplication at context/state update layers.
- Corrected Marketplace "Rent Now" behavior to allow future reservations while preserving overlap enforcement.

## Phase 4 — Auditability and History Consistency

### Phase 4.1 — Unified History and Cancellation Audit Trail
- Unified history views to include `completed`, `cancelled`, and `rejected` records for both borrower and lender dashboards.
- Added cancellation audit metadata (`cancelledBy`, `cancelledAt`) with borrower/lender source stamping.

### Phase 4.2 — Persistence Stabilization and Backend Preparation
- Stabilized local persistence strategy for listings and bookings with canonical state normalization.
- Prepared backend migration surface through stable context contracts and an API service abstraction layer.

## Phase 5 — Full-Stack Backend Integration & Production Deployment (Apr 30 – May 14, 2026)

### Phase 5.0 — Backend Architecture & Database Initialization
- Restructured the project into decoupled `frontend/` and `backend/` application layers.
- Initialized Node.js + Express backend infrastructure with JSON middleware and environment-aware CORS handling.
- Integrated Prisma ORM with Neon serverless PostgreSQL as the primary production database.
- Designed a relational schema covering `User`, `Listing`, `ListingImage`, `Booking`.
- Migrated loosely typed string states into strict Prisma-backed enums (`BookingStatus`, `ListingStatus`).
- Added historical booking integrity fields to `Booking`: `totalPriceSnapshot`, `securityDepositSnapshot`, `ownerId`.
- Added indexing on high-frequency relational queries (`ownerId`, `listingId`).
- Created an idempotent `seed.js` pipeline for Neon.

### Phase 5.1 — API Integration & Frontend-Backend Synchronization
- Replaced frontend mock/static state flows with real Express API integration (listings, item details, dashboard reads).
- Introduced the centralized API service abstraction layer.
- Implemented minimal JWT authentication and authenticated listing ownership.
- Eliminated local-only booking mutations in favor of database-first persistence.
- Added token-aware protected route middleware across backend APIs.

### Phase 5.2 — Booking Lifecycle Refactor & State Machine Hardening
- Replaced simplified booking states (`pending`/`upcoming`/`ongoing`) with the current 8-stage production lifecycle: `requested → approved → item_given → ongoing → return_pending → completed`, plus `cancelled`/`rejected`.
- Introduced guarded lifecycle transitions with strict role-based permissions (owner vs. borrower).
- Added backend-enforced invalid transition prevention.
- Extended overlap conflict prevention across all active rental states.

### Phase 5.3 — Persistence Stabilization & Reload Consistency
- Fixed reload inconsistencies where approved bookings reverted to pending state.
- Added dedicated backend `PATCH` lifecycle update endpoints, replacing frontend-simulated mutations.
- Established the database as the sole canonical source of truth for booking state.

### Phase 5.4 — Production Infrastructure & Deployment
- Implemented production-safe CORS with environment-driven frontend allowlists.
- Added strict frontend API environment validation (no unsafe localhost fallback).
- Migrated frontend linting to ESLint v9 flat config.
- Added automated Prisma client generation via deployment-safe `postinstall` hooks.
- Deployed production stack: Frontend → Vercel, Backend → Render, Database → Neon PostgreSQL.
- Completed end-to-end production validation for auth, protected APIs, listings, booking lifecycle, and CORS.

**State at end of Phase 5:** deployed, single-domain (listings + bookings) full-stack app, minimal auth, no tests, no chat, no observability.

## Phase 6 — Hardening, Testing, Observability & Admin (Jun 17 – Jun 22, 2026)

This phase is a large jump — a month-long gap between Phase 5 (mid-May deployment) and this phase, in which the project went from a working demo to something closer to production-grade.

### Phase 6.1 — API Correctness & Input Validation
- Added server-side search, category filter, and pagination to `GET /api/listings`.
- Added `PATCH /api/listings/:id` with a dual-mode edit form on the frontend.
- Added Zod schemas and a shared `validate()` helper across all write endpoints.
- Added rate limiting on auth endpoints (10 req / 15 min).
- Added a self-booking guard (can't book your own listing) and removed a stale `markReturned` action.
- Added auto-logout on `401` via an `api.js` response interceptor.
- Started the technical debt register in `ARCHITECTURE.md` (§8.1 client-side sort, §8.2 URL filter state) — the first time known limitations were tracked explicitly instead of left implicit.

### Phase 6.2 — Testing Infrastructure
- Set up Vitest and initial smoke tests on the backend.
- Added booking lifecycle integration tests (Supertest against a real Postgres instance).
- Added frontend testing infrastructure (Vitest + React Testing Library) with CI coverage reporting.
- Iterated on coverage tooling (`@vitest/coverage-v8`, threshold tuning) until CI was stable.

### Phase 6.3 — CI/CD
- Added GitHub Actions pipelines for both backend and frontend, with lint + test + coverage steps, scoped by path so unrelated changes don't trigger unnecessary runs.

### Phase 6.4 — Observability, RBAC & Admin
- Added structured logging with Pino, including request-scoped `requestId` context and redaction of sensitive fields.
- Integrated Sentry for backend error monitoring.
- Added an `ADMIN` role, an `adminOnly` middleware, and admin management APIs (platform stats, user management, booking oversight).
- Added OpenAPI documentation via swagger-jsdoc, served at `/api/docs` through swagger-ui-express.
- Replaced remaining frontend mock data with fully backend-driven user and listing data.

### Phase 6.5 — Real-Time Chat
- Implemented Phase 1 real-time chat with Socket.IO: per-booking conversations, JWT-authenticated socket handshakes.
- Added unread message counts.
- Fixed a chat migration issue to scope it correctly to new conversation models only.
- Improved typing indicator reliability and state cleanup on disconnect.
- Improved chat UI: message ownership rendering, conversation UX polish.
- Added presence tracking (online/offline) with reliability improvements, and updated test fixtures to match the presence/conversation/booking relation.

### Phase 6.6 — Security & Code Quality Cleanup
- Migrated `authService.js` from raw SQL to Prisma, closing a consistency gap where auth was the one service not using the ORM.
- Added Helmet middleware and production security headers.
- Expanded backend test coverage with authorization and edge-case tests.

**State at end of Phase 6:** production app with real-time chat, RBAC/admin, structured logging + error monitoring, automated tests + CI, and a Zod-validated, rate-limited API surface.

## Phase 7 — Correctness Fixes & Documentation Sync (Jul 1 – Jul 2, 2026)

- Fixed SPA routing so client-side routes don't 404 on direct load/refresh; added a 404 fallback page.
- Moved marketplace listing sorting (price, rating, newest) from client-side to server-side, so sorting is correct across the full result set rather than just the current page — resolving §8.1 of the technical debt register for sort.
- Moved the marketplace location filter server-side using the same pattern, fully resolving §8.1.
- Updated `ARCHITECTURE.md`'s technical debt register to reflect §8.1 as resolved.

**State as of this log:** all §8.1 items resolved; §8.2 (URL-synchronized filter state) remains open and tracked. See `ARCHITECTURE.md` for the live debt register rather than duplicating status here.

---

## Current Product State

CampusRent is a fully deployed full-stack campus rental platform featuring:

- React 19 + Vite frontend, Express 5 backend, Prisma ORM, Neon PostgreSQL
- JWT authentication scoped to `@nitrr.ac.in` campus email addresses
- An 8-stage, role-guarded booking lifecycle engine with overlap conflict prevention
- Real-time per-booking chat over Socket.IO (presence, typing indicators, unread counts)
- Role-based access control with a dedicated admin surface
- Server-side search, filter, sort, and pagination on the marketplace
- Zod validation and rate limiting on write/auth endpoints, Helmet security headers
- Structured logging (Pino) and error monitoring (Sentry)
- Automated backend + frontend test suites running in CI against a real database
- OpenAPI-documented API, served interactively at `/api/docs`

## Known Gaps (tracked, not hidden)

- Socket.IO presence/typing state is in-memory and single-instance — no Redis adapter yet, so it doesn't horizontally scale across multiple backend processes.
- Filter/pagination state isn't reflected in the URL (§8.2, still open).
- No payment integration and no third-party OAuth — both are deliberate scope decisions, not oversights, given the campus-only trust model and off-platform payment coordination. See `roadmap.md` for whether/when these are worth revisiting.