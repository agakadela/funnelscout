import { Inngest } from "inngest";
import { env } from "@/lib/env";

export const inngest = new Inngest({
  id: "funnelscout",
  name: "FunnelScout",
  eventKey: env.inngest.eventKey,
});
