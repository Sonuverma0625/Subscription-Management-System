# Darkside Subscriptions

Darkside is a subscription-management workspace for recurring billing and customer accounts. Administrators and staff manage the catalog, subscriptions, invoices, payments, and reports; customers can review their account and use the subscription actions allowed by their plan.

## What’s included

- **Workspace:** role-based dashboards, team access, company settings, onboarding guidance, and audit history.
- **Catalog:** products and variants, plans, taxes, discounts, and quotation templates.
- **Subscriptions:** quotations, confirmations, renewals, pause/resume, cancellation, and scheduled plan changes.
- **Billing:** invoice generation, partial payments, overdue tracking, PDF downloads, and optional Razorpay checkout.
- **Customer portal:** subscription and invoice overview, payment history, account notifications, and plan-permitted actions.
- **Reports:** revenue and recurring-revenue summaries, charts, filters, and CSV exports.
- **Public site:** responsive product pages, animated workflow highlights, platform slides, FAQs, and a demo-request form.

The interface is built for desktop, tablet, and mobile layouts. Wide data tables use horizontal scrolling where needed.

## Tech stack

- React 18, Vite, Tailwind CSS, React Router, and Recharts
- Node.js, Express 5, and Prisma 6
- PostgreSQL-compatible storage; local development uses PGlite
- Optional SMTP email and Razorpay Checkout/webhooks

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

The frontend, API, and local development database run in separate terminals. Commands below are run from the project root unless a `cd` command is shown.

### Prepare the environment and install dependencies

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

cd backend
npm install
npm run prisma:generate
cd ../frontend
npm install
cd ..
```

In `backend/.env`, set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to different random values, each at least 32 characters long. The example database URL is configured for local PGlite. SMTP and Razorpay settings are optional for local development.

### Start the local database

In the first terminal:

```sh
cd backend
npm run db:dev
```

PGlite listens on `127.0.0.1:5433` and stores its development data in `backend/.local-postgres-session/`.

### Migrate, seed, and start the API

In a second terminal:

```sh
cd backend
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

