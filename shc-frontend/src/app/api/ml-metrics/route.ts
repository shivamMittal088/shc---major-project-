import { NextResponse } from "next/server";

export async function GET() {
  const mlUrl = process.env.RISK_ML_SERVICE_URL?.replace(/\/$/, "") ?? "http://localhost:8081";
  try {
    const res = await fetch(`${mlUrl}/metrics`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ML service unreachable" }, { status: 502 });
  }
}
