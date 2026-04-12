import type { MetadataRoute } from "next";

import { marketingRobotsRules } from "@/lib/marketing/site-indexing";

export default function robots(): MetadataRoute.Robots {
  return marketingRobotsRules();
}