The API is available at `http://localhost:4000`. Check its database connection at [`http://localhost:4000/api/v1/health`](http://localhost:4000/api/v1/health).

The demo seed creates local development users, catalog records, subscriptions, invoices, and payments. To seed a larger dataset with 5,000 subscriptions, use `npm run prisma:seed:large` instead. The seed script refuses to run when `NODE_ENV=production`.

### Start the frontend

In a third terminal:

```sh
cd frontend
npm run dev
```

Open [`http://localhost:5173`](http://localhost:5173). The frontend API URL defaults to `http://localhost:4000/api/v1`.

### Use PostgreSQL instead of PGlite

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string, then run the migration and seed commands above. Do not start `npm run db:dev` when using an external PostgreSQL server.

## Demo accounts

The seed script provides these local accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@brightloop.com` | `Admin@12345` |
| Staff | `staff1@brightloop.com` or `staff2@brightloop.com` | `Staff@12345` |
| Customer | `customer01@brightloop.com` through `customer10@brightloop.com` | `Customer@12345` |

These credentials are for local development only. Never use them in a deployed environment. Public registration creates customer accounts; administrators manage staff accounts.

## Application routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/home` | Public | Product overview, platform slides, FAQs, and demo request |
| `/login`, `/signup` | Public | Sign in or create a customer account |
| `/forgot-password`, `/reset-password/:token` | Public | Password recovery |
| `/app` | Admin, staff | Workspace dashboard |
| `/portal` | Customer | Customer account and subscription overview |
| `/products`, `/plans`, `/templates` | Admin, staff | Catalog and quotation setup |
| `/taxes`, `/discounts`, `/settings`, `/team` | Admin | Workspace administration |
| `/subscriptions`, `/invoices`, `/notifications` | Signed-in users | Billing and account activity |
| `/reports` | Admin, staff | Revenue reports and CSV exports |
| `/demo-requests`, `/onboarding`, `/audit-logs` | Admin | Leads, setup progress, and audit history |

## API route groups

All API routes are prefixed with `/api/v1`.

| Route group | Purpose |
| --- | --- |
| `/auth` | Registration, login, refresh, logout, and password recovery |
| `/users`, `/customers` | Team and customer account management |
| `/products`, `/plans`, `/taxes`, `/discounts`, `/templates` | Catalog management |
| `/subscriptions`, `/invoices`, `/payments` | Subscription lifecycle, billing, invoices, and payment records |
| `/portal` | Customer-owned subscriptions, invoices, payments, and subscription actions |
| `/reports` | Dashboard summaries, report data, and CSV exports |
| `/settings`, `/notifications`, `/audit-logs`, `/demo-requests` | Workspace settings and supporting workflows |
| `/payments/razorpay/webhook` | Razorpay payment events |
| `/health` | API and database health check |

The login endpoint returns a short-lived access token and sets a rotating refresh token in an HTTP-only cookie. The frontend keeps the access token in memory. Refresh and password-reset tokens are stored as hashes by the API.

## Environment configuration

`backend/.env.example` documents the backend variables:

- **Server and database:** `NODE_ENV`, `PORT`, `FRONTEND_URL`, and `DATABASE_URL`.
- **Authentication:** access/refresh JWT secrets and token lifetimes, plus cookie settings.
- **Company details:** `COMPANY_NAME`, `COMPANY_EMAIL`, and `COMPANY_ADDRESS`.
- **Email:** `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, and `MAIL_FROM`.
- **Notifications:** `OVERDUE_EMAILS` controls optional overdue reminder emails.
- **Payment:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
- **Frontend links:** `APP_URL` and `PASSWORD_RESET_URL`.

`frontend/.env.example` contains `VITE_API_URL` and `VITE_APP_URL`. Vite variables are available in the browser bundle; do not put secrets in them. Keep local `.env` files private and out of version control.

## Optional integrations

### Email

Configure SMTP values in `backend/.env` to deliver password-reset links, invoice emails, renewal notices, retry reminders, and demo-request notifications. The demo-request form still stores submissions in the database when SMTP is unavailable.

### Razorpay

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to enable online invoice checkout. Register `POST /api/v1/payments/razorpay/webhook` in the Razorpay dashboard and subscribe to `payment.captured` and `payment.failed`. Use test-mode credentials during development. The API verifies checkout and webhook signatures; secret keys remain on the server. Darkside does not store card numbers.

## Scheduled jobs

When the API starts, it schedules jobs in the server’s local time:

| Time | Job |
| --- | --- |
| 00:05 | Subscription expiry processing |
| 00:10 | Due billing |
| 00:20 | Overdue invoice processing |
| 00:25 | Renewal notifications |
| 00:30 | Payment retry reminders |

Admins can also run billing manually from the Invoices page.

## Deploy on Vercel

The repository contains two Vercel projects. Import the same GitHub repository twice and set the **Root Directory** to `backend` for the API and `frontend` for the web app.

### 1. Create the production database

Connect a managed PostgreSQL database to the backend Vercel project. The Prisma Postgres Vercel integration provides a direct `DATABASE_URL` for migrations and a pooled `DATABASE_URL_POOLED` for serverless requests. The API uses the pooled URL when it is available and falls back to `DATABASE_URL` for local development.

### 2. Configure the API project

Set these Production environment variables in the backend project:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Managed PostgreSQL direct connection string |
| `DATABASE_URL_POOLED` | Managed PostgreSQL pooled connection string |
| `JWT_ACCESS_SECRET` | New random secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | A different new random secret, at least 32 characters |
| `CRON_SECRET` | New random secret, at least 32 characters |
| `FRONTEND_URL` | The frontend's production URL |
| `APP_URL` | The frontend's production URL |
| `PASSWORD_RESET_URL` | `<frontend-url>/reset-password` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` when API calls use the frontend proxy described below |
| `NODE_ENV` | `production` |

SMTP and Razorpay variables are optional. Use production credentials only when those integrations are enabled. Do not add local `.env` files or the recovered PGlite data directory to Vercel.

The backend build runs `prisma generate`. After the database is connected, link the backend directory to its Vercel project and apply schema migrations once using the direct production database URL stored in Vercel:

```sh
cd backend
vercel link --project <backend-project-name>
vercel env run --environment=production -- npm run prisma:deploy
```

For the first admin, temporarily add `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and a unique `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters) to the backend project's Production environment, then run:

```sh
vercel env run --environment=production -- npm run bootstrap:admin
```

Remove those three bootstrap variables after it succeeds. The script refuses to run if an admin already exists. Do not run the demo seed in production.

The protected `/api/cron/daily` endpoint runs expiry, billing, overdue, renewal, and payment-retry jobs in order. `backend/vercel.json` schedules it once per day at 19:00 UTC (00:30 India time) and secures it with `CRON_SECRET`. Vercel Hobby may invoke a daily cron at any time during its scheduled hour; the function has a 300-second maximum duration.

### 3. Configure the frontend project

Vercel detects Vite automatically. Use `npm run build` and `dist` if the project settings ask for build values. Set these Production environment variables:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `/api/v1` |
| `VITE_APP_URL` | The frontend's production URL |

After the API deployment has a stable production URL, add an external rewrite **before** the SPA fallback in `frontend/vercel.json`:

```json
{
  "source": "/api/v1/:path*",
  "destination": "https://<backend-project>.vercel.app/api/v1/:path*"
}
```

The existing fallback rewrite serves the React app on deep links such as `/home` and `/reset-password`. The API proxy keeps browser API calls and refresh cookies on the frontend origin. Redeploy the frontend after adding the rewrite and environment variables.

## Build and production notes

Build the frontend from `frontend/`:

```sh
npm run build
npm run preview
```

Run the API without the development file watcher from `backend/` with `npm start`. Apply deployed schema migrations with `npm run prisma:deploy`; do not run the demo seed in production.

For deployment, use a managed PostgreSQL database, separate strong JWT secrets, HTTPS, secure cookies, a production frontend origin, and production SMTP/payment credentials. The local PGlite server and demo accounts are intended for development.
