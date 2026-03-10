"use server";

import { api } from "@/lib/api";

export async function removeFile(fileId: string): Promise<void> {
  await api.del(`api/files/remove/${fileId}`);
}
