import { api } from "@/lib/api";

export type AnalyzeLinkPayload = {
  file_id?: string;
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  upload_source?: string;
  share_frequency?: number;
  download_frequency?: number;
  external_links?: string[];
  text_content?: string;
  known_hash?: string;
  file_content_base64?: string;
};

export type AnalyzeLinkResult = {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanations: string[];
  model_used: string;
  cached?: boolean;
};

export async function analyzeLink(
  payload: AnalyzeLinkPayload
): Promise<{ data?: AnalyzeLinkResult; error?: string }> {
  try {
    const data = await api.post("analyze-link", payload);
    return { data: data as AnalyzeLinkResult };
  } catch (error: any) {
    return {
      error: error?.message ?? "Failed to analyze link",
    };
  }
}
