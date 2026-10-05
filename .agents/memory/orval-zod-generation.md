---
name: Orval Zod generation
description: Keeps regenerated API validation schemas compatible with the workspace's installed Zod version.
---

Orval can emit Zod 4-only APIs by default even when this workspace uses Zod 3.25. Pin the Zod generator to version 3 so generated validators remain compatible with the installed package.

**Why:** Unpinned generation changed email validation from `z.string().email()` to the Zod 4-only `z.email()`, breaking the shared-library typecheck.

**How to apply:** Keep the Orval Zod version explicit when changing or regenerating API schemas, then run codegen and the workspace typecheck.
