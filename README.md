# Digital Heroes

> A subscription-driven platform combining amateur golf performance tracking, transparent monthly draw-based rewards, and accredited charity fundraising.

---

## 1. Project Overview

**Digital Heroes** transforms the amateur golf experience into a community-powered engine for social good and player excitement. The platform operates across three foundational pillars:

1. **Play & Performance**: Golfers submit attested 18-hole scorecards with course rating and slope adjustments, tracking handicap differentials aligned with World Handicap System (WHS) principles.
2. **Chance to Win**: Subscribers automatically receive entry tickets into audited monthly prize draws, augmented by playing activity and performance multipliers.
3. **Charity Impact**: A configurable portion of membership fees directly funds accredited partner non-profit organizations chosen by each subscriber.

---

## 2. Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom SaaS design tokens, responsive grid system)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
- **Authentication**: Supabase Auth (Cookie-based SSR sessions via `@supabase/ssr`)
- **Storage**: Supabase Storage (Future scorecard proof uploads)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: Node.js built-in Test Runner (`tsx --test`)
- **Target Deployment**: [Vercel](https://vercel.com/)

---

## 3. Local Development Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **Supabase Account**: (Required for Stage 2+ live database operations)

### Installation

1. Clone the repository and navigate into the root directory:
   ```bash
   cd e:\DIGITAL_HEROS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   > **Note**: For Stage 1, the application is built to compile and render placeholder UI safely without live credentials. For Stage 2+, fill in your actual Supabase URL and keys.

---

## 4. Environment Variables

Create `.env.local` based on `.env.example`:

| Variable | Scope | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Supabase project API gateway | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Client-safe anonymous API key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Privileged administrative database key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_APP_URL` | Public | Base application URL | `http://localhost:3000` |

> [!CAUTION]
> **CRITICAL SECURITY RULE**: `SUPABASE_SERVICE_ROLE_KEY` has full superuser access bypassing Row Level Security (RLS). It must **NEVER** be prefixed with `NEXT_PUBLIC_` or imported into client components.

---

## 5. Project Directory Structure

```text
DIGITAL_HEROS/
├── app/
│   ├── (public)/                     # Public marketing & visitor pages
│   │   ├── layout.tsx                # Layout with Navbar & Footer
│   │   ├── page.tsx                  # Modern SaaS Homepage
│   │   ├── how-it-works/page.tsx     # Explainer for the 3 pillars
│   │   ├── pricing/page.tsx          # Membership tiers
│   │   ├── charities/page.tsx        # Charity directory
│   │   └── draws/page.tsx            # Monthly draw info
│   ├── (auth)/                       # Authentication flows
│   │   ├── layout.tsx                # Centered auth container
│   │   ├── login/page.tsx            # Login page
│   │   └── signup/page.tsx           # Registration page
│   ├── (dashboard)/                  # Registered subscriber portal
│   │   ├── layout.tsx                # Subscriber portal layout with DashboardNav
│   │   ├── dashboard/page.tsx        # KPI overview & player summary
│   │   ├── scores/page.tsx           # Scorecard posting & history
│   │   ├── charity/page.tsx          # Non-profit selection & split %
│   │   ├── subscription/page.tsx     # Billing tier & renewal status
│   │   ├── winnings/page.tsx         # Draw tickets & prize claims
│   │   └── profile/page.tsx          # Golfer settings & handicap ID
│   ├── admin/                        # Administrator portal
│   │   ├── layout.tsx                # Admin portal layout with AdminNav
│   │   ├── page.tsx                  # Superuser dashboard
│   │   ├── users/page.tsx            # User list & role management
│   │   ├── subscriptions/page.tsx    # Membership lifecycle & churn
│   │   ├── scores/page.tsx           # Scorecard moderation & review
│   │   ├── charities/page.tsx        # Charity partner onboarding
│   │   ├── draws/page.tsx            # Draw scheduling & simulation
│   │   ├── winners/page.tsx          # Winner proof inspection queue
│   │   └── reports/page.tsx          # Payouts & financial reconciliation
│   ├── api/
│   │   └── health/route.ts           # System status endpoint
│   ├── globals.css                   # Tailwind directives & CSS variables
│   └── layout.tsx                    # Root layout & font definitions
├── components/
│   ├── ui/                           # Reusable UI primitives (Button, Card, Input, Select, Badge, Modal, etc.)
│   ├── layout/                       # Shared navigation & wrappers (Navbar, Footer, Container, Navbars)
│   ├── forms/                        # Form elements & field wrappers
│   └── dashboard/                    # Dashboard widgets (PageHeader, MetricCard)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Safe browser Supabase client
│   │   ├── server.ts                 # Server-side Supabase client (cookies)
│   │   ├── admin.ts                  # Server-only service-role client
│   │   └── middleware.ts             # Auth session refresh middleware
│   ├── auth/
│   │   ├── roles.ts                  # UserRole enum & permission mapping
│   │   └── session.ts                # Server auth helpers (getCurrentUser, etc.)
│   ├── validations/
│   │   └── auth.ts                   # Zod schemas for input validation
│   └── utils.ts                      # Tailwind cn class merger
├── services/                         # Service layer abstractions & stubs
│   ├── scores/scoreService.ts
│   ├── subscriptions/subscriptionService.ts
│   ├── charities/charityService.ts
│   └── draws/drawService.ts
├── types/                            # Core TypeScript definitions
│   ├── database.ts                   # 14 core entities from the PRD
│   ├── auth.ts                       # Auth & session contracts
│   └── index.ts                      # Barrel exports
├── tests/
│   └── sanity.test.ts                # Foundational unit tests
├── middleware.ts                     # Root Next.js middleware
├── tailwind.config.ts                # Tailwind theme configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Project dependencies & scripts
```

---

## 6. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on `http://localhost:3000` |
| `npm run build` | Compiles the production build with type checking and static generation |
| `npm run start` | Runs the compiled production server |
| `npm run lint` | Runs Next.js ESLint verification |
| `npm run test` | Runs the test suite using `tsx --test` |

---

## 7. Current Scope: Stage 1 (Project Foundation Only)

- [x] Initialized Next.js 14 App Router project with TypeScript and Tailwind CSS.
- [x] Configured zero-config build safety for Supabase (static pages compile without throwing if keys are not yet provided).
- [x] Implemented browser, server, and administrative Supabase client architecture.
- [x] Created role definitions (`subscriber`, `admin`) and permission helpers.
- [x] Defined TypeScript models for all 14 entities specified in the PRD.
- [x] Established service layer interfaces and stubs for scores, subscriptions, charities, and draws.
- [x] Created clean, reusable UI primitives (`Button`, `Card`, `Input`, `Select`, `Badge`, `Modal`, `LoadingState`, `EmptyState`, `ErrorState`).
- [x] Built responsive layouts with `Navbar`, `Footer`, `DashboardNav`, `AdminNav`, and `Container`.
- [x] Implemented modern SaaS Homepage communicating Play, Win, and Impact without golf stereotypes.
- [x] Created professional placeholder routes for all public, auth, subscriber, and admin pages.
- [x] Verified build, lint, and test pass with 0 errors.

---

## 8. Upcoming Implementation Roadmap

- **Stage 2**: Database Schema, Supabase Migrations, Seed Data, and Row Level Security (RLS) policies.
- **Stage 3**: Golf Scorecard Management, Course Handicap calculation, and WHS Differential engine.
- **Stage 4**: Stripe Subscriptions, Webhooks, Customer Billing Portal, and Tier Management.
- **Stage 5**: Charity Management, Directory, Allocation Sliders, and Transparent Payouts.
- **Stage 6**: Verifiable Draw Engine, Draw Simulation, Ticket Multipliers, Winner Verification & Proof Uploads.
- **Stage 7**: Reporting, Financial Reconciliation, Final Production Polish, and Vercel Deployment.
