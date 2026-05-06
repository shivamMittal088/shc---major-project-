# Deploying `shc-frontend` to Vercel

This is the only deployable-on-Vercel piece of the SHC monorepo. The Go backend
(`shc-backend`) and Python ML service (`shc-risk-ml-service`) must be hosted
elsewhere (Fly.io, Render, Railway, a VM, etc.) and their public HTTPS URLs
supplied as environment variables here.

---

## 1. Prerequisites

- A Vercel account: <https://vercel.com>
- The repo pushed to GitHub / GitLab / Bitbucket (Vercel imports from there).
- Publicly reachable URLs for:
  - The Go backend (`SHC_BACKEND_API_BASE_URL`)
  - The Python ML service (`RISK_ML_SERVICE_URL`)
- A Redis instance reachable from Vercel. Recommended: **Upstash Redis**
  (free tier, works over TLS and is serverless-friendly).

---

## 2. Import the project

1. In the Vercel dashboard click **Add New → Project**.
2. Pick the repository.
3. **Important:** set **Root Directory** to `shc-frontend`.
4. Framework preset will auto-detect as **Next.js**. Leave build/install
   commands at defaults:
   - Install: `npm install`
   - Build:   `next build`
   - Output:  `.next`

---

## 3. Environment variables

Add these in **Project Settings → Environment Variables** (Production +
Preview). Values come from `.env.example`.

| Name                       | Required | Notes                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------- |
| `SHC_BACKEND_API_BASE_URL` | Yes      | Public HTTPS URL of deployed Go backend, e.g. `https://api.shc.dev`   |
| `RISK_ML_SERVICE_URL`      | Yes      | Public HTTPS URL of the Python ML service                             |
| `REDIS_URL`                | Yes      | Full Redis connection string (e.g. Upstash `rediss://...`)            |
| `NEXT_PUBLIC_BASE_URL`     | Yes      | The deployed frontend URL, e.g. `https://shc.vercel.app`              |
| `KV_URL`                   | Optional | Only if you also use `@vercel/kv` features                            |
| `KV_REST_API_URL`          | Optional | Same as above                                                         |
| `KV_REST_API_TOKEN`        | Optional | Same as above                                                         |
| `KV_REST_API_READ_ONLY_TOKEN` | Optional | Same as above                                                      |
| `UPSTASH_REDIS_URL`        | Optional | Used if you switch `lib/kv.ts` to `@upstash/redis`                    |
| `UPSTASH_REDIS_TOKEN`      | Optional | Same as above                                                         |

> The existing `src/lib/kv.ts` uses `ioredis`. That works on Vercel Node.js
> functions but each cold start opens a new TCP connection. For best
> serverless behavior, consider switching to `@upstash/redis` (already in
> `package.json`) which uses HTTPS.

---

## 4. Backend CORS / cookies

The frontend sets auth cookies (`__shc_access_token`, `__shc_refresh_token`)
issued by the Go backend. After deploy, on `shc-backend`:

1. Add the Vercel production URL (and any preview URLs you care about) to the
   backend's allowed CORS origins.
2. Ensure cookies are issued with `Secure`, `SameSite=None` so the browser will
   send them cross-site to your Vercel domain.
3. If the backend is on a different apex domain than the frontend, the
   `Domain` attribute on cookies must match the backend's host (cookies
   cannot be set for a third-party domain).

---

## 5. `next.config.js` images

`next.config.js` whitelists `files.shc.ajaysharma.dev` for `next/image`.
If your file/object storage is on a different host in production, add it to
`images.remotePatterns`.

---

## 6. Deploy

Click **Deploy**. Vercel will run `npm install && next build` inside
`shc-frontend/`. After the first successful deploy:

- Set the Production domain under **Settings → Domains**.
- Update `NEXT_PUBLIC_BASE_URL` to that domain and redeploy if it changed.
- Update the backend CORS allowlist with the final domain.

---

## 7. Local sanity check before deploy

```powershell
cd shc-frontend
Copy-Item .env.example .env.local
# fill in values
npm install
npm run build
npm start
```

If `npm run build` succeeds locally, Vercel's build will too.

---

## 8. What Vercel will NOT host

- `shc-backend/` (Go) — deploy to Fly.io / Render / Railway / VM.
- `shc-risk-ml-service/` (Python FastAPI) — same options; has a `Dockerfile`.
- `shc-cli/` (Rust) — distributed as a binary, not a web service.
