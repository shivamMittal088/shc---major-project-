from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    file_id: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: int = 0
    upload_source: Optional[str] = None
    share_frequency: int = 0
    download_frequency: int = 0
    external_links: List[str] = Field(default_factory=list)
    text_content: Optional[str] = None
    known_hash: Optional[str] = None
    file_content_base64: Optional[str] = None


class SHAPFeatureContribution(BaseModel):
    """SHAP contribution of a single structured feature for one prediction."""

    feature: str
    feature_key: str
    shap_value: float
    direction: Literal["increases_risk", "decreases_risk"]
    rank: int


class XAIExplanation(BaseModel):
    """
    Explainability layer attached to every score response.

    ``shap_top_features`` lists the features most responsible for the
    model's prediction, ranked by absolute SHAP value.

    ``faithfulness_score`` measures the fraction of rule-based reasons
    that agree in direction with the model's own SHAP-derived attribution.
    A score of 1.0 means every rule that fired was confirmed by the model
    internally; 0.0 means the rules are completely contradicted.

    ``faithfulness_detail`` provides one annotation per mappable rule for
    reproducible comparison — the primary data for the paper evaluation.
    """

    shap_top_features: List[SHAPFeatureContribution]
    faithfulness_score: Optional[float]
    faithfulness_detail: List[str]


class ScoreResponse(BaseModel):
    risk_score: int
    risk_level: Literal["Low", "Medium", "High"]
    explanations: List[str]
    model_used: str
    xai: Optional[XAIExplanation] = None


class FeedbackRequest(BaseModel):
    verdict: Literal["safe", "malicious"]
    score_request: ScoreRequest
    notes: Optional[str] = None
