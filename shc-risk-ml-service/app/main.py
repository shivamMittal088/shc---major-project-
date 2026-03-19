from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI

from app.feature_extractor import extract_features
from app.model_runtime import ModelRuntime
from app.rules import baseline_score
from app.schemas import FeedbackRequest, ScoreRequest, ScoreResponse

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
FEEDBACK_FILE = DATA_DIR / "feedback.ndjson"
MODEL_RUNTIME = ModelRuntime(PROJECT_ROOT / "models")

app = FastAPI(title="SHC Risk Scoring API", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "model": MODEL_RUNTIME.describe()}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    features, evidence, context = extract_features(payload)
    rule_score, reasons = baseline_score(features, evidence)

    structured_probability = MODEL_RUNTIME.predict_structured(features)
    text_probability = MODEL_RUNTIME.predict_text(payload.text_content or "")

    blended_probability = _blend_probabilities(
        rule_score / 100.0,
        structured_probability,
        text_probability,
    )
    final_score = int(round(max(0.0, min(1.0, blended_probability)) * 100))

    explanations = list(reasons)
    if structured_probability is not None:
        explanations.append(f"Structured ML probability={structured_probability:.2f}")
    if text_probability is not None:
        explanations.append(f"Text model probability={text_probability:.2f}")
    if context.get("mime_type"):
        explanations.append(f"Detected MIME type: {context['mime_type']}")

    # Keep explanations concise and unique for UI rendering.
    seen = set()
    unique_explanations = []
    for explanation in explanations:
        value = explanation.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        unique_explanations.append(value)
        if len(unique_explanations) >= 6:
            break

    return ScoreResponse(
        risk_score=final_score,
        risk_level=_risk_level(final_score),
        explanations=unique_explanations,
        model_used=MODEL_RUNTIME.describe(),
    )


@app.post("/feedback")
def submit_feedback(feedback: FeedbackRequest) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    event = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "verdict": feedback.verdict,
        "notes": feedback.notes,
        "request": feedback.score_request.model_dump(),
    }

    with FEEDBACK_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")

    return {"status": "accepted", "message": "feedback stored for retraining"}


def _risk_level(score: int) -> str:
    if score <= 30:
        return "Low"
    if score <= 70:
        return "Medium"
    return "High"


def _blend_probabilities(rule_probability: float, structured_probability: float | None, text_probability: float | None) -> float:
    weighted = 0.0
    weight_total = 0.0

    weighted += rule_probability * 0.40
    weight_total += 0.40

    if structured_probability is not None:
        weighted += structured_probability * 0.45
        weight_total += 0.45

    if text_probability is not None:
        weighted += text_probability * 0.15
        weight_total += 0.15

    return weighted / max(weight_total, 1e-9)
