import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not configured." }, { status: 503 });
}

export async function PUT() {
  return NextResponse.json({ error: "Not configured." }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ error: "Not configured." }, { status: 503 });
}
