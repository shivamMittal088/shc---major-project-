import { api, ApiError } from "@/lib/api";
import { ShcFile } from "@/types/file.type";

export async function getShcFile(
  fileId: string
): Promise<{ file?: ShcFile; error?: string; status?: number }> {
  try {
    const file = await api.get(`api/files/${fileId}`);
    return {
      file: file as ShcFile,
    };
  } catch (error: any) {
    console.error(error);
    const status = error instanceof ApiError ? error.status : undefined;
    return {
      error: error.message as string,
      status,
    };
  }
}
