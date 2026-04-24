import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-base-url";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const backendUrl = `${getBackendBaseUrl()}/api/files/verify/${params.fileId}`;
  try {
    const authToken = req.cookies.get("__shc_access_token")?.value ?? "";
    const res = await fetch(backendUrl, {
      cache: "no-store",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Could not reach backend" },
      { status: 502 }
    );
  }
}
