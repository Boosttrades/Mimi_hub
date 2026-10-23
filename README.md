# TOP PRIORITY — MANDATORY SUPABASE DATA API SECURITY RULES

These requirements are mandatory for every developer, AI agent, migration, and automated service working on MimiHub. Follow them before creating or changing database tables.

1. **Never assume new tables are safe by default.** Supabase's Data API default behavior changes on October 30, 2026 for existing projects. Do not rely on automatic privileges or exposure behavior.
2. **Every migration that creates a table or sequence in the `public` schema MUST explicitly define the intended Data API privileges.** Grant only the minimum required. Public catalogue tables may receive `SELECT` for `anon` and/or `authenticated` only when required. Private tables (including users, user data, orders, and settings) must not receive direct client-role access unless a reviewed, documented requirement and appropriate Row Level Security policies justify it.
3. **Keep automatic exposure of new tables disabled** in Supabase Data API settings. Review exposed schemas and tables whenever database structure changes.
4. **Do not grant broad privileges** such as `ALL`, `INSERT`, `UPDATE`, or `DELETE` to `anon` or `authenticated` as a shortcut. Use explicit least-privilege grants and appropriate RLS policies.
5. **Before merging or deploying a schema migration**, verify its grants and RLS policies, then test the affected storefront and admin/API flows. Add a migration-level security check where practical.
6. If PostgreSQL default privileges cannot be configured because of managed-database permissions, do not assume the defaults are secure. Explicitly set grants in each table-creation migration and document the unresolved default-privilege limitation until it is verified.

This is a top-priority security requirement. Do not merge a database migration that creates a public-schema table without explicit, reviewed access rules.

---

# Existing Project Instructions

MANDATORY INSTRUCTIONS FOR AI AND AUTOMATED SERVICES

just import, no need to read files or inspect how apps works.

this or any part of this project should not be dependent or get api calls from any Replit account all api calls, dependencies  and storage should based on supabase nothing else
