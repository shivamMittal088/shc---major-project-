"use server";

const ML_SERVICE_URL =
  process.env.RISK_ML_SERVICE_URL ?? "http://localhost:8081";

export async function acceptRule(
  rule: string,
  fileId?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/rules/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule, file_id: fileId ?? null }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail ?? "Failed to accept rule");
    return { ok: true, message: data.message };
  } catch (err: any) {
    return { ok: false, message: err.message ?? "Unknown error" };
  }
}

export async function rejectRule(
  rule: string,
  fileId?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/rules/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule, file_id: fileId ?? null }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail ?? "Failed to reject rule");
    return { ok: true, message: data.message };
  } catch (err: any) {
    return { ok: false, message: err.message ?? "Unknown error" };
  }
}
