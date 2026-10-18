---
name: Imported artifact preview registration
description: How to validate imported web artifacts when Replit preview registration is missing.
---

Imported web projects can contain a valid `.replit-artifact/artifact.toml` while still not appearing in the registered artifact list or managed workflow list. In that state, use the existing package command with its configured `PORT` and `BASE_PATH` for local HTTP smoke checks; do not create a duplicate workflow unless the user asks to set up the project.

**Why:** The imported MimiiHub project built and served correctly, but the artifact preview service could not find its metadata registration.

**How to apply:** Before relying on `WorkflowsRestart`, confirm the artifact/workflow is registered. If it is absent, validate with the artifact's existing dev command and report the preview-registration limitation separately from code correctness.