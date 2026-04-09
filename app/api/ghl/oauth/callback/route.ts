import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "GHL OAuth callback not implemented yet." },
    { status: 503 },
  );
}
