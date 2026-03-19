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


class ScoreResponse(BaseModel):
    risk_score: int
    risk_level: Literal["Low", "Medium", "High"]
    explanations: List[str]
    model_used: str


class FeedbackRequest(BaseModel):
    verdict: Literal["safe", "malicious"]
    score_request: ScoreRequest
    notes: Optional[str] = None
