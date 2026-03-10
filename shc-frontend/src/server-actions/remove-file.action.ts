"use server";

import { ApiError, api } from "@/lib/api";

export async function removeFile(fileId: string): Promise<void> {
  try {
    await api.del(`api/files/remove/${fileId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return;
    }

    throw error;
  }
}
