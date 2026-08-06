# Mimi_hub — Deployment & Replit instructions (MANDATORY)

**Last updated: 2026-08-06**

IMPORTANT: The steps in this file are the canonical, required deployment instructions for the Replit-hosted Mimi_hub application. Any AI or developer automations must follow these exactly when building or publishing the site.

## Purpose
This document contains the exact steps required to build the frontend, build the API server, and run them together on Replit so the published site serves the UI and the /api endpoints from the same origin. This prevents base-URL/CORS mismatches and ensures runtime data (categories, products, etc.) is available to the client.

## Required environment variables (Replit Secrets)
Set the following in the Replit project Secrets (Environment variables) for the deployment that will run the server:

- BASE_PATH = /
- PORT = 3000

Note: If Replit provides a specific numeric PORT for your environment, use that value instead of 3000. The PORT variable must be present — vite.config.ts and the API server both require it at build/start time.

## Run / Deploy command (Replit Run command)
Set the Replit Run command (or use this locally) to perform a workspace build then start the API server which serves the built frontend:

pnpm -w run build && pnpm -w --filter @workspace/api-server run start

This does the following in order:
1. Builds the entire monorepo (including the frontend in artifacts/mimihub). The frontend build output is placed at `artifacts/mimihub/dist/public` by vite.config.ts.
2. Builds the API server and starts the compiled server which mounts the router on `/api` and serves static files from `artifacts/mimihub/dist/public` (SPA fallback enabled).

## Files changed (mandatory to keep in repo)
- `artifacts/api-server/src/app.ts` — now serves static frontend files from `artifacts/mimihub/dist/public` and includes SPA fallback. This change allows same-origin API calls to `/api/*` from the frontend.

If this file is reverted or the staticPath is moved, deployments will break and the published site may show empty states for categories and products.

## Verify after deploy
1. Open the published URL (e.g., `https://<replit-host>/`).
2. In the browser DevTools → Network, reload and find the request to `/api/categories`.
   - Expect HTTP 200 and a JSON array of categories.
   - If you see 401/403/404 or empty array, inspect server logs and verify DB/fixtures.
3. If the page still shows "Categories coming soon" or empty states:
   - Confirm `artifacts/mimihub/dist/public/index.html` exists in the deployment (run output of build step).
   - Confirm the API server started and logged `Server listening` with the configured PORT.
   - Check Replit console for build or runtime errors.

## Troubleshooting checklist (if issues persist)
- Missing PORT or BASE_PATH at build/start: add them to Replit Secrets and redeploy.
- `dist/public` missing: run `pnpm -w run build` locally and inspect `artifacts/mimihub/dist/public` to confirm `index.html` and assets exist.
- API returning errors: curl the endpoint directly `curl -i https://<host>/api/categories` and inspect response.
- CORS errors: verify backend uses `cors()` (the code currently calls `app.use(cors())` by default).

## Notes for automated tools / AIs (MANDATORY)
- This README is the single source of truth for deploy steps as of **2026-08-06**. Any automation (CI, CD, AI assistant) MUST apply these steps in this exact order and set the required environment variables before starting builds or publishing.
- If you change the frontend build output directory (`vite.config.ts`) or the server static serving path, update this README with a new date and mark it MANDATORY.

---

If you want, I can also append the same dated note into `README.feature-orders-tab.md` so the feature branch notes and developer instructions include the same mandatory deploy guidance — say "Also update feature readme" and I'll apply that change as well.
