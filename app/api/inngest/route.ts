import { NextResponse } from "next/server";

/** Inngest serve — wired in docs/plan.md Task 3. */
export async function GET() {
  return NextResponse.json(
    { error: "Inngest serve not configured yet." },
    { status: 503 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Inngest serve not configured yet." },
    { status: 503 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Inngest serve not configured yet." },
    { status: 503 },
  );
}
