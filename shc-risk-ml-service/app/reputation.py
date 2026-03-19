from __future__ import annotations

from urllib.parse import urlparse

SUSPICIOUS_DOMAINS = {
    "example-malicious.test",
    "phishing-sample.test",
    "malware-cdn.test",
}

SUSPICIOUS_TLDS = {
    ".zip",
    ".mov",
    ".xyz",
    ".top",
    ".click",
}

SHORTENER_HINTS = {"bit.ly", "tinyurl", "t.co", "goo.gl"}


def score_domain_reputation(raw_url: str) -> float:
    value = (raw_url or "").strip().lower()
    if not value:
        return 0.0

    try:
        parsed = urlparse(value)
    except Exception:
        return 0.6

    domain = parsed.netloc.lower().strip()
    path = (parsed.path or "").lower()

    if not domain:
        return 0.35

    risk = 0.0

    if domain in SUSPICIOUS_DOMAINS:
        risk += 0.8

    if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
        risk += 0.45

    if any(hint in domain for hint in SHORTENER_HINTS):
        risk += 0.25

    if any(token in value for token in ("@", "%40")):
        risk += 0.2

    if any(token in path for token in ("verify", "login", "password", "invoice")):
        risk += 0.25

    return max(0.0, min(1.0, risk))
