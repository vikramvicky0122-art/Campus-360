# CampusRent — Product Requirements Document (PRD)

## 1. Product Overview

### Product Name

CampusRent

### Tagline

A trusted peer-to-peer campus rental marketplace for students.

### Vision

Enable students to rent, lend, and reuse products within their campus ecosystem safely, affordably, and conveniently.

### Problem Statement

Students frequently need products temporarily:

* Calculators before exams
* Laptops during repairs
* Bikes for short travel
* Cameras for events
* Lab equipment or books for projects
* Event clothing or accessories

Buying these products is expensive and inefficient.
At the same time, many students already own underutilized items.

Current alternatives are poor because:

* General marketplaces lack trust and campus verification.
* Renting locally through chats/groups is messy and unsafe.
* Existing rental platforms are expensive and not student-focused.
* There is no structured rental lifecycle.

CampusRent solves this by creating a campus-only trusted rental ecosystem.

---

# 2. Goals

## Primary Goals

* Build a trusted student rental ecosystem.
* Reduce unnecessary purchases.
* Enable students to earn from idle products.
* Create a simple and realistic rental workflow.
* Make transactions feel safe and transparent.

## Secondary Goals

* Build strong campus network effects.
* Introduce verified identity-based trust.
* Create reusable backend architecture.
* Prepare for future expansion into multi-campus operations.

---

# 3. Target Audience

## Primary Users

### College Students

Students who:

* Need products temporarily
* Want cheaper access to products
* Want to earn side income
* Prefer local campus exchanges

### Student Lenders

Students who own:

* Electronics
* Books
* Vehicles
* Event accessories
* Academic tools

and want passive income.

---

## Secondary Users

### Student Clubs

Can rent event equipment.

### Freshers

Often need temporary products before buying permanently.

### Hostel Students

Need low-cost short-term solutions.

---

# 4. Core Product Philosophy

CampusRent is NOT:

* A national e-commerce marketplace
* A courier-heavy logistics platform
* A random classified app

CampusRent IS:

* Hyperlocal
* Trust-first
* Campus-centered
* Rental-lifecycle-driven
* Simple and fast

---

# 5. Main USP

## Campus Trust Layer

Users belong to the same college ecosystem.
Potential future verification:

* College email verification
* Student ID verification
* Hostel verification

This significantly reduces fraud.

## Hyperlocal Rentals

Most exchanges happen physically within campus.
No shipping complexity in MVP.

## Structured Rental Lifecycle

Unlike chat-based renting, CampusRent handles:

* Booking
* Acceptance
* Pickup
* Active rental
* Return
* Completion

with proper state management.

## Affordable Access

Students can use products without buying them.

---

# 6. MVP Scope

## Included in MVP

### Authentication

* User signup/login
* JWT authentication
* Protected routes
* Session persistence

### User Profiles

* Basic profile
* User listings
* Rental history

### Listings

Users can:

* Create listings
* Upload product images
* Add pricing
* Add descriptions
* Set availability
* Edit/delete listings

### Product Discovery

* Browse listings
* View item details
* Search/filter listings

### Booking System

Users can:

* Request rentals
* Choose rental dates
* Make payment before owner approval (planned workflow)
* View booking status
* Track payment/refund state

### Rental Lifecycle

CampusRent follows a realistic rental + payment workflow.

### Booking Lifecycle

* REQUESTED
* ACCEPTED
* REJECTED
* ITEM_GIVEN
* ACTIVE
* RETURN_PENDING
* COMPLETED
* CANCELLED

### Payment Lifecycle

* UNPAID
* PAYMENT_HELD
* REFUNDED
* PARTIAL_REFUND
* PAID_TO_OWNER

### Workflow Philosophy

CampusRent plans to follow an escrow-style workflow:

1. Renter places booking request
2. Payment is collected and temporarily held by platform
3. Owner accepts or rejects request
4. If rejected → automatic refund
5. If accepted → rental proceeds normally
6. Platform later releases payout to lender

This reduces spam/fake bookings while protecting both renter and lender.

### Dashboard

Separate sections for:

* My Rentals
* My Listings
* Requests received
* Requests sent

### Booking Actions

Owners can:

* Accept request
* Reject request
* Mark item handed over
* Mark return received

Renters can:

* Cancel pending requests
* Mark item return initiated

### Responsive UI

Functional desktop-first responsive interface.

---

## Excluded From MVP

These are intentionally postponed:

### Payments

No integrated online payments initially.
Transactions handled offline.

### Delivery Logistics

No delivery partners.
Users meet physically.

### Real-time Chat

Not required for MVP.

### Reviews/Ratings

Can be added later.

### AI Recommendations

Future scope.

### Damage Detection

Future scope.

### Multi-campus Expansion

Initial launch focuses on one campus.

---

# 7. User Flow

## Listing Flow

1. User signs in
2. Creates listing
3. Uploads details/images
4. Publishes item
5. Listing appears in marketplace

---

## Renting Flow

1. User browses products
2. Opens item page
3. Selects dates
4. Sends booking request
5. Owner accepts/rejects
6. Physical meetup happens
7. Owner marks item given
8. Rental becomes active
9. User returns item
10. Owner confirms return
11. Booking completed

---

# 8. Functional Requirements

## Authentication Module

### Features

* Register
* Login
* Logout
* Token validation
* Protected APIs

### Tech Notes

