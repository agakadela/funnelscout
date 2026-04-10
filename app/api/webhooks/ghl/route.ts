import { NextResponse, type NextRequest } from "next/server";
import { verifyGHLSignature } from "@/lib/ghl/oauth";
import { GHLWebhookEventSchema } from "@/lib/ghl/types";
import { inngest } from "@/inngest/client";

function getSignatureHeader(request: NextRequest): string {
  return request.headers.get("x-ghl-signature") ?? "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
