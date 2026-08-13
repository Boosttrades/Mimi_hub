---
name: MimiiHub Supabase-only backend
description: MimiiHub must remain portable without Replit account services.
---

MimiiHub's backend, database, product image storage, and application API must use Supabase only; do not add Replit SDKs, plugins, connectors, or storage services.

**Why:** The project may move between Replit accounts and must not depend on account-specific services.

**How to apply:** Keep server credentials in environment secrets, route backend data and uploads through Supabase, and remove Replit-specific packages or runtime integrations from future changes.