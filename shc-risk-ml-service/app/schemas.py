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
    # "verified" = on-chain hash confirmed; "tampered" = mismatch; "unverified" = not checked
    blockchain_integrity: Optional[str] = None


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

    ``coverage_gap_score`` measures the fraction of top risk-increasing
    SHAP features that have NO corresponding rule in the rule engine.

    ``suggested_rules`` contains auto-generated Python rule snippets for
    each coverage-gap feature, derived from the observed feature value.
    """

    shap_top_features: List[SHAPFeatureContribution]
    faithfulness_score: Optional[float]
    faithfulness_detail: List[str]
    coverage_gap_score: Optional[float]
    coverage_gap_detail: List[str]
    suggested_rules: List[str]
    suggested_rule_keys: List[str]  # parallel to suggested_rules — the feature_key each rule covers


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


class AcceptRuleRequest(BaseModel):
    rule: str  # The suggested rule snippet (Python expression string)
    feature_key: Optional[str] = None  # The feature_key this rule covers (for DB + gap tracking)
    file_id: Optional[str] = None  # For audit trail only
