import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

function siteOrigin(): string {
  return env.auth.url.replace(/\/$/, "");
}

export function marketingSitemapEntries(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const lastModified = new Date();
  const paths = ["/", "/pricing", "/privacy", "/terms"] as const;
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

export function marketingRobotsRules(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: [
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
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
