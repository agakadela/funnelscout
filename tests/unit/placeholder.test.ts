import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("lib/utils", () => {
  it("merges class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
