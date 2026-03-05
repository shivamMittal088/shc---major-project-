# SHC Monorepo

This repository contains:
- `shc-backend` (Go backend)
- `shc-cli` (Rust CLI)
- `shc-frontend` (Next.js frontend)

## Environment setup

Create local `.env` files from examples before running services.

### PowerShell (Windows)

```powershell
Copy-Item shc-backend/.env.example shc-backend/.env
Copy-Item shc-frontend/.env.example shc-frontend/.env
```

### Bash (macOS/Linux)

```bash
cp shc-backend/.env.example shc-backend/.env
cp shc-frontend/.env.example shc-frontend/.env
```
