import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

const root = process.cwd();

if (existsSync(resolve(root, ".env"))) {
  config({ path: resolve(root, ".env") });
}
if (existsSync(resolve(root, ".env.local"))) {
  config({ path: resolve(root, ".env.local"), override: true });
}

void import("./seed").catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
