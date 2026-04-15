export type SHAPFeatureContribution = {
  feature: string;
  feature_key: string;
  shap_value: number;
  direction: "increases_risk" | "decreases_risk";
  rank: number;
};

export type XAIExplanation = {
  shap_top_features: SHAPFeatureContribution[];
  faithfulness_score: number | null;
  faithfulness_detail: string[];
  coverage_gap_score: number | null;
  coverage_gap_detail: string[];
  suggested_rules: string[];
};

export type RiskAnalysis = {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanations: string[];
  model_used: string;
  xai?: XAIExplanation | null;
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
  expires_at: string | null;
  risk?: RiskAnalysis | null;
};
