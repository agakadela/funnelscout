import { afterEach, describe, expect, it, vi } from "vitest";

const FIXTURE_GHL_TOKEN_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("ghl token encryption (fixture key)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("encryptGhlToken and decryptGhlToken round-trip with an isolated hex key", async () => {
    vi.resetModules();
    vi.stubEnv("GHL_TOKEN_ENCRYPTION_KEY", FIXTURE_GHL_TOKEN_ENCRYPTION_KEY);
    const { encryptGhlToken, decryptGhlToken } =
      await import("@/lib/ghl/oauth");
    const plain = "sample-token-plaintext";
    const enc = encryptGhlToken(plain);
    expect(enc.split(".")).toHaveLength(3);
    expect(decryptGhlToken(enc)).toBe(plain);
  });
});
