import { resolve } from "node:path";

/** Must match `SEED_OWNER_PASSWORD` in `scripts/seed.ts`. Override with `VISUAL_TEST_SEED_PASSWORD`. */
export const DEFAULT_SEED_PASSWORD = "SeedPass123!";

export const VISUAL_SEED_EMAIL = {
  owner01: "seed.owner.01@funnelscout.local",
  owner02: "seed.owner.02@funnelscout.local",
  owner03: "seed.owner.03@funnelscout.local",
} as const;

/** App workspace ids from `scripts/seed.ts` (multi-tenant queries use these). */
export const VISUAL_SEED_WORKSPACE = {
  org1: "seed_workspace_01",
  org2: "seed_workspace_02",
  org3: "seed_workspace_03",
} as const;

export function authStoragePath(filename: string): string {
  return resolve(process.cwd(), "tests/visual/.auth", filename);
}

export function visualTestPassword(): string {
  return process.env.VISUAL_TEST_SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD;
}
