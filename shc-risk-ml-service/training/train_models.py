from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = PROJECT_ROOT / "models"

FEATURE_ORDER = [
    "is_executable_ext",
    "is_archive",
    "contains_macro_indicator",
    "domain_risk",
    "entropy",
    "keyword_hit_count",
    "size_mb",
    "size_anomaly",
    "share_frequency",
    "download_frequency",
    "unknown_upload_source",
    "known_bad_hash",
    "text_length",
    # +1.0 = tampered, 0.0 = unverified, -1.0 = verified
    "blockchain_integrity",
]


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    X_structured, y = _generate_structured_dataset(seed=42, size=3200)
    structured_model = RandomForestClassifier(
        n_estimators=220,
        max_depth=10,
        random_state=42,
        class_weight="balanced",
    )
    structured_model.fit(X_structured, y)

    text_samples, text_labels = _generate_text_dataset()
    text_model = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(max_features=1200, ngram_range=(1, 2))),
            ("classifier", LogisticRegression(max_iter=450)),
        ]
    )
    text_model.fit(text_samples, text_labels)

    joblib.dump(structured_model, MODEL_DIR / "structured_model.joblib")
    joblib.dump(text_model, MODEL_DIR / "text_model.joblib")
    (MODEL_DIR / "structured_feature_order.json").write_text(json.dumps(FEATURE_ORDER), encoding="utf-8")

    print("saved models:")
    print(f"- {MODEL_DIR / 'structured_model.joblib'}")
    print(f"- {MODEL_DIR / 'text_model.joblib'}")
    print(f"- {MODEL_DIR / 'structured_feature_order.json'}")


def _generate_structured_dataset(seed: int, size: int) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X = np.zeros((size, len(FEATURE_ORDER)), dtype=np.float32)

    for idx in range(size):
        is_exec = rng.binomial(1, 0.12)
        is_archive = rng.binomial(1, 0.18)
        has_macro = rng.binomial(1, 0.14)
        domain_risk = rng.uniform(0, 1)
        entropy = rng.normal(4.1, 0.9)
        keyword_hits = rng.poisson(1.6)
        size_mb = max(0.01, rng.lognormal(mean=1.5, sigma=0.9))
        size_anomaly = 1 if (size_mb > 60 or (size_mb > 10 and rng.binomial(1, 0.35))) else 0
        share_frequency = rng.integers(0, 220)
        download_frequency = rng.integers(0, 500)
        unknown_source = rng.binomial(1, 0.20)
        known_bad_hash = rng.binomial(1, 0.04)
        text_length = rng.integers(0, 18000)
        # blockchain_integrity: most files are unverified; verified ones are less likely malicious
        # +1.0 tampered, 0.0 unverified, -1.0 verified
        bc_roll = rng.random()
        blockchain_integrity = 1.0 if bc_roll < 0.03 else (-1.0 if bc_roll < 0.25 else 0.0)

        X[idx] = [
            is_exec,
            is_archive,
            has_macro,
            domain_risk,
            entropy,
            keyword_hits,
            size_mb,
            size_anomaly,
            share_frequency,
            download_frequency,
            unknown_source,
            known_bad_hash,
            text_length,
            blockchain_integrity,
        ]

    # Weighted synthetic risk label generation.
    linear = (
        X[:, 0] * 1.6
        + X[:, 2] * 1.4
        + X[:, 3] * 1.2
        + X[:, 4] * 0.6
        + X[:, 5] * 0.35
        + X[:, 7] * 0.5
        + np.clip(X[:, 8] / 180.0, 0, 1) * 0.35
        + np.clip(X[:, 9] / 350.0, 0, 1) * 0.45
        + X[:, 10] * 0.3
        + X[:, 11] * 2.0
        + X[:, 13] * 2.5   # blockchain_integrity: tampered=+2.5, verified=-2.5
    )
    probs = 1.0 / (1.0 + np.exp(-(linear - 2.2)))
    y = (rng.random(size=size) < probs).astype(np.int64)
    return X, y


def _generate_text_dataset() -> tuple[list[str], list[int]]:
    benign = [
        "team notes for sprint planning and release checklist",
        "monthly engineering report and dashboard exports",
        "product design proposal draft",
        "meeting minutes and roadmap update",
        "safe invoice archive from known vendor",
        "user guide and onboarding handbook",
        "release changelog and bugfix summary",
    ]

    malicious = [
        "urgent verify your account password now",
        "invoice overdue click login to avoid suspension",
        "security update required run attached script",
        "wire transfer request urgent confidential",
        "confirm credentials and open macro enabled document",
        "your mailbox is full login immediately",
        "payment pending open zip attachment",
    ]

    text_samples: list[str] = []
    labels: list[int] = []

    for _ in range(230):
        for sample in benign:
            text_samples.append(sample)
            labels.append(0)
        for sample in malicious:
            text_samples.append(sample)
            labels.append(1)

    return text_samples, labels


if __name__ == "__main__":
    main()
