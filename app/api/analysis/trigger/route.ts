import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Analysis trigger not implemented yet." },
    { status: 503 },
  );
}
