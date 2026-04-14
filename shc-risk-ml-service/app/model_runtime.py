from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np

from app.shap_explainer import SHAPExplainer


class ModelRuntime:
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self.structured_model = None
        self.text_model = None
        self.feature_order: List[str] = []
        self.shap_explainer: Optional[SHAPExplainer] = None
        self._load()

    def _load(self) -> None:
        feature_file = self.model_dir / "structured_feature_order.json"
        structured_file = self.model_dir / "structured_model.joblib"
        text_file = self.model_dir / "text_model.joblib"

        if feature_file.exists():
            self.feature_order = json.loads(feature_file.read_text(encoding="utf-8"))

        if structured_file.exists():
            self.structured_model = joblib.load(structured_file)

        if text_file.exists():
            self.text_model = joblib.load(text_file)

        if self.structured_model is not None and self.feature_order:
            self.shap_explainer = SHAPExplainer(self.structured_model, self.feature_order)

    def predict_structured(self, features: Dict[str, float]) -> Optional[float]:
        if self.structured_model is None or not self.feature_order:
            return None

        vector = np.array([[float(features.get(name, 0.0)) for name in self.feature_order]], dtype=np.float32)
        probabilities = self.structured_model.predict_proba(vector)
        return float(probabilities[0][1])

    def predict_text(self, text: str) -> Optional[float]:
        if self.text_model is None:
            return None

        value = (text or "").strip()
        if not value:
            return None

        probabilities = self.text_model.predict_proba([value])
        return float(probabilities[0][1])

    def describe(self) -> str:
        has_structured = self.structured_model is not None
        has_text = self.text_model is not None

        if has_structured and has_text:
            return "hybrid-rules-rf-nlp"
        if has_structured:
            return "rules-random-forest"
        if has_text:
            return "rules-text-logreg"
        return "rules-only"
