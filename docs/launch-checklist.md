# Pre-launch smoke checklist (Phase 8 · Task 28)

Run this on a **preview or staging deployment**, not only on localhost. Record the deployment URL and outcome in your PR or below.

**Deployment URL:** _fill in after deploy_

**Prerequisites:** `pnpm test`, `pnpm type-check`, `pnpm lint`, and `pnpm build` are green (local or CI).

## Product smoke (from `docs/spec.md` success criteria)

- [ ] **GHL — OAuth:** Connect a sandbox agency; confirm redirect back to the app and org state shows connected.
- [ ] **GHL — Webhook:** Deliver one valid signed payload; confirm a row or downstream job reflects ingest (e.g. `opportunity_events` / Inngest run).
- [ ] **GHL — Invalid HMAC:** Tampered body or wrong secret returns **401** and does not enqueue processing you rely on for “success.”
- [ ] **Stripe — Checkout:** Complete checkout for each tier you sell (or test cards); confirm subscription row and limits in the app.
- [ ] **Stripe — Webhook:** Subscription lifecycle events update plan/status as expected (`customer.subscription.updated` / `deleted`).
- [ ] **Inngest:** Scheduled `weeklyAnalysis` or manual **`POST /api/analysis/trigger`** fans out / completes without duplicate charge (idempotency where configured).
- [ ] **App — Dashboard:** Authenticated dashboard loads with expected data scope (single org).
- [ ] **App — Drill-down:** Open a sub-account; report sections render; empty/loading states look correct.
- [ ] **App — Run analysis:** “Run analysis now” completes and **refreshes in place** (no full-page reload required for the happy path).
- [ ] **Email:** Weekly digest or other Resend path received (sandbox domain acceptable).

## Security / compliance (from `AGENTS.md`)

- [ ] Every DB query path you touched in manual testing respects **organization** scoping (no cross-tenant data).
- [ ] Claude usage paths you exercised still write **`cost_logs`** where applicable.
- [ ] GHL tokens never appear plaintext in logs, UI, or Sentry.
- [ ] Stripe webhook uses **raw body** verification (regression: no `req.json()` on that route).
- [ ] **Env:** production/preview projects use `@/lib/env` keys only — no ad-hoc `process.env` in app code.
- [ ] **Headers:** Spot-check `curl -I https://<host>/` (and one API route) for baseline security headers (e.g. `X-Content-Type-Options`, HSTS on HTTPS production).

## Observability

- [ ] **Sentry:** Only intentional test errors, if any; no unexpected PII in breadcrumbs or request data.

## Recording

| Area        | Pass / fail / skipped | Notes |
|-------------|----------------------|-------|
| GHL OAuth   |                      |       |
| GHL Webhook |                      |       |
| Stripe      |                      |       |
| Inngest     |                      |       |
| App UI      |                      |       |
| Email       |                      |       |
| Security    |                      |       |

**Reviewer sign-off:** _name / date_

---

This checklist is meant to be executed on a **live preview or staging URL** with real or sandbox integrations. CI and local agents validate builds and tests only; they do not replace the checks above.

## Production configuration notes

- **`DATABASE_URL`**: use the Supabase pooler (or equivalent) for the running app on Vercel.
- **`DATABASE_URL_DIRECT`**: direct Postgres URL for `pnpm db:migrate` / `drizzle-kit` from a trusted machine, not for the serverless runtime.
- **`BETTER_AUTH_URL`**: must match the public origin; it drives auth callbacks and **metadataBase** (canonical URLs, `sitemap.xml`, Open Graph).
- **`GHL_WEBHOOK_RATE_LIMIT_PER_IP_PER_MINUTE`**: optional per-IP window on `POST /api/webhooks/ghl` (best-effort per instance on serverless). Omit or set `0` to disable. Use a shared store (e.g. Upstash) if you need a global limiter.
