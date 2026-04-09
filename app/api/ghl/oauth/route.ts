import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "GHL OAuth initiate not implemented yet." },
    { status: 503 },
  );
}
