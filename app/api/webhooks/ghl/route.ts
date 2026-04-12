import { NextResponse, type NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import { env } from "@/lib/env";
import { verifyGHLSignature } from "@/lib/ghl/oauth";
import { tryConsumeGhlWebhookRateSlot } from "@/lib/ghl/webhook-rate-limit";
import { GHLWebhookEventSchema } from "@/lib/ghl/types";
import { getRequestClientIp } from "@/lib/request-client-ip";

function getSignatureHeader(request: NextRequest): string {
  return request.headers.get("x-ghl-signature") ?? "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = env.ghl.webhookRateLimitPerIpPerMinute;
  if (limit > 0) {
    const ip = getRequestClientIp(request);
    if (!tryConsumeGhlWebhookRateSlot(ip, limit)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const signature = getSignatureHeader(request);
  const body = await request.text();

  if (!verifyGHLSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GHLWebhookEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await inngest.send({
    name: "ghl/webhook.received",
    data: {
      event: parsed.data,
      receivedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