* JWT-based auth
* Password hashing
* Role-ready architecture

---

## Listings Module

### Features

* CRUD operations
* Image upload
* Availability status
* Price/day
* Product category

### Validation

* Required fields
* Positive pricing
* Image validation

---

## Booking Module

### Features

* Create booking
* Booking approval system
* Status transitions
* Conflict prevention

### Important Rules

* Only owners can approve/reject bookings
* Renters can cancel before certain lifecycle stages
* Invalid lifecycle transitions are blocked by backend validation
* Completed bookings are immutable
* Owner rejection after payment automatically triggers refund flow
* Payment and booking states are handled separately
* Platform temporarily holds payment before owner approval

### Lifecycle Protection Rules

Valid transitions are strictly enforced.

Examples:

* REQUESTED → ACCEPTED
* ACCEPTED → ITEM_GIVEN
* ACTIVE → RETURN_PENDING

Invalid examples:

* REQUESTED → COMPLETED
* REJECTED → ACTIVE
* COMPLETED → ACTIVE

This state-machine design prevents inconsistent booking behavior and improves system reliability.

---

## Dashboard Module

### Features

* Booking grouping
* Status-based filtering
* Actions based on role
* Recent activity

---

# 9. Non-Functional Requirements

## Performance

* Fast page load
* Optimized API calls
* Responsive interactions

## Scalability

Architecture should support:

* Multiple campuses
* Increased listings
* Real-time features later

## Security

* JWT auth
* Password hashing
* Protected routes
* Ownership validation
* Input sanitization

## Reliability

* Consistent booking states
* Prevent invalid lifecycle transitions

---

# 10. Tech Stack

## Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Axios

## Backend

* Node.js
* Express.js
* Prisma ORM
* JWT Authentication

## Database

* PostgreSQL

## Deployment (Potential)

* Vercel (Frontend)
* Render/Railway (Backend)
* Supabase/Neon/Postgres hosting

---

# 11. Database Entities

## User

* id
* name
* email
* password
* createdAt

## Listing

* id
* title
* description
* pricePerDay
* images
* ownerId
* availability

## Booking

* id
* renterId
* listingId
* startDate
* endDate
* status

---

# 12. Current Product Status

## Already Implemented / Discussed

* Frontend structure
* Routing
* Authentication system
* Dashboard architecture
* Listing management
* Rental lifecycle logic
* Protected APIs
* Booking transitions
* UI grouping based on statuses

## Current Product Direction

Focus is shifting from:
"basic CRUD marketplace"

to:
"realistic rental operations platform"

This improves:

* Product depth
* Portfolio quality
* Real-world architecture understanding

---

# 13. Planned Future Features

## Phase 2

### Quick View Modal

Preview item details without leaving listing page.

### Extend Rental Duration

Users request rental extension.

### Ratings & Reviews

Trust-building system.

### Notifications

Booking and return reminders.

### Saved Listings

Wishlist/favorites.

---

## Phase 3

### Online Payments

Escrow-like payment holding and payout flow.

Potential future capabilities:

* Automatic refunds
* Partial refund policies
* Time-based cancellation windows
* Security deposits
* Damage deductions

### Security Deposits

Reduce damage/fraud.

### Real-time Chat

Built-in communication.

### Campus Verification

Student email verification.

### Admin Dashboard

Moderation and dispute handling.

---

## Long-Term Vision

### Multi-campus Expansion

Scale across universities.

### AI Layer

* Dynamic pricing suggestions
* Fraud detection
* Smart recommendations

### Rental Analytics

Track demand trends.

### B2B Campus Partnerships

Partner with colleges and clubs.

---

# 14. Risks & Challenges

## Trust & Fraud

Users may:

* Damage products
* Not return products
* Create fake bookings
* Abuse cancellation policies

Mitigation:

* Verification systems
* Ratings/reviews
* Escrow-style

---

## Marketplace Liquidity

Low listings can reduce platform usefulness.

Mitigation:

* Focus on one campus first
* Seed listings manually

---

## Operational Complexity

Rental lifecycle becomes complicated quickly.

Mitigation:

* Strong backend state management
* Strict transition guards

---

# 15. Success Metrics

## MVP Metrics

* Number of active users
* Listings created
* Completed rentals
* Repeat renters
* Booking acceptance rate

## Product Metrics

* Time to complete booking
* User retention
* Failed booking rate
* Listing utilization rate

---

# 16. Why This Project Matters

CampusRent is valuable because it demonstrates:

* Real-world product thinking
* Full-stack engineering
* State management complexity
* Backend architecture
* Marketplace workflows
* User-centric design
* Scalability planning

It goes beyond a simple CRUD project and becomes a realistic systems project.

---

# 17. Open Questions / Product Decisions

These are still evolving:

## Should payments be added early?

Tradeoff between realism and complexity.

## Should identity verification be mandatory?

Improves trust but increases friction.

## Should chat exist inside app or externally?

WhatsApp may already solve this.

## Should listings expire automatically?

Helps reduce stale inventory.

## How should disputes be handled?

Potential admin moderation system needed later.

---

# 18. Final Product Direction

The current direction should prioritize:

1. Strong rental workflow
2. Trust & usability
3. Realistic product architecture
4. Clean UI/UX
5. Scalable backend foundations

instead of trying to become a massive feature-heavy marketplace too early.

The MVP goal is:
"Make campus rentals actually work smoothly."
