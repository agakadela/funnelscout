import { NextResponse } from "next/server";

/** GHL webhook — HMAC verification + Inngest enqueue (later tasks). */
export async function POST() {
  return NextResponse.json(
    { error: "GHL webhook not implemented yet." },
    { status: 503 },
  );
}
