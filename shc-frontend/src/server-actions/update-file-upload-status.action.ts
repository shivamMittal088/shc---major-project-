"use server";

import { api } from "@/lib/api";

export type UploadStatus = "not_started" | "uploading" | "uploaded" | "failed";

export async function updateFileUploadStatus(
  fileId: string,
  uploadStatus: UploadStatus
): Promise<{ id: string; upload_status: UploadStatus }> {
  return (await api.patch(`api/files/update-upload-status/${fileId}`, {
    upload_status: uploadStatus,
  })) as { id: string; upload_status: UploadStatus };
}
