import { api } from "@/lib/api";
import { ShcFile } from "@/types/file.type";

export type FilesResponse = {
  results: Omit<ShcFile, "download_url">[];
  total_results: number;
  total_pages: number;
  current_page: number;
  next_page: number;
  prev_page: number;
  per_page: number;
};

type GetFilesParams = {
  page?: number;
  limit?: number;
  search?: string;
  language?: string;
};

export async function getFiles({
  page = 1,
  limit = 10,
  search = "",
  language = "",
}: GetFilesParams = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (language.trim()) {
    params.set("language", language.trim().toLowerCase());
  }

  return (await api.get(`api/files?${params.toString()}`, "no-store")) as FilesResponse;
}
