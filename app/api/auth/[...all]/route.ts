import { NextResponse } from "next/server";

const body = { error: "Auth not configured (docs/plan.md Task 3)." };

export async function GET() {
  return NextResponse.json(body, { status: 503 });
}

export async function POST() {
  return NextResponse.json(body, { status: 503 });
}
