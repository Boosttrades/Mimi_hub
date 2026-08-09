---
name: MimiiHub preview dependencies
description: What is needed for a complete MimiiHub storefront preview
---

The category endpoint can serve the hardcoded catalog without a database, but the home page also requests homepage settings and products from PostgreSQL. A full storefront preview therefore requires the database schema and tables to be available.

**Why:** Previewing only the category response can look healthy while the storefront remains on its loading state because unrelated database-backed requests return 500.

**How to apply:** When verifying future MimiiHub UI changes, check both `/api/categories` and the database-backed homepage/product endpoints, and provision or migrate the database before relying on a screenshot.