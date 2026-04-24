import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-base-url";

export async function POST(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/files/demo-tamper/${params.fileId}`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Could not reach backend" }, { status: 502 });
  }
}
