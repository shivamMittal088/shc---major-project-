# SHC Backend

Backend API for SHC (a file sharing/storage service) built with Go and Fiber.

This project provides:
- OTP-based authentication
- JWT access/refresh token flow with DB-backed sessions
- File metadata management
- Presigned upload/download URLs for Cloudflare R2 (S3-compatible)
- Subscription limits (daily reads/writes, storage caps)
- Redis-backed caching and rate limiting

---

## Tech Stack

- **Language**: Go 1.21+
- **Framework**: Fiber v3
- **Database**: PostgreSQL + GORM
- **Cache / Rate Limit Storage**: Redis
- **Object Storage**: Cloudflare R2 (AWS S3 SDK v2)
- **Scheduler**: robfig/cron
- **Auth**: JWT + Session validation

---

## Project Structure

```text
shc-backend/
├─ cmd/                  # app boot, routes, cron startup
├─ handlers/             # HTTP handlers (auth, files, users)
├─ middlewares/          # request middleware (auth)
├─ models/               # GORM models
├─ services/             # business logic + external integrations
└─ utils/                # helper utilities (password/hash)
```

### Layering Pattern

Most request flow follows:

`Route -> Handler -> Service -> Model/DB`

This separation keeps handlers thin and business logic reusable.

---

## Backend Theory (Concepts Behind This Project)

This section explains *why* the backend is designed this way.

### 1) Layered Architecture

- **Handlers** are responsible for HTTP concerns (request parsing, status codes, JSON responses).
- **Services** contain business rules (auth logic, quota checks, session policy).
- **Models/DB** represent persistence.

This separation follows the **Single Responsibility Principle** and makes the code easier to test, maintain, and extend.

### 2) Stateless Access + Stateful Session Security

The project uses two auth ideas together:

- **Access token (JWT)**: short-lived proof sent with API requests.
- **Refresh token (JWT + session key check)**: allows issuing new access tokens.

Theory:
- Pure JWT systems are fast but hard to revoke immediately.
- Pure session systems are easy to revoke but add DB/cache reads for every request.
- A hybrid model gives better balance: fast access checks + revocable refresh flow.

### 3) OTP Login Theory

- OTP acts as possession-based verification (control of email inbox).
- It reduces password management complexity for users.

Tradeoff:
- In-memory OTP storage is simple but not resilient in distributed or restart scenarios.
- Production systems usually store OTP state in Redis with expiry and retry/attempt limits.

### 4) Resource Ownership & Authorization

Authorization is based on **ownership checks** and visibility:

- owner can access/manage file
- non-owner can access only if file is public

Theory:
- This is a basic form of **Object-Level Access Control**.
- Access control should always be validated server-side, regardless of client behavior.

### 5) Quota and Subscription Enforcement

The backend enforces limits on:
- daily reads
- daily writes
- remaining storage bytes

Theory:
- Quotas protect infrastructure cost and prevent abuse.
- They are a core part of **multi-tenant fairness** in SaaS systems.

### 6) Presigned URL Pattern (Direct-to-Storage)

Files are uploaded/downloaded directly to/from R2 using signed URLs.

Theory:
- App server handles **control plane** (auth, validation, metadata).
- Object storage handles **data plane** (large binary transfer).
- This reduces backend bandwidth load and improves scalability.

### 7) Caching Theory

Redis is used for short-lived data (e.g., presigned download URL cache) and rate-limiter state.

Theory:
- Caching cuts latency and repeated expensive operations.
- TTL-based caching is suitable when data validity is time-bound.

### 8) Rate Limiting Theory

The backend limits requests per client IP within a time window.

Theory:
- Prevents brute force and abusive traffic bursts.
- Protects downstream services (DB, email provider, storage APIs).

### 9) Scheduled Maintenance (Cron)

Nightly cron jobs perform subscription and data hygiene tasks.

Theory:
- Not all logic should run in live request path.
- Batch/background jobs are better for periodic consistency and cleanup.

### 10) CAP/Consistency Practicality in This Design

- DB is source of truth for users/files/subscriptions/sessions.
- Redis is an optimization layer (cache/limiter state), not authoritative data.

Theory:
- This is a common **consistency-first core with performance edge-cache** approach.
- If Redis is unavailable, critical data still exists in PostgreSQL.

---

## Core Features

