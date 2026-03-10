# SHC Frontend

Browser client for SHC, built with Next.js (App Router) and TypeScript.

The frontend provides:

- OTP login and authenticated private workspace
- Overview dashboard for workspace metrics and usage
- File upload, listing, sharing, rename/delete, and visibility control
- Public share pages for file previews/download flows

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI primitives

## Requirements

- Node.js 18+
- npm
- Running SHC backend API

## Environment

Create .env in shc-frontend with:

```env
SHC_BACKEND_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

If you use Redis-backed helpers in frontend, also set the Redis/KV variables used by src/lib/kv.ts.

## Install And Run

```bash
cd shc-frontend
npm install
npm run dev
```

Useful scripts:

- npm run dev: start local dev server
- npm run build: production build
- npm run start: start production server
- npm run lint: run lint checks
- npm run format: format files via Prettier

## Main App Areas

- /auth/login: OTP login flow
- /: private Overview page
- /files: private Files management page
- /subscription: private subscription and billing view
- /share/[...slug]: public share route

## Current UX Notes

### Overview

- Layout uses compact spacing and smaller typography for dense information display.
- Sidebar and dashboard cards are tuned for a compact workspace view.

### Files

- File list is full-width single-column.
- Upload panel and file cards use compact sizing.
- Language filter dropdown was removed.
- Search supports autocomplete suggestions using a datalist from visible file names.

## Key Folders

```text
shc-frontend/
├── src/app/            # App Router routes and layouts
├── src/components/     # Reusable UI components
├── src/server-actions/ # Server actions calling backend APIs
├── src/lib/            # Shared helpers/utilities
├── src/types/          # Type definitions
└── public/             # Static assets
```

## Troubleshooting

- If npm run dev fails, install dependencies again with npm install and verify Node version.
- If private pages fail to load data, verify SHC_BACKEND_API_BASE_URL points to a running backend.
- If uploads fail with CORS/preflight errors, verify Cloudflare R2 bucket CORS includes your frontend origin and PUT.
