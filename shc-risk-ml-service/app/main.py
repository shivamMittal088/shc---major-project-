from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Set

from fastapi import FastAPI

from app.feature_extractor import extract_features
from app.model_runtime import ModelRuntime
from app.rules import baseline_score
from app.schemas import AcceptRuleRequest, FeedbackRequest, ScoreRequest, ScoreResponse, SHAPFeatureContribution, XAIExplanation

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
FEEDBACK_FILE = DATA_DIR / "feedback.ndjson"
DB_FILE = DATA_DIR / "rules.db"
RULES_FILE = PROJECT_ROOT / "app" / "rules.py"
MODEL_RUNTIME = ModelRuntime(PROJECT_ROOT / "models")

# In-memory set of accepted feature keys — loaded from DB on startup,
# updated on each /rules/accept call.  Passed into the SHAP explainer so
# accepted rules are treated as COVERED on every subsequent /score request.
ACCEPTED_FEATURE_KEYS: Set[str] = set()


def _db_conn() -> sqlite3.Connection:
    """Return a thread-safe connection to the rules SQLite database."""
    conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    """Create the accepted_rules table if it does not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _db_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS accepted_rules (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ts          TEXT    NOT NULL,
                file_id     TEXT,
                feature_key TEXT,
                rule        TEXT    NOT NULL,
                action      TEXT    NOT NULL DEFAULT 'accepted'
            )
            """
        )

app = FastAPI(title="SHC Risk Scoring API", version="0.1.0")


@app.on_event("startup")
async def on_startup() -> None:
    global ACCEPTED_FEATURE_KEYS

    # Initialise SQLite DB and load previously accepted feature keys
    _init_db()
    with _db_conn() as conn:
        rows = conn.execute(
            "SELECT feature_key FROM accepted_rules WHERE action = 'accepted' AND feature_key IS NOT NULL"
        ).fetchall()
    ACCEPTED_FEATURE_KEYS = {row["feature_key"] for row in rows}

    print("")
    print("  ███████╗██╗  ██╗ ██████╗")
    print("  ██╔════╝██║  ██║██╔════╝")
    print("  ███████╗███████║██║     ")
    print("  ╚════██║██╔══██║██║     ")
    print("  ███████║██║  ██║╚██████╗")
    print("  ╚══════╝╚═╝  ╚═╝ ╚═════╝  Risk ML Service")
    print("")
    shap_status = "available" if (MODEL_RUNTIME.shap_explainer and MODEL_RUNTIME.shap_explainer.available) else "unavailable"
    print(f"  Model  : {MODEL_RUNTIME.describe()}")
    print(f"  SHAP   : {shap_status}")
    print(f"  Rules DB: {DB_FILE} ({len(ACCEPTED_FEATURE_KEYS)} accepted feature keys loaded)")
    print("  Endpoints:")
    print("    POST  /score     — score a file link")
    print("    POST  /feedback  — submit a verdict")
    print("    GET   /healthz   — health check")
    print("")
    print("  Running on http://0.0.0.0:8000")
    print("")


@app.get("/healthz")
def healthz() -> dict:
    shap_available = bool(
        MODEL_RUNTIME.shap_explainer and MODEL_RUNTIME.shap_explainer.available
    )
    return {"status": "ok", "model": MODEL_RUNTIME.describe(), "shap": shap_available}


@app.get("/metrics")
def get_metrics() -> dict:
    metrics_path = PROJECT_ROOT / "models" / "metrics.json"
    if not metrics_path.exists():
        return {"error": "metrics.json not found — run training/train_models.py first"}
    return json.loads(metrics_path.read_text(encoding="utf-8"))


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

    xai_block = _build_xai(features, reasons)

    return ScoreResponse(
        risk_score=final_score,
        risk_level=_risk_level(final_score),
        explanations=unique_explanations,
        model_used=MODEL_RUNTIME.describe(),
        xai=xai_block,
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


@app.get("/rules")
def list_accepted_rules() -> dict:
    """Return all accepted suggested rules from the database."""
    with _db_conn() as conn:
        rows = conn.execute(
            "SELECT id, ts, file_id, feature_key, rule, action FROM accepted_rules ORDER BY id DESC"
        ).fetchall()
    rules = [dict(row) for row in rows]
    return {"rules": rules, "count": len(rules)}


@app.post("/rules/accept")
def accept_rule(payload: AcceptRuleRequest) -> dict:
    """
    Accept a SHAP-derived suggested rule.

    Persists to SQLite and updates the in-memory ACCEPTED_FEATURE_KEYS set
    so subsequent /score calls treat this feature as covered immediately.
    Also injects the rule as a comment into app/rules.py for auditability.
    """
    global ACCEPTED_FEATURE_KEYS

    ts = datetime.now(timezone.utc).isoformat()
    with _db_conn() as conn:
        conn.execute(
            "INSERT INTO accepted_rules (ts, file_id, feature_key, rule, action) VALUES (?, ?, ?, ?, 'accepted')",
            (ts, payload.file_id, payload.feature_key, payload.rule),
        )

    # Update in-memory set so the next /score call sees this feature as covered
    if payload.feature_key:
        ACCEPTED_FEATURE_KEYS.add(payload.feature_key)

    # Append the rule as a commented block in rules.py for auditability
    rules_text = RULES_FILE.read_text(encoding="utf-8")
    marker = f"# ACCEPTED RULE [{ts}]"
    if marker not in rules_text:
        block = (
            f"\n\n{marker}\n"
            f"# file_id: {payload.file_id or 'unknown'}\n"
            f"# feature_key: {payload.feature_key or 'unknown'}\n"
            + "\n".join(f"# {line}" for line in payload.rule.splitlines())
            + "\n"
        )
        RULES_FILE.write_text(rules_text + block, encoding="utf-8")

    return {"status": "accepted", "message": "Rule saved to database and applied to future scores"}


@app.post("/rules/reject")
def reject_rule(payload: AcceptRuleRequest) -> dict:
    """Record that a suggested rule was explicitly rejected (audit log only)."""
    ts = datetime.now(timezone.utc).isoformat()
    with _db_conn() as conn:
        conn.execute(
            "INSERT INTO accepted_rules (ts, file_id, feature_key, rule, action) VALUES (?, ?, ?, ?, 'rejected')",
            (ts, payload.file_id, payload.feature_key, payload.rule),
        )
    return {"status": "ok", "message": "Rejection recorded"}


def _build_xai(features: dict, rule_reasons: list) -> XAIExplanation | None:
    """Run SHAP and return the XAIExplanation block, or None if unavailable."""
    explainer = MODEL_RUNTIME.shap_explainer
    if explainer is None or not explainer.available:
        return None

    raw = explainer.explain(features, rule_reasons, top_n=6, extra_covered_keys=ACCEPTED_FEATURE_KEYS)
    if not raw["shap_top_features"]:
        return None

    return XAIExplanation(
        shap_top_features=[
            SHAPFeatureContribution(**item) for item in raw["shap_top_features"]
        ],
        faithfulness_score=raw["faithfulness_score"],
        faithfulness_detail=raw["faithfulness_detail"],
        coverage_gap_score=raw.get("coverage_gap_score"),
        coverage_gap_detail=raw.get("coverage_gap_detail", []),
        suggested_rules=raw.get("suggested_rules", []),
        suggested_rule_keys=raw.get("suggested_rule_keys", []),
    )


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="warning")
