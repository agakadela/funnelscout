import { NextResponse } from "next/server";

const body = { error: "Auth not configured." };

export async function GET() {
  return NextResponse.json(body, { status: 503 });
}

export async function POST() {
  return NextResponse.json(body, { status: 503 });
}
