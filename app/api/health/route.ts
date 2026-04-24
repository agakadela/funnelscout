import { NextResponse } from "next/server";

const HEALTH_JSON = { status: "ok" } as const;

export async function GET() {
  return NextResponse.json(HEALTH_JSON, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
