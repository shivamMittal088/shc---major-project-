from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Human-readable labels for every structured feature
# ---------------------------------------------------------------------------

FEATURE_LABELS: Dict[str, str] = {
    "is_executable_ext": "Executable file extension",
    "is_archive": "Archive file type",
    "contains_macro_indicator": "Macro/script indicator",
    "domain_risk": "Domain reputation risk",
    "entropy": "Content entropy (obfuscation proxy)",
    "keyword_hit_count": "Social engineering keyword hits",
    "size_mb": "File size (MB)",
    "size_anomaly": "File size anomaly for MIME type",
    "share_frequency": "Share frequency",
    "download_frequency": "Download frequency",
    "unknown_upload_source": "Unknown upload source",
    "known_bad_hash": "Known malicious hash match",
    "text_length": "Text content length",
}

# ---------------------------------------------------------------------------
# Maps every rule-based reason string → the feature it fires on.
# Used to compute faithfulness alignment between rules and SHAP.
# ---------------------------------------------------------------------------

RULE_TO_FEATURE: Dict[str, str] = {
    "Suspicious executable/script file extension": "is_executable_ext",
    "Contains macro or script indicators": "contains_macro_indicator",
    "Contains suspicious script or macro markers": "contains_macro_indicator",
    "External domain has low reputation": "domain_risk",
    "References suspicious external domain": "domain_risk",
    "File size appears anomalous for its type": "size_anomaly",
    "High entropy content suggests obfuscation": "entropy",
    "Moderate entropy anomaly": "entropy",
    "Contains social engineering keywords": "keyword_hit_count",
    "Hash matched known malicious indicator": "known_bad_hash",
    "Hash found in known-bad indicator list": "known_bad_hash",
    "File is being shared unusually often": "share_frequency",
    "File has unusually high download volume": "download_frequency",
    "Upload source is unknown": "unknown_upload_source",
}


class SHAPExplainer:
    """
    Wraps a scikit-learn RandomForestClassifier with a SHAP TreeExplainer.

    On each call to :meth:`explain` it returns:
    - ``shap_top_features`` — top N features ranked by |SHAP value| with sign
    - ``faithfulness_score`` — fraction of active rule-based reasons whose
      corresponding feature's SHAP value agrees in direction (rule fires →
      feature has a positive / risk-increasing SHAP contribution)
    - ``faithfulness_detail`` — per-rule alignment annotations for paper
      evaluation
    """

    def __init__(self, model, feature_order: List[str]) -> None:
        self._model = model
        self._feature_order = feature_order
        self._explainer = None
        self._available = False
        self._init_explainer()

    def _init_explainer(self) -> None:
        try:
            import shap  # noqa: PLC0415

            self._explainer = shap.TreeExplainer(
                self._model,
                feature_perturbation="interventional",
            )
            self._available = True
        except Exception:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def explain(
        self,
        features: Dict[str, float],
        rule_reasons: List[str],
        top_n: int = 6,
    ) -> Dict:
        """
        Compute SHAP values for the given feature dict and compare them
        against the rule-based reasons that fired.

        Parameters
        ----------
        features:
            Feature dict produced by ``extract_features``.
        rule_reasons:
            List of rule-based reason strings from ``baseline_score``.
        top_n:
            Number of top SHAP features to surface in the response.

        Returns
        -------
        Dict with keys ``shap_top_features``, ``faithfulness_score``,
        and ``faithfulness_detail``.  Returns an empty result dict when
        SHAP is unavailable.
        """
        if not self._available or self._explainer is None:
            return _empty_result()

        vector = np.array(
            [[float(features.get(name, 0.0)) for name in self._feature_order]],
            dtype=np.float32,
        )

        try:
            shap_values = self._explainer.shap_values(vector)
        except Exception:
            return _empty_result()

        # Normalise output shape across SHAP versions.
        # Older shap returns a list [class0_array, class1_array].
        # Newer shap may return a 3-D array (n_samples, n_features, n_classes).
        if isinstance(shap_values, list):
            # index 1 = "malicious" class
            malicious_shap: np.ndarray = np.array(shap_values[1][0], dtype=np.float64)
        else:
            if shap_values.ndim == 3:
                malicious_shap = shap_values[0, :, 1].astype(np.float64)
            else:
                malicious_shap = shap_values[0].astype(np.float64)

        ranked_indices = np.argsort(np.abs(malicious_shap))[::-1]

        top_features = []
        for rank, idx in enumerate(ranked_indices[:top_n], start=1):
            feat_name = self._feature_order[idx]
            sv = float(malicious_shap[idx])
            top_features.append(
                {
                    "feature": FEATURE_LABELS.get(feat_name, feat_name),
                    "feature_key": feat_name,
                    "shap_value": round(sv, 4),
                    "direction": "increases_risk" if sv > 0 else "decreases_risk",
                    "rank": rank,
                }
            )

        faithfulness_score, faithfulness_detail = _compute_faithfulness(
            rule_reasons, malicious_shap, self._feature_order
        )

        return {
            "shap_top_features": top_features,
            "faithfulness_score": round(faithfulness_score, 3),
            "faithfulness_detail": faithfulness_detail,
        }


# ---------------------------------------------------------------------------
# Faithfulness computation
# ---------------------------------------------------------------------------


def _compute_faithfulness(
    rule_reasons: List[str],
    shap_values: np.ndarray,
    feature_order: List[str],
) -> Tuple[float, List[str]]:
    """
    For each rule-based reason that fired, check whether the corresponding
    feature's SHAP value is positive (i.e. the model also considers it
    risk-increasing).

    A *faithful* rule is one where the human-readable heuristic and the
    model's internal attribution agree in direction.

    Returns
    -------
    faithfulness_score : float in [0, 1]
        Fraction of mapped rules that are faithful.  1.0 = all rules
        aligned; 0.0 = all rules contradict the model.  Returns 1.0 when
        no mappable rules fired (no evidence of divergence).
    faithfulness_detail : List[str]
        One annotation per mapped rule describing alignment or divergence.
    """
    shap_by_feature: Dict[str, float] = {
        feature_order[i]: float(shap_values[i]) for i in range(len(feature_order))
    }

    matched = 0
    total = 0
    detail: List[str] = []

    for reason in rule_reasons:
        feature_key = RULE_TO_FEATURE.get(reason)
        if feature_key is None:
            continue
        total += 1
        sv = shap_by_feature.get(feature_key, 0.0)
        label = FEATURE_LABELS.get(feature_key, feature_key)
        if sv > 0:
            matched += 1
            detail.append(
                f"ALIGNED: '{reason}' agrees with model ({label} SHAP={sv:+.3f})"
            )
        else:
            detail.append(
                f"DIVERGED: '{reason}' contradicted by model ({label} SHAP={sv:+.3f})"
            )

    faithfulness = float(matched) / float(total) if total > 0 else 1.0
    return faithfulness, detail


def _empty_result() -> Dict:
    return {
        "shap_top_features": [],
        "faithfulness_score": None,
        "faithfulness_detail": [],
    }
