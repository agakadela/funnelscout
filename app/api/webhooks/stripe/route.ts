import { NextResponse } from "next/server";

/** Stripe webhook — use `req.text()` for signature verification (spec). */
export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhook not implemented yet." },
    { status: 503 },
  );
}
