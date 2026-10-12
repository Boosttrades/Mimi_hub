---
name: Account preview styling
description: Keep MimiiHub account screens in the approved visual style while using Supabase Auth for real sign-up and sign-in.
---

Keep MimiiHub sign-up, sign-in, and verification screens in the shared branded frame. They are functional account screens backed by Supabase Auth; do not turn them back into local-only previews.

**Why:** The user approved the account screen design, then requested optional email/password accounts with email verification and Supabase-persisted customer data.

**How to apply:** Reuse the shared account shell when changing account visuals, and keep authentication, verification, and account data flows connected to Supabase.
