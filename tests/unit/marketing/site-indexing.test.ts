import { describe, expect, it } from "vitest";

import {
  marketingRobotsRules,
  marketingSitemapEntries,
} from "@/lib/marketing/site-indexing";

describe("marketingSitemapEntries", () => {
  it("lists only public marketing URLs with absolute paths", () => {
    const entries = marketingSitemapEntries();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/pricing",
      "http://localhost:3000/privacy",
      "http://localhost:3000/terms",
    ]);
    expect(entries.every((e) => typeof e.lastModified !== "undefined")).toBe(
      true,
    );
  });
});

describe("marketingRobotsRules", () => {
  it("points sitemap to the site origin and disallows app and api paths", () => {
    const rules = marketingRobotsRules();
    expect(rules.sitemap).toBe("http://localhost:3000/sitemap.xml");
    expect(rules.rules).toEqual([
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/accounts",
          "/analysis-history",
          "/billing",
          "/settings",
          "/api/",
        ],
      },
    ]);
  });
});
