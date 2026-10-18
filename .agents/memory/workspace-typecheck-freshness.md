---
name: Workspace typecheck freshness
description: Diagnose missing API-client exports in a leaf app against current source and built workspace declarations.
---

When generated API-client source has the expected exports but an artifact reports missing types or fields, rebuild the shared library declarations before changing the contract or client code. Use the root workspace typecheck as the authoritative verification because it builds shared libraries first.

**Why:** A stale declaration build produced false admin API-client errors even though the current generated source and OpenAPI contract already agreed.

**How to apply:** Run the root typecheck (or rebuild libraries before a leaf artifact check) after API code generation and before editing callers to work around missing exports.
