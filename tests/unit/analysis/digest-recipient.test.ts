import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { resolveDigestRecipientEmail } from "@/lib/analysis/digest-recipient";

describe("resolveDigestRecipientEmail", () => {
  const limitMock = vi.fn();
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  beforeEach(() => {
    limitMock.mockReset();
    chain.from.mockImplementation(() => chain);
    chain.innerJoin.mockImplementation(() => chain);
    chain.where.mockImplementation(() => chain);
    chain.limit.mockImplementation(() => limitMock());
    vi.spyOn(db, "select").mockImplementation(() => chain as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns verified owner email when present", async () => {
    limitMock.mockResolvedValueOnce([{ email: "owner@example.com" }]);

    const email = await resolveDigestRecipientEmail("org-ba-1");

    expect(email).toBe("owner@example.com");
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it("returns verified member email when owner query is empty", async () => {
    limitMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: "member@example.com" }]);

    const email = await resolveDigestRecipientEmail("org-ba-1");

    expect(email).toBe("member@example.com");
    expect(limitMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when no verified owner or member", async () => {
    limitMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const email = await resolveDigestRecipientEmail("org-ba-1");

    expect(email).toBeNull();
    expect(limitMock).toHaveBeenCalledTimes(2);
  });
});
