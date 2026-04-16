import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import "./load-env";
import { applyVisualDbFixtures } from "./fixtures/apply-visual-db-state";
import { closeDatabaseConnection } from "@/lib/db";

/**
 * Applies DB fixtures for visual tests (scoped by organization workspace ids).
 * `.env.local` / `.env` are loaded in `load-env.ts` before `lib/env` is imported.
 */
async function globalSetup(): Promise<void> {
  await mkdir(resolve(process.cwd(), "tests/visual/.auth"), {
    recursive: true,
  });
  await applyVisualDbFixtures();
  await closeDatabaseConnection();
}

export default globalSetup;
