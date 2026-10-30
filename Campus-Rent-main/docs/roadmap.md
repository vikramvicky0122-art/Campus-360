# CampusRent — Current Engineering Roadmap

This roadmap reflects the ACTUAL current state of the project after the backend migration work and architectural pivots.

---

# 0. PROJECT VISION

## Product

CampusRent is a:

```txt id="rm1"
campus-only P2P rental platform
```

focused on:

* student-to-student rentals
* booking lifecycle management
* lender/borrower dashboards
* temporary item sharing ecosystem

Target:

```txt id="rm2"
NIT Raipur students
```

---

# 1. COMPLETED FOUNDATIONS ✅

---

# Phase 1 — Frontend Foundation ✅

Completed:

* React + Vite setup
* Routing
* Shared UI components
* Marketplace UI
* Item details UI
* Booking UI
* Dashboard UI
* Filtering/sorting
* Responsive layouts

Status:

```txt id="rm3"
stable
```

---

# Phase 2 — Frontend Lifecycle Engine ✅

Completed:

* BookingContext
* ListingContext
* Lifecycle statuses
* Pending/upcoming/history flows
* Approval/rejection simulation
* Overlap logic (frontend)
* localStorage persistence
* Hidden listing logic

Status:

```txt id="rm4"
stable but transitional
```

Important:
This layer is now gradually being replaced by backend persistence.

---

# Phase 3 — Backend Architecture ✅

Completed:

* backend monorepo structure
* Express setup
* app.js/server.js separation
* modular architecture:

  * routes
  * controllers
  * services
  * utils
* nodemon/dev setup
* health endpoint

Status:

```txt id="rm5"
stable
```

---

# Phase 4 — Database Infrastructure ✅

Completed:

* Prisma setup
* Neon PostgreSQL integration
* migrations
* schema modeling
* relational architecture
* enums
* snapshots
* image relations

Current Models:

* User
* Listing
* ListingImage
* Booking

Status:

```txt id="rm6"
stable
```

---

# Phase 5 — Seed System ✅

Completed:

* seed.js
* mockData → database migration
* relational seeding
* safe reseeding flow

Status:

```txt id="rm7"
stable
```

---

# Phase 6 — Marketplace Backend Migration ✅

Completed:

```txt id="rm8"
GET /api/listings
```

Frontend:

* Marketplace now backend-driven
* mapping layer implemented
* loading/error states added
* fallback strategy added

Status:

```txt id="rm9"
fully backend-driven
```

---

# Phase 7 — Item Details Backend Migration ✅

Completed:

```txt id="rm10"
GET /api/listings/:id
```

Features:

* owner relation
* ordered images
* availability-aware reads

Frontend:

* ItemDetails now backend-driven

Status:

```txt id="rm11"
fully backend-driven
```

---

# Phase 8 — Dashboard Read Migration ✅

Completed:

```txt id="rm12"
GET /api/bookings/my-bookings
GET /api/listings/my-listings
```

Completed:

* BookingContext synchronization layer
* backend-driven dashboard reads
* hidden listings support
* localStorage fallback strategy
* lifecycle grouping support

---

# Phase 9 — Authentication System ✅

Completed:

* JWT signup/login with bcrypt password hashing
* Rate-limited auth endpoints (10 req / 15 min)
* `requireAuth` middleware with token validation
* Auto-logout on 401 via API response interceptor
* `@nitrr.ac.in` campus email scope enforcement

Status:

```txt
stable
```

---

# Phase 10 — Booking Lifecycle APIs ✅

Completed:

```txt
POST /api/bookings
PATCH /api/bookings/:bookingId/status
```

Features:

* Overlap validation against approved/active bookings
* Price and deposit snapshots at creation time
* Full 8-state lifecycle engine
* Role-based transition guards (owner vs. borrower)
* Cancellation audit trail (`cancelledBy`, `cancelledAt`)
* Self-booking prevention
* Frontend BookingContext now calls backend for ALL mutations

Status:

```txt
stable
```

---

# Phase 11 — Admin & Role-Based Access Control ✅

Completed:

* `ADMIN` role + `adminOnly` middleware
* Admin dashboard: platform stats, user management, booking oversight
* Listing moderation: hide/restore endpoints

Status:

```txt
stable
```

---

# Phase 12 — Real-Time Chat ✅

Completed:

* Socket.IO with per-booking conversation rooms
* JWT-authenticated socket handshake
* Presence tracking (online/offline)
* Typing indicators
* Unread message counts
* Conversation list and message history APIs

Status:

```txt
stable but single-instance (no Redis adapter)
```

---

# Phase 13 — Cloudinary Image Uploads ✅

Completed:

* Multer middleware for file handling
* Cloudinary SDK integration
* `POST /api/listings/upload-image` endpoint

Status:

```txt
stable
```

---

# Phase 14 — Testing & CI/CD ✅

Completed:

* Vitest + Supertest integration test suite
* React Testing Library + Vitest frontend tests
* Booking lifecycle integration tests (real Postgres)
* GitHub Actions CI pipelines (backend + frontend)
* Coverage reporting with thresholds

Status:

```txt
stable
```

---

# Phase 15 — Observability, Security & Documentation ✅

Completed:

* Structured logging (Pino) with request-scoped `requestId`
* Sentry error monitoring
* Helmet security headers (CSP, HSTS, XSS, etc.)
* Zod input validation on all write endpoints
* OpenAPI documentation served at `/api/docs`
* Migrated auth service from raw SQL to Prisma

