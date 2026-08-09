---
name: MimiiHub preview dependencies
description: What is needed for a complete MimiiHub storefront preview
---

The home page is intentionally hardcoded and API-independent: it renders collections, category links, trust highlights, and the category cards without PostgreSQL. Other storefront pages still request database-backed products or settings.

**Why:** The imported project previously left the home page waiting on database-backed settings and products, so a missing database made the landing page appear empty even though the hardcoded categories endpoint worked.

**How to apply:** When verifying the landing page, check the web preview without requiring API responses. For product listing, category detail, checkout, and admin pages, provision or migrate the database before relying on a complete screenshot.