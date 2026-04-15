from __future__ import annotations

from typing import Dict, List, Tuple


def baseline_score(features: Dict[str, float], evidence: List[str]) -> Tuple[int, List[str]]:
    score = 0
    reasons = list(evidence)

    if features.get("is_executable_ext", 0.0) > 0:
        score += 28
        reasons.append("Suspicious executable/script file extension")

    if features.get("contains_macro_indicator", 0.0) > 0:
        score += 24
        reasons.append("Contains macro or script indicators")

    if features.get("domain_risk", 0.0) > 0.55:
        score += 18
        reasons.append("External domain has low reputation")

    if features.get("size_anomaly", 0.0) > 0:
        score += 10
        reasons.append("File size appears anomalous for its type")

    if features.get("entropy", 0.0) > 5.0:
        score += 20
        reasons.append("High entropy content suggests obfuscation")
    elif features.get("entropy", 0.0) > 4.4:
        score += 12
        reasons.append("Moderate entropy anomaly")

    keyword_hits = int(features.get("keyword_hit_count", 0.0))
    if keyword_hits > 0:
        score += min(18, keyword_hits * 4)
        reasons.append("Contains social engineering keywords")

    if features.get("known_bad_hash", 0.0) > 0:
        score += 45
        reasons.append("Hash matched known malicious indicator")

    if features.get("share_frequency", 0.0) > 120:
        score += 10
        reasons.append("File is being shared unusually often")

    if features.get("download_frequency", 0.0) > 250:
        score += 10
        reasons.append("File has unusually high download volume")

    if features.get("unknown_upload_source", 0.0) > 0:
        score += 8
        reasons.append("Upload source is unknown")

    score = max(0, min(100, score))
    return score, _dedupe(reasons)[:6]


def _dedupe(reasons: List[str]) -> List[str]:
    out: List[str] = []
    seen = set()
    for reason in reasons:
        text = reason.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    if not out:
        return ["No strong malicious indicators were detected"]
    return out


# ACCEPTED RULE [2026-04-15T06:59:20.179480+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk


# ACCEPTED RULE [2026-04-15T06:59:31.489153+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk


# ACCEPTED RULE [2026-04-15T07:08:09.646313+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk


# ACCEPTED RULE [2026-04-15T07:11:35.869599+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk


# ACCEPTED RULE [2026-04-15T07:11:47.209663+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk


# ACCEPTED RULE [2026-04-15T07:14:51.505568+00:00]
# file_id: 7651da5f-1a49-4d74-8881-5ee63955f15b
# if features["size_mb"] > 0.06: score += 10  # SHAP-derived: large file increases risk
