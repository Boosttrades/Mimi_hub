---
name: Express 5 wildcard routes
description: Express 5 path-to-regexp rejects the legacy bare wildcard route syntax.
---

Express 5 does not accept a bare `*` path in `app.get()` or similar route declarations. SPA fallbacks should use catch-all middleware and explicitly pass through non-GET/HEAD requests.

**Why:** The Express 5 router delegates path matching to a newer path-to-regexp version that throws during application startup for the legacy wildcard syntax.

**How to apply:** When adding or reviewing an Express 5 SPA fallback, avoid `app.get('*', ...)`; use middleware with method and API-path guards instead.