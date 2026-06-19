# WardBalance

School Financial Operating System for African private schools.

---

## Quick Start

### Prerequisites

- [Node.js v20 LTS](https://nodejs.org/)
- [PostgreSQL 16](https://www.postgresql.org/download/)
- npm

### 1. Create a PostgreSQL database

**Option A — Local PostgreSQL (recommended for development)**

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16
createdb wardbalance

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql
sudo -u postgres createdb wardbalance

# Windows — use pgAdmin or the command line:
# 1. Install PostgreSQL from https://www.postgresql.org/download/windows/
# 2. Open SQL Shell (psql) and run: CREATE DATABASE wardbalance;
```

**Option B — Neon (remote, free tier)**

1. Sign up at https://neon.tech
2. Create a project and copy the connection string
3. Use it as `DATABASE_URL` (see below)

### 2. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` to your PostgreSQL connection string:

```
# Local example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wardbalance"

# Neon example
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

Other env vars are optional for local lead-form testing:

| Variable | Required? | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Yes | e.g. `http://localhost:3000` |
| `RESEND_API_KEY` | No | Leave empty to skip email notifications |
| `RESEND_FROM_EMAIL` | No | Only needed if RESEND_API_KEY is set |
| `LEAD_NOTIFICATION_EMAIL` | No | Where lead notifications are sent |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | Leave empty to skip analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Only needed if key is set |

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma client & run migrations

```bash
npx prisma generate
npx prisma db push
```

> `npx prisma db push` syncs the schema with your database without creating migration files.
> For production, use `npx prisma migrate dev --name init` to create proper migration files.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing the Lead Form Locally

1. Ensure PostgreSQL is running and `DATABASE_URL` points to a valid database
2. Run `npx prisma db push` to create the Lead table
3. Start the dev server with `npm run dev`
4. Open the marketing page at http://localhost:3000
5. Fill out the "Request Early Access" form and submit
6. Check your database:

```bash
# Using psql
psql -d wardbalance -c "SELECT id, full_name, email, school_name, created_at FROM \"Lead\";"
```

If `DATABASE_URL` is missing or the database is unreachable, the API returns a **503** with a friendly message. The form UI shows "Something went wrong. Please try again."

---

## Resend Email — Optional Behaviour

- Resend is **completely optional**. Lead creation always succeeds regardless of email configuration.
- If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is missing, the notification email is silently skipped with a server-side warning log.
- **Before production:** verify your sender domain in the [Resend dashboard](https://resend.com). Without a verified domain, emails will not be delivered. Add the env vars to Vercel when ready.

---

## PostHog Analytics — Consent-Gated

- PostHog is **never initialized** until the user explicitly accepts analytics cookies.
- No personally identifiable information (name, email, phone, school) is sent to PostHog.
- Event tracking is wrapped in `isCategoryAllowed("analytics")` checks.
- Session recording and person profiles are disabled (TODO — revisit before public launch).

---

## Database Migration Commands

```bash
# After changing prisma/schema.prisma:
npx prisma generate          # Regenerate the client
npx prisma db push           # Sync schema (dev, no migration files)
npx prisma migrate dev       # Create a proper migration (recommended for team use)
```

---

## Deployment Checklist

Before deploying to Vercel (or Railway/Render):

- [ ] Set `DATABASE_URL` in Vercel environment variables
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production URL
- [ ] Run `npx prisma generate && npx prisma migrate deploy` in CI
- [ ] Add `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `LEAD_NOTIFICATION_EMAIL` **only after** verifying the sender domain in Resend
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` if analytics are wanted
- [ ] Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for rate limiting (see TODOs)
- [ ] Verify the Privacy Policy and Terms pages have real content (currently placeholders)

---

## Project Structure

```
src/
├── app/
│   ├── api/leads/route.ts    # Lead capture API endpoint
│   ├── page.tsx               # Marketing landing page
│   ├── privacy/page.tsx       # Privacy policy (placeholder)
│   └── terms/page.tsx         # Terms of service (placeholder)
├── components/
│   ├── marketing/             # Marketing page components
│   └── cookie-consent/        # Cookie consent banner & modal
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── email/resend.ts        # Resend email (optional)
│   ├── analytics/posthog.ts   # PostHog (consent-gated)
│   └── cookies/consent.ts     # Cookie consent management
└── modules/
    └── leads/                 # Lead domain (schema, notifications)
```

---

## Remaining TODOs

See inline `TODO` comments in the codebase. Key items:

- **Rate limiting:** Add Upstash Redis rate limiting on `src/app/api/leads/route.ts` before public launch. Key pattern: `rate_limit:lead_form:{ip}`.
- **Email:** Verify Resend sender domain before enabling production email notifications.
- **PostHog:** Configure person profiles and session recording when needed.
- **Privacy & Terms:** Replace placeholder content with full legal text before public launch.
- **Background jobs:** Add BullMQ/Upstash for queuing email notifications and other async work.
- **Tests:** Add Vitest unit tests for financial logic and Playwright E2E for full flows.
