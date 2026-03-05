"use server";

import { api } from "@/lib/api";

export type AddFileResponse = {
  file_id: string;
  file_name: string;
  upload_url: string;
  is_public: boolean;
};

export async function addFile(payload: {
  file_name: string;
  file_size: number;
  mime_type: string;
}): Promise<AddFileResponse> {
  return (await api.post("api/files/add", payload)) as AddFileResponse;
}