### 1) Authentication (OTP + JWT)

- `POST /auth/otp`
	- Accepts user email
	- Generates OTP
	- Sends OTP through SMTP email

- `POST /auth/login`
	- Verifies OTP
	- Creates/updates user
	- Creates a session
	- Returns `access_token` and `refresh_token`

- `GET /auth/refresh-token`
	- Verifies refresh token + session key
	- Returns new token pair

- `DELETE /auth/logout`
	- Invalidates current session

### 2) User

- `GET /api/users/me`
	- Returns current user profile + subscription info

### 3) Files

- `POST /api/files/add`
	- Validates subscription limits
	- Creates file record
	- Returns presigned upload URL

- `GET /api/files/`
	- Paginated list of files for current user

- `GET /api/files/:fileId`
	- Access check (owner or public)
	- Increments view count
	- Returns presigned download URL (cached in Redis)

- `PATCH /api/files/toggle-visibility/:fileId`
- `PATCH /api/files/increment-download-count/:fileId`
- `PATCH /api/files/update-upload-status/:fileId`
- `PATCH /api/files/rename/:id`
- `DELETE /api/files/remove/:id`

### 4) Subscription & Limits

Per-user limits are tracked in subscription records:
- daily remaining reads
- daily remaining writes
- remaining storage bytes
- max file size

Limits are updated during file reads/writes.

### 5) Scheduled Jobs (Cron)

At midnight the server runs maintenance jobs:
- deactivate expired subscriptions
- reset active subscription limits
- delete stale non-uploaded files

---

## Request Lifecycle (Example)

### Upload flow

1. User authenticates and gets tokens.
2. Client calls `POST /api/files/add` with metadata.
3. Backend validates user subscription limits.
4. Backend stores file metadata and returns presigned R2 upload URL.
5. Client uploads file directly to R2.
6. Client updates upload status via `PATCH /api/files/update-upload-status/:fileId`.

### Download flow

1. Client calls `GET /api/files/:fileId`.
2. Backend validates visibility/ownership.
3. Backend fetches or creates presigned download URL.
4. URL is cached in Redis for short duration.
5. Client downloads from R2 directly.

---

## Environment Variables

Create a `.env` file in project root with the following values:

```env
# App
PORT=3000
JWT_SECRET_KEY=your_jwt_secret

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_NAME=shc
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379/0

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_ACCESS_KEY_SECRET=your_r2_access_key_secret
R2_REGION=auto
R2_BUCKET_NAME=your_bucket_name

# SMTP (OTP email)
GOOGLE_APP_PASSWORD=your_google_app_password
```

> Note: `.env` is auto-loaded by `godotenv/autoload`.

---

## Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL
- Redis
- Cloudflare R2 bucket credentials

### Install dependencies

```bash
go mod download
```

### Database setup

This project uses GORM models in `models/`.

Auto-migration lines currently exist in `services/db.service.go` but are commented out.
Uncomment when needed:

```go
Db.AutoMigrate(&models.User{}, &models.File{}, &models.Subscription{}, &models.StripeTransaction{}, &models.SubscriptionPlan{}, &models.Session{})
SeedPlans(Db)
```

Then run once and comment again if you prefer strict migration control.

### Run server

```bash
go run ./cmd
```

Server starts on `PORT` from `.env`.

Health route:

- `GET /` -> `API is running!`

---

## Auth Details

- Access token can be sent via:
	- `Authorization: Bearer <access_token>` header
	- cookie: `__shc_access_token`

- Refresh token can be sent via:
	- `Authorization: Bearer <refresh_token>` header
	- cookie: `__shc_refresh_token`

- Refresh token validation is tied to session records in DB.

---

## Important Notes / Current Limitations

- OTP is stored in-memory (map), so OTPs are lost on server restart.
- Route/auth behavior for semi-public file routes should be reviewed for edge cases.
- Test suite is not added yet.

---

## Development Suggestions

Recommended next improvements:

- Add migrations tooling (Goose/Flyway/etc.)
- Add unit and integration tests
- Move OTP store to Redis
- Add API docs (OpenAPI/Swagger)
- Improve observability (structured logs, metrics)

---

## Contributing

1. Fork and clone repository
2. Create a feature branch
3. Make focused changes
4. Open pull request with clear description

---

## License

Add license information here if/when finalized.
