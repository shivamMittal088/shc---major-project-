```
  ███████╗██╗  ██╗ ██████╗
  ██╔════╝██║  ██║██╔════╝
  ███████╗███████║██║
  ╚════██║██╔══██║██║
  ███████║██║  ██║╚██████╗
  ╚══════╝╚═╝  ╚═╝ ╚═════╝  Risk ML Service
```

# SHC Risk ML Service

Python microservice for malware/phishing risk scoring used by SHC shared links.

## What it does

- Accepts file URL, metadata, optional uploaded file payload, and optional text content.
- Extracts security features:
  - MIME/file type signals
  - size anomaly indicators
  - macro/script markers
  - URL/domain reputation
  - entropy for obfuscation detection
  - suspicious keyword hits
  - known-bad hash matching
  - share/download frequency
- Produces:
  - `risk_score` (0-100)
  - `risk_level` (`Low`, `Medium`, `High`)
  - explanations for scoring decisions

## API

### `POST /score`

Request payload (JSON):

```json
{
  "file_url": "https://example.com/report.pdf",
  "file_name": "report.pdf",
  "mime_type": "application/pdf",
  "file_size": 102400,
  "upload_source": "web",
  "share_frequency": 3,
  "download_frequency": 7,
  "external_links": ["https://example.com/login"],
  "text_content": "urgent password reset",
  "known_hash": "",
  "file_content_base64": ""
}
```

Response:

```json
{
  "risk_score": 76,
  "risk_level": "High",
  "explanations": [
    "Contains social engineering keywords",
    "External domain has low reputation"
  ],
  "model_used": "hybrid-rules-rf-nlp"
}
```

### `POST /feedback`

Stores user feedback (`safe` or `malicious`) to `data/feedback.ndjson` for retraining.

### `GET /healthz`

Returns service health and loaded model mode.

## Training pipeline

This service supports a hybrid setup:

1. Rule-based baseline (`app/rules.py`)
2. Structured model (RandomForest on engineered features)
3. Optional text model (TF-IDF + LogisticRegression)

Train models:

```bash
python -m training.train_models
```

Artifacts are stored in `models/`.

## Dataset suggestions

For production quality, replace synthetic training with:

- VirusTotal public datasets and private enterprise IOC feeds
- Phishing URL datasets (OpenPhish, PhishTank, Kaggle phishing URL corpora)
- Curated malware hash samples from safe sandbox pipelines

Always isolate malware sample processing in sandbox environments.

## Run locally

### Windows (recommended — one command)

```powershell
# From shc-risk-ml-service/
.\start.ps1
```

`start.ps1` auto-handles the full lifecycle:
- Creates `.venv` virtual environment if absent
- Installs dependencies only when `requirements.txt` changes
- Trains models if `models/*.joblib` artifacts are missing
- Starts uvicorn with `--reload` on `http://0.0.0.0:8081`

Alternatively double-click `start.bat` to open a PowerShell window that runs the same script.

### macOS / Linux (manual)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m training.train_models
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

### Verify the service is up

```bash
curl http://localhost:8081/healthz
# {"status":"ok","model":"hybrid-rules-rf-nlp"}
```

## Backend integration

The Go backend (`shc-backend`) connects to this service automatically when the following env vars are set in `shc-backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RISK_ML_SERVICE_URL` | `http://localhost:8081` | Base URL of this service |
| `RISK_SERVICE_TIMEOUT_MS` | `4000` | Per-request HTTP timeout (ms) |
| `RISK_SCORE_CACHE_TTL_SECONDS` | `300` | Redis TTL for cached risk results |

If this service is unreachable the backend falls back to its built-in Go rule engine automatically. No configuration is needed to activate the fallback.

## Security hardening

- Run this service in an isolated container/network segment.
- Never execute uploaded files; inspect bytes and metadata only.
- Use strict resource limits and read-only FS in production.
- Restrict egress network access if possible.

Example hardened Docker run:

```bash
docker run --rm -p 8081:8081 \
  --read-only \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  --memory=512m \
  shc-risk-ml-service
```
