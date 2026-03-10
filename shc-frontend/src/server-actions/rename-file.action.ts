"use server";

import { api } from "@/lib/api";

export async function renameFile(fileId: string, name: string) {
  return api.patch(`api/files/rename/${fileId}`, { name });
}