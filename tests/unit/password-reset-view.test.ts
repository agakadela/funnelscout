import { describe, expect, it } from "vitest";

import { resolveResetPasswordPhase } from "@/lib/password-reset-view";

describe("resolveResetPasswordPhase", () => {
  it("treats INVALID_TOKEN as link unusable even without token", () => {
    expect(
      resolveResetPasswordPhase({ token: null, error: "INVALID_TOKEN" }),
    ).toEqual({ type: "link_unusable" });
  });

  it("redirects when token is missing and there is no error", () => {
    expect(resolveResetPasswordPhase({ token: null, error: null })).toEqual({
      type: "missing_token_redirect",
    });
    expect(resolveResetPasswordPhase({ token: "", error: undefined })).toEqual({
      type: "missing_token_redirect",
    });
  });

  it("returns ready when a non-empty token is present without INVALID_TOKEN", () => {
    expect(resolveResetPasswordPhase({ token: "abc123", error: null })).toEqual(
      { type: "ready", token: "abc123" },
    );
  });

  it("trims token whitespace", () => {
    expect(
      resolveResetPasswordPhase({ token: "  tok  ", error: null }),
    ).toEqual({ type: "ready", token: "tok" });
  });
});
