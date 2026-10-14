---
name: MimiiHub mobile admin authentication
description: Authentication transport between the Expo admin app and Supabase-backed API.
---

The Expo admin signs in directly to Supabase with the public anon key, persists its user session locally, and sends the access token as an Authorization Bearer token. The API must validate that token with Supabase while preserving the existing HttpOnly-cookie and refresh-token flow for the web storefront. Keep administrator-role authorization enforced by the API.

**Why:** Native requests cannot rely on the storefront's browser cookies, but both clients must share one Supabase-backed identity and permission model.

**How to apply:** Accept verified Bearer tokens as an alternative to the existing cookie session in API auth middleware; never bundle the Supabase service-role key into the mobile app.
