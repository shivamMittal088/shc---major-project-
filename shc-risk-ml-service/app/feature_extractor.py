from __future__ import annotations

import base64
import hashlib
import math
import mimetypes
import re
from pathlib import Path
from typing import Dict, List, Tuple

from app.reputation import score_domain_reputation
from app.schemas import ScoreRequest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
KNOWN_BAD_HASHES_FILE = PROJECT_ROOT / "data" / "known_bad_hashes.txt"

SUSPICIOUS_KEYWORDS = [
    "password",
    "invoice",
    "urgent",
    "verify",
    "account",
    "bank",
    "security update",
    "wire transfer",
    "gift card",
]

EXECUTABLE_EXTENSIONS = {
    "exe",
    "dll",
    "scr",
    "bat",
    "cmd",
    "ps1",
    "js",
    "jar",
    "com",
}

MACRO_PATTERNS = [
    r"\bvba\b",
    r"\bauto_open\b",
    r"\bautoopen\b",
    r"\bmacro\b",
    r"/javascript",
    r"powershell",
]

_CACHED_BAD_HASHES: set[str] | None = None


def extract_features(request: ScoreRequest) -> Tuple[Dict[str, float], List[str], Dict[str, str]]:
    content_bytes = _decode_base64_payload(request.file_content_base64)
    inferred_mime = _detect_mime_type(request.file_name or "", request.mime_type or "", content_bytes)

    content_text = (request.text_content or "")
    content_text_lower = content_text.lower()
    file_name_lower = (request.file_name or "").lower()

    keyword_hits = _keyword_hit_count("\n".join([file_name_lower, content_text_lower, request.file_url or ""]))

    if content_bytes:
        entropy = _entropy(content_bytes)
    else:
        entropy = _entropy((content_text + (request.file_name or "")).encode("utf-8", errors="ignore"))

    domain_scores = [score_domain_reputation(request.file_url or "")]
    for ext_link in request.external_links:
        domain_scores.append(score_domain_reputation(ext_link))
    domain_risk = max(domain_scores) if domain_scores else 0.0

    file_hash = _compute_sha256(content_bytes) if content_bytes else (request.known_hash or "").strip().lower()
    known_bad_hash = 1.0 if _is_known_bad_hash(file_hash) else 0.0

    has_macro = 1.0 if _contains_macro_or_script(content_text, content_bytes) else 0.0
    extension = _extension(request.file_name or "")

    size_mb = float(max(0, request.file_size)) / (1024.0 * 1024.0)

    features: Dict[str, float] = {
        "is_executable_ext": 1.0 if extension in EXECUTABLE_EXTENSIONS else 0.0,
        "is_archive": 1.0 if extension in {"zip", "rar", "7z", "gz"} else 0.0,
        "contains_macro_indicator": has_macro,
        "domain_risk": float(domain_risk),
        "entropy": float(entropy),
        "keyword_hit_count": float(keyword_hits),
        "size_mb": float(size_mb),
        "size_anomaly": 1.0 if _is_size_anomaly(size_mb, inferred_mime) else 0.0,
        "share_frequency": float(max(0, request.share_frequency)),
        "download_frequency": float(max(0, request.download_frequency)),
        "unknown_upload_source": 1.0 if (request.upload_source or "").strip().lower() in {"", "unknown"} else 0.0,
        "known_bad_hash": known_bad_hash,
        "text_length": float(len(content_text)),
    }

    evidence: List[str] = []
    if has_macro > 0:
        evidence.append("Contains suspicious script or macro markers")
    if domain_risk > 0.5:
        evidence.append("References suspicious external domain")
    if known_bad_hash > 0:
        evidence.append("Hash found in known-bad indicator list")

    context = {
        "mime_type": inferred_mime,
        "file_hash": file_hash,
        "extension": extension,
    }

    return features, evidence, context


def _decode_base64_payload(payload: str | None) -> bytes:
    if not payload:
        return b""
    cleaned = payload.strip()
    if not cleaned:
        return b""
    try:
        return base64.b64decode(cleaned, validate=False)
    except Exception:
        return b""


def _detect_mime_type(file_name: str, explicit_mime: str, content: bytes) -> str:
    value = (explicit_mime or "").strip().lower()
    if value:
        return value

    if content.startswith(b"%PDF"):
        return "application/pdf"
    if content.startswith(b"PK"):
        return "application/zip"
    if content.startswith(b"MZ"):
        return "application/x-dosexec"

    guessed, _ = mimetypes.guess_type(file_name)
    return (guessed or "application/octet-stream").lower()


def _contains_macro_or_script(text_content: str, content: bytes) -> bool:
    haystack = (text_content or "")
    if content:
        sample = content[:20000].decode("latin-1", errors="ignore")
        haystack = f"{haystack}\n{sample}"

    lowered = haystack.lower()
    return any(re.search(pattern, lowered) is not None for pattern in MACRO_PATTERNS)


def _keyword_hit_count(text: str) -> int:
    lowered = text.lower()
    hits = 0
    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword in lowered:
            hits += 1
    return hits


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    frequencies = [0] * 256
    for byte in data:
        frequencies[byte] += 1

    entropy = 0.0
    data_len = len(data)
    for count in frequencies:
        if count == 0:
            continue
        probability = count / data_len
        entropy -= probability * math.log2(probability)
    return entropy


def _is_size_anomaly(size_mb: float, mime_type: str) -> bool:
    mime = (mime_type or "").lower()
    if size_mb <= 0:
        return False
    if "text" in mime and size_mb > 12:
        return True
    if "json" in mime and size_mb > 8:
        return True
    if "image" in mime and size_mb > 25:
        return True
    if "pdf" in mime and size_mb > 45:
        return True
    return size_mb > 120


def _compute_sha256(content: bytes) -> str:
    if not content:
        return ""
    return hashlib.sha256(content).hexdigest().lower()


def _extension(file_name: str) -> str:
    value = (file_name or "").strip().lower()
    if "." not in value:
        return ""
    return value.rsplit(".", 1)[-1]


def _is_known_bad_hash(hex_hash: str) -> bool:
    if not hex_hash:
        return False
    bad_hashes = _load_known_bad_hashes()
    return hex_hash.strip().lower() in bad_hashes


def _load_known_bad_hashes() -> set[str]:
    global _CACHED_BAD_HASHES
    if _CACHED_BAD_HASHES is not None:
        return _CACHED_BAD_HASHES

    hashes: set[str] = set()
    if KNOWN_BAD_HASHES_FILE.exists():
        for line in KNOWN_BAD_HASHES_FILE.read_text(encoding="utf-8").splitlines():
            value = line.strip().lower()
            if value and not value.startswith("#"):
                hashes.add(value)
    _CACHED_BAD_HASHES = hashes
    return _CACHED_BAD_HASHES
