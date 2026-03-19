export type RiskAnalysis = {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanations: string[];
  model_used: string;
  cached?: boolean;
};

export type ShcFile = {
  id: string;
  download_url: string;
  name: string;
  size: number;
  is_public: boolean;
  mime_type: string;
  extension: string;
  user_id: number;
  upload_status: string;
  created_at: Date;
  updated_at: Date;
  risk?: RiskAnalysis | null;
};
