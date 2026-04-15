import { describe, expect, it } from "vitest";

import {
  isEmailNotVerifiedError,
  isVerificationLinkError,
} from "@/lib/auth-errors";

describe("isEmailNotVerifiedError", () => {
  it("returns true for EMAIL_NOT_VERIFIED", () => {
    expect(isEmailNotVerifiedError({ code: "EMAIL_NOT_VERIFIED" })).toBe(true);
  });

  it("returns true for legacy snake_case", () => {
    expect(isEmailNotVerifiedError({ code: "email_not_verified" })).toBe(true);
  });

  it("returns false for other codes", () => {
    expect(isEmailNotVerifiedError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      false,
    );
  });
});

describe("isVerificationLinkError", () => {
  it("accepts TOKEN_EXPIRED and INVALID_TOKEN", () => {
    expect(isVerificationLinkError("TOKEN_EXPIRED")).toBe(true);
    expect(isVerificationLinkError("INVALID_TOKEN")).toBe(true);
    expect(isVerificationLinkError(null)).toBe(false);
    expect(isVerificationLinkError("OTHER")).toBe(false);
  });
});
