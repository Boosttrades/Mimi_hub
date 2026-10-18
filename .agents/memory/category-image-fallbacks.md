---
name: Category image fallbacks
description: Category cards and detail banners need to account for static placeholder image URLs.
---

Treat placeholder image URLs from static category data as missing when selecting the shared frontend category image. Real admin-provided image URLs should continue to take priority.

**Why:** The API can return a non-empty placehold.co URL even when no real category image has been configured, which otherwise prevents the intended frontend image fallback from running.

**How to apply:** Reuse the shared category image map for home cards, the Categories page, and category detail banners; only accept a category record image directly when it is a real URL.