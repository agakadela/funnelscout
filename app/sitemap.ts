import type { MetadataRoute } from "next";

import { marketingSitemapEntries } from "@/lib/marketing/site-indexing";

export default function sitemap(): MetadataRoute.Sitemap {
  return marketingSitemapEntries();
}
