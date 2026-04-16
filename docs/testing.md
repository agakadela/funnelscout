# Testing — FunnelScout

## Framework

**Vitest ^4.x**

Coverage target: **≥ 80%** on `lib/ai/` and `lib/ghl/`

**Playwright (`@playwright/test`)** — minimal **visual regression** only (`expect(...).toHaveScreenshot()`), not full product E2E. Specs live under `tests/visual/`.

---

## What we test

### Unit tests — `tests/unit/`

**`tests/unit/ai/agent.test.ts`**
- Each of the 3 agent steps returns the correct output structure
- Step fails gracefully when Claude returns malformed JSON
- Zod validation rejects invalid AI output shape
- Agent sets `status = 'failed'` and populates `errorMessage` when any step throws

**`tests/unit/ai/cost.test.ts`**
- Cost calculation is correct for `CLAUDE_SONNET_MODEL` ($3 input / $15 output per million tokens)
- Returns 0 for zero tokens
- Handles small token counts without floating point errors

**`tests/unit/ghl/webhook.test.ts`**
- HMAC signature verification passes for valid signature
- HMAC signature verification fails for tampered body
- HMAC signature verification fails for missing header
- `GHLWebhookEventSchema.safeParse` accepts all 4 event types (OpportunityCreate, OpportunityStageUpdate, OpportunityStatusUpdate, OrderCreate)
- `safeParse` rejects unknown event type
- `safeParse` rejects missing required fields

**`tests/unit/billing.test.ts`**
- `checkPlanLimit()` allows analysis when active sub-account count equals the plan limit
- `checkPlanLimit()` blocks analysis when active sub-account count exceeds the plan limit
- `checkPlanLimit()` allows analysis when active sub-account count is below the limit
- `checkPlanLimit()` blocks when subscription status is not 'active'

**`tests/unit/metrics.test.ts`** *(if extracted from analyzeAccount)*
- Conversion rate calculation is correct
- Average time in stage calculation handles zero events
- Week-over-week revenue trend handles missing prior period data

### Integration tests — `tests/integration/`

Folder layout matches `docs/project.md`. Suites described here may land incrementally (e.g. `stripe/` can stay absent until the webhook tests are implemented).

**`tests/integration/inngest/weeklyAnalysis.test.ts`**
- Parent job triggers exactly one child job per active sub-account
- Parent job skips sub-accounts belonging to organizations with canceled subscriptions

**`tests/integration/stripe/webhook.test.ts`**
- `checkout.session.completed` creates a Subscription record with correct plan and subAccountLimit
- `customer.subscription.updated` updates the Subscription record
- `customer.subscription.deleted` sets status to 'canceled'
- Invalid Stripe signature returns 401 and does not update DB

---

## What we do NOT test

- **Full E2E (Playwright)** — flows beyond the curated visual snapshots below are out of scope unless we expand the suite deliberately.
- **Real Claude API calls** — non-deterministic output + costs money. Always mock.
- **Real GHL API calls** — external dependency. Always mock.
- **Full Inngest job execution in CI** — use Inngest's test helpers for unit-level job logic.

---

## How to mock

### Claude API

```typescript
import { vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockAnalysisOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      }),
    },
  })),
}))
```

### GHL API

```typescript
import { vi } from 'vitest'
import * as ghlClient from '@/lib/ghl/client'

vi.mock('@/lib/ghl/client', () => ({
  fetchOpportunities: vi.fn().mockResolvedValue(mockOpportunities),
  refreshGHLToken:    vi.fn().mockResolvedValue({ accessToken: 'new-token', expiresAt: new Date() }),
}))
```

### Database

Use an in-memory or test database for integration tests. Never run integration tests against the production or staging database.

---

## When to write tests

Align with `docs/plan.md` (**Task done** + **Incremental delivery**) and `docs/agent-prompts.md` (zasada 4): add or extend tests **in the same task or slice** as the code; **`pnpm test` must pass** before closing a task (`AGENTS.md` definition of done). Phase 6 in the plan is for **coverage**, **integration tests**, and gaps—not deferring all unit tests to the end.

---

## Running tests

```bash
pnpm test                  # run all tests once
pnpm test:watch            # watch mode during development
pnpm test:coverage         # coverage report — check lib/ai/ and lib/ghl/ are ≥ 80%
```

---

## Visual / Playwright

**Prerequisites:** `pnpm db:seed` against the same `DATABASE_URL` as the app; env vars valid per `lib/env` (including `BETTER_AUTH_URL`). The Playwright default base URL is `http://localhost:3000` — it must match **`BETTER_AUTH_URL` origin** (localhost vs `127.0.0.1` affects cookies). Optional: `VISUAL_TEST_SEED_PASSWORD` if you override the seed owner password from `scripts/seed.ts`. Auth cookies for runs are written under `tests/visual/.auth/` (gitignored); CI should generate them via the Playwright `setup` project, not commit secrets.

```bash
pnpm test:visual                    # run visual regression (Chromium)
pnpm exec playwright test --update-snapshots   # accept new PNG baselines after intentional UI changes
```

Baseline PNGs are stored next to the spec (e.g. `tests/visual/*-snapshots/`). Playwright names files with the OS (e.g. `-darwin` vs `-linux`); regenerate on the runner OS you care about for CI.

---

## Coverage check

After running `pnpm test:coverage`, verify:

```
lib/ai/     ≥ 80%
lib/ghl/    ≥ 80%
```

If below target: add missing unit tests before shipping. Do not delete tests or lower the threshold.

---

## Test file example

```typescript
// tests/unit/ai/cost.test.ts
import { describe, it, expect } from 'vitest'
import { calculateCost } from '@/lib/ai/cost'
import { CLAUDE_SONNET_MODEL } from '@/lib/ai/types'

describe('calculateCost', () => {
  it('calculates cost for the configured model correctly', () => {
    // $3 input + $15 output per million tokens
    const cost = calculateCost(CLAUDE_SONNET_MODEL, 1_000_000, 1_000_000)
    expect(cost).toBe(18.0)
  })

  it('returns 0 for zero tokens', () => {
    expect(calculateCost(CLAUDE_SONNET_MODEL, 0, 0)).toBe(0)
  })

  it('handles small token counts without floating point errors', () => {
    const cost = calculateCost(CLAUDE_SONNET_MODEL, 1_000, 500)
    expect(cost).toBe(0.0105)
  })
})
```