Status:

```txt
stable
```

---

# Phase 16 — Production Deployment ✅

Completed:

* Frontend deployed to Vercel
* Backend deployed to Render
* Database hosted on Neon PostgreSQL
* Environment-aware CORS configuration
* Production security headers

Status:

```txt
deployed
```

---

# 2. CURRENT ARCHITECTURE STATE 🚧

---

# Backend-Driven Systems ✅

These now use:

```txt id="rm14"
Neon PostgreSQL + Prisma
```

Systems:

* Marketplace
* Item Details
* Dashboard Reads

---

# Hybrid Systems ⚠️

Still transitional:

* `localStorage` fallback for booking state on initial page load
* Some frontend-only edge cases in the dashboard lifecycle tabs

These still rely partly on:

```txt id="rm15"
frontend context simulation
```

Note: All booking write operations now call the backend API. The remaining hybrid state is read-path only and affects initial hydration timing, not data correctness.

---

# Frontend Context Role (Current)

NOW:

```txt id="rm16"
synchronization layer
```

NOT:

```txt id="rm17"
primary source of truth
```

Major architectural shift.

---

# 3. CURRENT TECH STACK ✅

Frontend:

```txt id="rm18"
React
Vite
Context API
```

Backend:

```txt id="rm19"
Node.js
Express.js
```

Database:

```txt id="rm20"
PostgreSQL (Neon)
```

ORM:

```txt id="rm21"
Prisma
```

Architecture:

```txt id="rm22"
modular monorepo
```

---

# 4. WHAT STILL NEEDS TO BE DONE 🚧

Now ordered PROPERLY.

---

# Phase 17 — Frontend Lifecycle Transition Completion 🚧

## NEXT MAJOR PHASE

Goal:
Complete the transition of remaining frontend-simulated state to fully backend-driven.

---

## 17.1 Remove localStorage Fallback

* Eliminate initial-page-load dependency on localStorage booking state ✅
* Verify dashboard renders correctly during API fetch latency ✅

Status:

```txt
resolved — no localStorage booking fallback exists; BookingContext fetches directly from backend on mount
```

---

## 17.2 Eliminate Duplicated Lifecycle Logic

* Remove any remaining frontend-only status normalization that duplicates backend logic
* Ensure all booking status transitions go through the API

Status:

```txt
in progress
```

---

# Phase 18 — URL-Synchronized Filter State 🚧

Tracker:

```txt
ARCHITECTURE.md §8.2
```

Goal:

* Move marketplace filter/pagination state to URL search params
* Use `useSearchParams` for bookmarkable, navigation-resilient filters

Status:

```txt
resolved
```

---

# Phase 19 — Notifications & Realtime Alerts 🚧

Possible future:

* Booking lifecycle push notifications
* Approval/rejection alerts via Socket.IO
* Email notifications (if scope expands)

Status:

```txt
future scope
```

---

# Phase 20 — Socket.IO Horizontal Scaling 🚧

Required once the app runs multiple backend instances:

* Redis adapter for Socket.IO
* Shared presence/typing state across processes

Status:

```txt
future scope
```

---

# Phase 21 — Payments 🚧

Explicitly deprioritized:

```txt
Razorpay/Stripe would add PCI surface, webhook complexity,
and refund/dispute logic — 1+ weeks of careful work.
Campus-email trust model makes off-platform payment viable.
```

Status:

```txt
explicitly deprioritized
```

---

# 5. CURRENT PRIORITY ORDER 🎯

---

# Immediate Priority

## Phase 17 — Complete frontend lifecycle migration

Meaning:

* Remove localStorage fallback for booking state
* Eliminate remaining duplicated lifecycle logic
* Verify full dashboard correctness with backend-only reads

---

# Next Priority

## Phase 18 — URL-synchronized filter state

Resolve ARCHITECTURE.md §8.2: make marketplace filters bookmarkable and navigation-resilient.

---

# THEN

## Phase 19+ — Future scope items

Only after the above two phases are stable.

---

# 6. CURRENT BIGGEST ENGINEERING ACHIEVEMENT 🏆

CampusRent successfully evolved from:

```txt id="rm37"
frontend-only mock application
```

into:

```txt id="rm38"
database-driven transactional full-stack architecture
```

using:

```txt id="rm39"
React
↓
Context Synchronization Layer
↓
API Service Layer
↓
Express Backend
↓
Controller Layer
↓
Service Layer
↓
Prisma ORM
↓
Neon PostgreSQL
```

---

# 7. CURRENT BIGGEST ENGINEERING CHALLENGE ⚠️

The hardest remaining problem is:

```txt id="rm40"
eliminating the last traces of frontend-simulated state
so the frontend is a pure read/act layer over the backend
```

WITHOUT:

* breaking dashboard UX during the transition
* introducing loading-state regressions
* creating synchronization bugs on initial page load

This is the remaining core architecture challenge.

---

# 8. CURRENT PROJECT MATURITY

CampusRent is now approximately:

```txt id="rm41"
90% architecturally complete
```

Core foundations are strong.

Remaining work is mostly:

* frontend lifecycle transition completion
* URL filter state persistence
* future-scope features (notifications, scaling)

No longer initial scaffolding — this is now a production-deployed full-stack application with real-time chat, RBAC/admin, CI/CD, and comprehensive tests.
