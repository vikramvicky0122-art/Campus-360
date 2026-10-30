# CampusRent

<div align="center">

![CampusRent](https://img.shields.io/badge/CampusRent-Campus%20Rental%20Platform-4F46E5?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-5-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**A production-deployed, full-stack peer-to-peer campus rental platform.**
Built on a lifecycle-driven booking engine, real-time chat, JWT-protected APIs, and a database-first synchronization architecture.

[**Live Demo →**](https://campus-rent-sigma.vercel.app) [**Backend Health →**](https://campus-rent-m98g.onrender.com/health) [**API Docs →**](https://campus-rent-m98g.onrender.com/api/docs)

</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Key Features](#3-key-features)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Booking Lifecycle Engine](#6-booking-lifecycle-engine)
7. [Real-Time Chat](#7-real-time-chat)
8. [Authentication & Access Control](#8-authentication--access-control)
9. [Database Design](#9-database-design)
10. [API Architecture](#10-api-architecture)
11. [Observability, Testing & CI](#11-observability-testing--ci)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Folder Structure](#13-folder-structure)
14. [Environment Variables](#14-environment-variables)
15. [Local Development Setup](#15-local-development-setup)
16. [Production Deployment](#16-production-deployment)
17. [Known Limitations & Roadmap](#17-known-limitations--roadmap)
18. [License](#18-license)

---

## 1. Project Overview

CampusRent is a full-stack, production-deployed campus rental marketplace that enables NIT Raipur students to list, discover, and rent items from one another — textbooks, electronics, equipment, and more.

The platform evolved from a frontend-only prototype into a hardened full-stack system with a production-grade booking lifecycle engine, persistent database-backed state, real-time messaging between renters, and role-segregated rental workflows. Every booking transition is enforced at the API layer with overlap conflict prevention, guarded state machine transitions, and audit-stamped cancellation metadata. The database is the canonical source of truth; the frontend is a pure consumer of backend state.

---

## 2. Problem Statement

Campus students frequently need items — textbooks, tools, cameras, sports gear — for short periods. Buying is wasteful. Borrowing informally is unreliable. Existing rental platforms are not student-context-aware and carry no trust, lifecycle transparency, or conflict enforcement.

CampusRent solves this by providing:

- A structured marketplace with server-side searchable, sortable, and filterable listings
- A lifecycle-tracked rental system with explicit handoff and return stages
- Real-time in-app chat scoped to each booking, so coordination never leaves the platform
- Role-segregated dashboards for owners and borrowers
- Overlap-safe booking enforcement to prevent double-renting
- An audit trail on every booking action, including cancellations

---

## 3. Key Features

**Marketplace**
- Server-side search, category filter, sort (price, rating, newest), and pickup-location filter — all applied before pagination, so results are correct regardless of page number
- Individual listing pages with rental pricing, security deposit, and availability window
- Listing visibility controls for owners (hide/unhide without deleting)

**Booking Lifecycle**
- Eight-stage booking state machine: `requested → approved → item_given → ongoing → return_pending → completed` (with `cancelled` and `rejected` as terminal failure paths)
- Overlap conflict detection enforced at approval time against all active confirmed bookings
- Guarded transitions that prevent invalid state jumps regardless of client input

**Real-Time Chat**
- Per-booking conversations over Socket.IO, with JWT-authenticated socket handshakes
- Typing indicators, online/offline presence, and unread message counts
- REST-backed message history so chat state survives reconnects

**Owner Dashboard**
- Active listings management, pending approval queue, rental history
- Lifecycle action controls: approve, reject, confirm handoff, confirm return
- Cancellation audit trail with timestamp and actor metadata

**Borrower Dashboard**
- Tabbed views across Pending, Upcoming, Ongoing, and History
- Borrower-side lifecycle controls: confirm receipt, initiate return request
- Full booking history including completed, cancelled, and rejected records

**Admin**
- Role-gated admin APIs (platform stats, user management, booking oversight) behind an `adminOnly` middleware checked against the JWT's embedded role

**Authentication & Security**
- JWT-based authentication, restricted to `@nitrr.ac.in` campus email addresses, with bcrypt password hashing
- Zod schema validation on all write endpoints
- Rate limiting on auth endpoints (10 requests / 15 min) to blunt credential-stuffing attempts
- Helmet security headers, environment-driven CORS enforcement with no localhost fallback in production

**Infrastructure**
- Frontend on Vercel, backend on Render, database on Neon PostgreSQL
- Prisma-managed schema with indexes on high-frequency relational fields
- Deployment-safe `postinstall` hooks for automated Prisma client generation

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v6 |
| Real-time client | socket.io-client |
| State Management | React Context API (`ListingContext`, `BookingContext`, `ChatContext`, `AuthContext`) |
| Backend | Node.js, Express 5 |
| Real-time server | Socket.IO |
| ORM | Prisma ORM |
| Database | Neon serverless PostgreSQL |
| Auth | JWT (JSON Web Tokens), bcrypt |
| Validation | Zod |
| Security | Helmet, express-rate-limit |
| Observability | Pino (structured logging), Sentry (error monitoring) |
| API Docs | OpenAPI spec via swagger-jsdoc, served through swagger-ui-express |
| Testing | Vitest + Supertest (backend), Vitest + React Testing Library (frontend) |
| CI | GitHub Actions (separate backend/frontend pipelines) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Neon |
| Linting | ESLint v9 (flat config) |

---

## 5. System Architecture

> For complete architecture documentation including the full booking state machine, auth sequence diagram, ER schema, and the current technical debt register — see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### Deployment Topology

```mermaid
graph TD
    subgraph Vercel["Vercel (Frontend)"]
        FE["React + Vite SPA"]
    end

    subgraph Render["Render (Backend)"]
        API["Express.js API + Socket.IO Server"]
        MW["JWT Middleware - Role Validation - Guard Checks"]
        PRM["Prisma ORM Client"]
        API --> MW --> PRM
    end

    subgraph Neon["Neon (PostgreSQL)"]
        DB[("PostgreSQL - User - Listing - Booking - Chat")]
    end

    FE -->|"HTTPS - JWT Bearer"| API
    FE -->|"WebSocket - JWT Handshake"| API
    PRM -->|"Connection Pool - SSL"| DB
```

### Frontend Request Flow

```mermaid
graph LR
    MP["Marketplace"] --> CTX
    OD["Owner Dashboard"] --> CTX
    BD["Borrower Dashboard"] --> CTX
    CH["Chat"] --> CTX

    subgraph CTX["React Context Layer"]
        LC["ListingContext"]
        BC["BookingContext"]
        CC["ChatContext"]
    end

    CTX --> SVC["API Service Layer"]
    SVC -->|"HTTPS"| API["Express.js Backend"]
    API -->|"JSON Response"| SVC
    SVC -->|"State Refetch"| CTX
    CH -->|"WebSocket"| SOCK["Socket.IO Server"]
```

**The frontend never reads from local state after a mutation.** Every write is followed by a backend refetch — the database is the canonical source of truth.

### Key Architectural Decisions

- **Database as source of truth** — No booking mutation is committed until persisted in Neon and refetched. The frontend never reads from its own local state after a mutation.
- **Decoupled layers** — `frontend/` and `backend/` are fully independent deployable units with no shared modules.
- **API service abstraction** — All frontend API calls route through a centralized service layer handling auth token injection, error normalization, and base URL resolution.
- **Context as projection layer** — React contexts are view-layer projections of backend state, not independent state stores.
- **Single-instance real-time state** — Socket.IO presence and typing state currently live in an in-memory map on the server process. This is a known scaling limit — see [Section 17](#17-known-limitations--roadmap).

---

## 6. Booking Lifecycle Engine

The booking engine is the core of CampusRent. Rather than a naive two-state `pending/confirmed` model, it implements an eight-stage lifecycle that mirrors real-world rental handoff and return processes.

```
                         requested   <- Borrower submits request
                             |
                   -------------------
                   |                 |
               approved          rejected   <- Owner decision
                   |
                   v
              item_given   <- Owner confirms handoff
                   |
                   v
               ongoing     <- Borrower confirms receipt
                   |
                   v
           return_pending  <- Borrower initiates return
                   |
                   v
               completed   <- Owner confirms return

     At any active stage:
               cancelled    <- Either party, with audit stamp
```

**Overlap conflict prevention** is enforced at the `requested → approved` transition. Before any approval is committed, the engine queries all bookings for the same listing in states `approved`, `item_given`, `ongoing`, or `return_pending` and validates that the requested date range does not intersect. Overlapping requests are rejected with a structured error response. States `requested`, `cancelled`, `rejected`, and `completed` are explicitly excluded from conflict checks.

**Guarded transitions** are enforced on every status-update request to the booking endpoint. The backend validates:

1. The current booking status is a valid predecessor for the requested transition.
2. The requesting user holds the correct role for that transition (owner vs. borrower).
3. No invalid intermediate state can be reached by replaying or retrying requests.

**Cancellation audit metadata** — `cancelledBy` and `cancelledAt` — is stamped at persistence time on every cancellation, preserving which party initiated and when.

---

## 7. Real-Time Chat

Each booking gets its own conversation, created lazily and tied 1:1 to the `Booking` record. This scopes chat naturally — there's no open-ended messaging outside the context of an actual rental.

- **Auth on the socket layer, not just REST**: the Socket.IO handshake itself is JWT-authenticated, so an unauthenticated client can't open a socket connection at all, not just get rejected on individual events.
- **Presence tracking**: an in-memory map of `userId -> Set<socketId>` supports multiple tabs/devices per user and broadcasts online/offline transitions.
- **Typing indicators**: debounced with a 3-second timeout per user per conversation, cleaned up on disconnect.
- **Unread counts**: tracked via `lastReadAt` on each participant, updated when a user actively views a conversation.
- **Authorization on every socket event**: joining a conversation room re-validates that the requesting user is actually a participant in that booking's conversation before allowing the join.

---

## 8. Authentication & Access Control

```
User submits credentials
         |
         v
  POST /api/auth/login
         |
   Validate user
   bcrypt compare
         |
         v
   Sign JWT
   { sub, email, role }
   Expiry: 7d
         |
   Token returned to client
         |
   All subsequent requests:
   Authorization: Bearer <token>
         |
         v
   JWT Middleware
   Verify signature
   Extract userId + role
   Attach to req.user
         |
   Route handler executes
   (adminOnly middleware additionally
    checks req.user.role === 'ADMIN'
    on admin routes)
```

- Registration is restricted to `@nitrr.ac.in` campus email addresses, enforced via a Zod schema refinement — this is a deliberate trust boundary for a campus-only marketplace, not an oversight.
- Passwords are hashed with bcrypt before persistence; the app never stores or logs raw passwords.
- JWTs are stateless — no session store is required on the backend.
- Auth endpoints are rate-limited (10 requests / 15 min) to reduce brute-force/credential-stuffing exposure.
- Role information (`USER` / `ADMIN`) is embedded in the token and used for both booking lifecycle guards and admin route access, without extra database lookups on every request.
- There is currently no third-party OAuth (Google, etc.) — auth is email/password only, matching the campus-email trust model.

---

## 9. Database Design

The schema is managed entirely through Prisma migrations against Neon PostgreSQL. All enums are Prisma-backed to prevent invalid string states from entering the database.

```
enum Role            { USER | ADMIN }
enum BookingStatus   { requested | approved | item_given | ongoing
                        return_pending | completed | cancelled | rejected }
enum ListingStatus   { active | hidden | deleted }

User            - id, fullName, collegeEmail (unique, @nitrr.ac.in), passwordHash,
                  role, department, yearOfStudy, profileImage, lenderRating,
                  ratingsCount, preferredPickupZones
                  -> listings, bookings (as borrower/owner), conversations, messages

Listing         - id, title, description, dailyRentalRate, securityDeposit,
                  category, status, preferredPickupZone, ownerId (indexed)
                  -> images, bookings

ListingImage    - id, url, listingId (indexed)

Booking         - id, listingId (indexed), borrowerId, ownerId, startDate, endDate,
                  status, totalPriceSnapshot, securityDepositSnapshot,
                  cancelledBy, cancelledAt, createdAt
                  -> conversation (1:1)

Conversation             - id, bookingId (unique, indexed) -> participants, messages
ConversationParticipant  - id, conversationId, userId, lastReadAt
                            (unique on [conversationId, userId])
Message                  - id, conversationId, senderId, content, createdAt
                            (indexed on [conversationId, createdAt] for fast history reads)
```

**Design decisions:**

- `totalPriceSnapshot` and `securityDepositSnapshot` are denormalized onto the Booking record at creation time. This preserves historical booking costs even if the listing's pricing changes after the booking is made.
- `ownerId` is duplicated onto Booking (beyond the foreign key via Listing) to enable direct owner-based queries without joining through Listing — important for dashboard performance at scale.
- Conversation is 1:1 with Booking (`@unique` on `bookingId`) — this keeps chat scoped to an actual rental rather than becoming general-purpose messaging, a deliberate scope decision.
- Indexes on `ownerId`/`listingId` (Booking, Listing) and `[conversationId, createdAt]` (Message) cover the most frequent query patterns: dashboard loads, overlap conflict checks, and chat history pagination.

---

## 10. API Architecture

The backend exposes a RESTful API organized by resource, plus a Socket.IO namespace for chat. All mutating routes require a valid JWT. Full interactive documentation is available at `/api/docs` (OpenAPI/Swagger).

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user (campus email only) | No |
| `POST` | `/api/auth/login` | Login and receive JWT | No |

### Listings

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/listings` | Get listings - supports `q`, `category`, `sortBy`, `location`, `page`, `limit`, all applied server-side before pagination | No |
| `GET` | `/api/listings/:id` | Get single listing detail | No |
| `POST` | `/api/listings` | Create a new listing | Yes (owner) |
| `PATCH` | `/api/listings/:id` | Update listing fields or visibility | Yes (owner) |

### Bookings

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/bookings` | Create a booking request | Yes (borrower) |
| `PATCH` | `/api/bookings/:id/status` | Execute a lifecycle transition (role- and state-guarded) | Yes |
| `GET` | `/api/bookings/...` | Retrieve bookings by role/status | Yes |

### Conversations / Chat

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/conversations/:bookingId` | Get or lazily create the conversation for a booking | Yes (participant) |
| `GET` | `/api/conversations/:id/messages` | Get message history | Yes (participant) |

Real-time events (`conversation:join`, `typing:start`, `message:send`, `presence:online`, etc.) are handled over the authenticated Socket.IO connection, not REST.

### Admin

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Platform-level stats | Yes (ADMIN role) |
| `GET` | `/api/admin/users` | User management, paginated | Yes (ADMIN role) |
| `GET` | `/api/admin/bookings` | Booking oversight | Yes (ADMIN role) |

**CORS policy** is environment-driven. In production, only the Vercel frontend origin is allowlisted. The backend rejects all cross-origin requests from unlisted origins — there is no localhost fallback active in the production environment.

---

## 11. Observability, Testing & CI

**Logging & error monitoring**
- Structured logging via Pino, with request-scoped context (`requestId`) attached through middleware, and sensitive fields (passwords, tokens) redacted from logs.
- Sentry integration for backend error tracking and traced sampling in production.

**Testing**
- Backend: Vitest + Supertest integration tests covering auth, booking lifecycle transitions (including overlap conflicts and guarded transitions), admin authorization, listing visibility edge cases, and chat presence/typing/unread-count behavior — run against a real Postgres instance in CI.
- Frontend: Vitest + React Testing Library component tests covering core UI (cards, forms, chat components, price breakdown, navbar).

**CI**
- Separate GitHub Actions pipelines for backend and frontend, triggered on push/PR and scoped by path (`backend/**`, `frontend/**`) so unrelated changes don't trigger unnecessary runs.
- Backend CI spins up a real `postgres:16-alpine` service container and runs the full test suite against it, rather than mocking the database.

---

## 12. Deployment Architecture

```
   Vercel (Frontend)          HTTPS/WSS         Render (Backend)
   React + Vite SPA      <-------------->   Express.js + Socket.IO
   Auto-deploy: main                        Auto-deploy: main
   VITE_API_URL=                            postinstall: prisma generate
   render backend URL                                |
                                              Prisma Client
                                                       |
                                          Neon PostgreSQL
                                          (Serverless Postgres)
                                          Connection pooling
                                          Branching support
```

**Why this stack:**

- **Vercel** handles React/Vite SPA deployments with zero configuration, automatic preview deployments per branch, and edge CDN delivery.
- **Render** provides a persistent Node.js runtime suitable for Express.js and long-lived Socket.IO connections — unlike serverless functions, it maintains both the Prisma connection pool and open WebSocket connections efficiently. The `postinstall` hook ensures `prisma generate` runs automatically on every deploy.
- **Neon** is a serverless PostgreSQL provider with instant branching for staging environments, autoscaling, and connection pooling — directly compatible with Prisma's connection URL format.

---

## 13. Folder Structure

```
Campus-Rent/
├── .github/workflows/
│   ├── backend-ci.yml
│   └── frontend-ci.yml
├── docs/
│   ├── ARCHITECTURE.md               # Full architecture doc + technical debt register
│   ├── PRD.md
│   ├── dev-logs.md
│   └── roadmap.md
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Reusable UI (cards, forms, gallery, dashboard shell)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ListingContext.jsx
│   │   │   ├── BookingContext.jsx
│   │   │   └── ChatContext.jsx
│   │   ├── pages/                    # Marketplace, ItemDetails, Booking, Chat, Dashboards, Auth
│   │   ├── services/
│   │   │   ├── api.js                # Centralized REST API service layer
│   │   │   └── chat.js               # Socket.IO client wrapper
│   │   ├── utils/                    # Booking status + media helpers
│   │   ├── constants/                # Booking status constants
│   │   └── test/                     # Vitest + RTL component tests
│   ├── eslint.config.js
│   └── vite.config.js
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # Canonical data model + enums
│   │   ├── migrations/               # Prisma migration history
│   │   └── seed.js                   # Idempotent seed pipeline
│   ├── src/
│   │   ├── routes/                   # auth, listing, booking, conversation, admin, user
│   │   ├── controllers/              # Thin request/response layer per resource
│   │   ├── services/                 # Business logic + Prisma queries per resource
│   │   ├── middleware/               # authMiddleware, adminOnly, requestContext, errorMiddleware
│   │   ├── socket/                   # auth.js (handshake auth), handler.js (event handlers)
│   │   ├── config/                   # cors, helmet, sentry, swagger, cloudinary
│   │   └── utils/                    # logger, validation (Zod schemas), AppError, prismaClient
│   ├── tests/                        # Vitest + Supertest integration tests
│   └── vitest.config.js
│
└── README.md / LICENSE / CONTRIBUTING.md
```

---

## 14. Environment Variables

### Frontend (`frontend/.env.production` / `.env.local`)

```env
VITE_API_URL=https://your-backend.onrender.com
```

> The frontend validates `VITE_API_URL` at startup and will throw a hard error if it is missing. There is no unsafe `localhost` fallback in any environment.

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@neon-host/campusrent?sslmode=require

# Auth
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# Server
PORT=4000
NODE_ENV=production

# CORS
FRONTEND_URL=https://your-app.vercel.app

# Observability (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=

# Media uploads
CLOUDINARY_URL=
```

---

## 15. Local Development Setup

### Prerequisites

- Node.js >= 20.x
- npm >= 9.x
- A Neon (or any) PostgreSQL database

### 1. Clone the repository

```bash
git clone https://github.com/vedchoraria/Campus-Rent.git
cd Campus-Rent
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js   # Optional: populate with seed data
```

### 3. Start the backend server

```bash
npm run dev
# Backend running at http://localhost:4000
# API docs at http://localhost:4000/api/docs
```

### 4. Configure the frontend

```bash
cd ../frontend
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:4000

npm install
```

### 5. Start the frontend dev server

```bash
npm run dev
# Frontend running at http://localhost:5173
```

### 6. Run tests

```bash
# Backend (spins up against DATABASE_URL)
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## 16. Production Deployment

### Database — Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Set it as `DATABASE_URL` in your backend environment

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository, set root directory to `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`, and optionally `SENTRY_DSN`, `CLOUDINARY_URL`

> Render automatically runs `postinstall` (which executes `prisma generate`) on every deploy.

To apply migrations in production:

```bash
npx prisma migrate deploy
```

### Frontend — Vercel

1. Import the repository on [vercel.com](https://vercel.com)
2. Set root directory to `frontend/`
3. Framework preset: Vite
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
5. Deploy

Vercel auto-deploys on every push to `main`, with preview deployments for pull requests.

---

## 17. Known Limitations & Roadmap

**Honest current limitations** (see [docs/ARCHITECTURE.md, Section 8](./docs/ARCHITECTURE.md) for the full technical debt register):

- Socket.IO presence/typing state is held in-memory on a single server process — no Redis adapter yet, so it does not currently scale horizontally across multiple backend instances.
- Filter state (search/sort/pagination) is not yet reflected in the URL, so it doesn't survive navigation away and back, and filtered views aren't bookmarkable.

**Not built — deliberately out of scope for now:**

- No payment integration (Stripe/Razorpay). Deposits and rent are currently coordinated off-platform between users.
- No third-party OAuth (Google, etc.). Auth is restricted to `@nitrr.ac.in` email/password by design, matching the campus-only trust model.

**Plausible future directions** (not committed, not started):

- Redis-backed Socket.IO adapter for multi-instance horizontal scaling
- URL-synchronized filter/pagination state
- Review and rating system post-completion
- Listing analytics for owners (views, booking conversion rate)

---

## 18. License

This project is licensed under the [MIT License](./LICENSE).