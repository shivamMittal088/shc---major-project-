from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
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

    # Train/test split for evaluation
    X_train, X_test, y_train, y_test = train_test_split(
        X_structured, y, test_size=0.2, random_state=42, stratify=y
    )

    structured_model = RandomForestClassifier(
        n_estimators=220,
        max_depth=10,
        random_state=42,
        class_weight="balanced",
    )
    structured_model.fit(X_train, y_train)

    # Evaluate structured model
    y_pred = structured_model.predict(X_test)
    y_prob = structured_model.predict_proba(X_test)[:, 1]
    cv_scores = cross_val_score(structured_model, X_structured, y, cv=5, scoring="f1")

    structured_metrics = {
        "model": "Random Forest (structured features)",
        "n_features": len(FEATURE_ORDER),
        "features": FEATURE_ORDER,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred)), 4),
        "recall": round(float(recall_score(y_test, y_pred)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "cv_f1_mean": round(float(cv_scores.mean()), 4),
        "cv_f1_std": round(float(cv_scores.std()), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "class_report": classification_report(y_test, y_pred, output_dict=True),
    }

    # Re-train on full dataset for production model
    structured_model.fit(X_structured, y)

    text_samples, text_labels = _generate_text_dataset()
    text_X_train, text_X_test, text_y_train, text_y_test = train_test_split(
        text_samples, text_labels, test_size=0.2, random_state=42
    )
    text_model = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(max_features=1200, ngram_range=(1, 2))),
            ("classifier", LogisticRegression(max_iter=450)),
        ]
    )
    text_model.fit(text_X_train, text_y_train)
    text_pred = text_model.predict(text_X_test)
    text_prob = text_model.predict_proba(text_X_test)[:, 1]

    text_metrics = {
        "model": "Logistic Regression + TF-IDF (text content)",
        "accuracy": round(float(accuracy_score(text_y_test, text_pred)), 4),
        "precision": round(float(precision_score(text_y_test, text_pred)), 4),
        "recall": round(float(recall_score(text_y_test, text_pred)), 4),
        "f1_score": round(float(f1_score(text_y_test, text_pred)), 4),
        "roc_auc": round(float(roc_auc_score(text_y_test, text_prob)), 4),
        "confusion_matrix": confusion_matrix(text_y_test, text_pred).tolist(),
    }

    # Re-train text model on full dataset
    text_model.fit(text_samples, text_labels)

    metrics = {
        "structured": structured_metrics,
        "text": text_metrics,
        "blockchain_integrity_impact": {
            "description": "Effect of blockchain_integrity feature on risk score",
            "tampered": "+55 pts rule-based, +1.0 feature weight in ML",
            "verified": "-25 pts rule-based, -1.0 feature weight in ML",
            "unverified": "0 pts (neutral baseline)",
        },
    }

    joblib.dump(structured_model, MODEL_DIR / "structured_model.joblib")
    joblib.dump(text_model, MODEL_DIR / "text_model.joblib")
    (MODEL_DIR / "structured_feature_order.json").write_text(json.dumps(FEATURE_ORDER), encoding="utf-8")
    (MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("saved models:")
    print(f"- {MODEL_DIR / 'structured_model.joblib'}")
    print(f"- {MODEL_DIR / 'text_model.joblib'}")
    print(f"- {MODEL_DIR / 'structured_feature_order.json'}")
    print(f"- {MODEL_DIR / 'metrics.json'}")
    print()
    print("=== Structured Model (Random Forest) ===")
    print(f"  Accuracy : {structured_metrics['accuracy']}")
    print(f"  Precision: {structured_metrics['precision']}")
    print(f"  Recall   : {structured_metrics['recall']}")
    print(f"  F1       : {structured_metrics['f1_score']}")
    print(f"  ROC-AUC  : {structured_metrics['roc_auc']}")
    print(f"  CV F1    : {structured_metrics['cv_f1_mean']} ± {structured_metrics['cv_f1_std']}")
    print()
    print("=== Text Model (Logistic Regression + TF-IDF) ===")
    print(f"  Accuracy : {text_metrics['accuracy']}")
    print(f"  Precision: {text_metrics['precision']}")
    print(f"  Recall   : {text_metrics['recall']}")
    print(f"  F1       : {text_metrics['f1_score']}")
    print(f"  ROC-AUC  : {text_metrics['roc_auc']}")


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
    rng = np.random.default_rng(99)

    # Benign documents that legitimately use security/urgent language
    benign_templates = [
        "team notes for sprint planning and release checklist",
        "monthly engineering report and dashboard exports",
        "product design proposal draft for review",
        "meeting minutes and roadmap update q3",
        "safe invoice archive from known vendor payment confirmed",
        "user guide and onboarding handbook for new employees",
        "release changelog and bugfix summary patch version",
        "security audit report internal findings resolved approved",
        "urgent reminder team meeting rescheduled to friday",
        "please verify your attendance for the offsite event",
        "confirm your account details with hr for payroll update",
        "password reset instructions for internal portal it support",
        "click here to access the shared drive document",
        "login to the company portal to submit your timesheet",
        "urgent deadline project milestone due end of month",
        "account setup instructions for new employee onboarding",
        "please verify your email address for system access",
        "security policy update please review and acknowledge",
        "invoice attached for services rendered this quarter",
        "confirm receipt of attached contract before signing",
        "architecture diagram and system design document reviewed",
        "api documentation reference guide for developers team",
        "quarterly financial report approved by finance committee",
        "database migration completed verify data integrity",
        "backup verification completed storage account updated",
        "deployment runbook updated for production release urgent",
        "access credentials for staging environment attached",
        "download the updated compliance document from sharepoint",
        "link to shared folder expires in 24 hours please download",
        "click to confirm your registration for the workshop",
    ]

    # Malicious documents that mimic professional language
    malicious_templates = [
        "urgent verify your account password now or lose access",
        "invoice overdue click login to avoid service suspension",
        "security update required run attached executable admin",
        "wire transfer request urgent confidential immediate action",
        "confirm credentials and open macro enabled document now",
        "your mailbox storage is full login immediately to restore",
        "payment pending open zip attachment to confirm transaction",
        "unusual login detected from unknown location verify now",
        "account suspended please verify identity to restore access",
        "free software activation key download expires today only",
        "bank account alert transaction blocked verify your details",
        "final warning unpaid invoice click to pay avoid penalty",
        "your parcel is held confirm address link to release",
        "tax refund pending submit banking details to receive payment",
        "security breach detected on your account change password via link",
        "shared document link your signature required click here urgent",
        "compliance form overdue submit before deadline or account locked",
        "microsoft office license expired click renew avoid disruption",
        "login credentials required to access the attached report",
        "click the secure link to verify your invoice and payment",
        "confirm your account to download the attached agreement",
        "urgent update your password using the link below immediately",
        "verify access to shared drive document before expiry",
        "account review required please login and confirm details",
        "download required security patch from link before deadline",
    ]

    text_samples: list[str] = []
    labels: list[int] = []

    for _ in range(3000):
        if rng.random() < 0.5:
            base = benign_templates[rng.integers(len(benign_templates))]
            labels.append(0)
        else:
            base = malicious_templates[rng.integers(len(malicious_templates))]
            labels.append(1)
        # Add random word-level noise from the opposite class to blur the boundary
        if rng.random() < 0.25:
            shared_words = ["verify", "urgent", "click", "account", "document", "login",
                            "confirm", "password", "access", "download", "link", "security",
                            "invoice", "update", "review", "submit", "approved", "report"]
            noise = " ".join(rng.choice(shared_words, size=rng.integers(1, 4), replace=False).tolist())
            base = base + " " + noise
        text_samples.append(base)

    return text_samples, labels


if __name__ == "__main__":
    main()
