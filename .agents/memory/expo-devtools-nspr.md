---
name: Expo DevTools library warning
description: How to interpret a missing libnspr4 warning in the Expo workflow.
---

The React Native DevTools subprocess may fail to load because the Nix environment lacks `libnspr4.so`, while Metro continues and the Expo web preview still bundles and renders.

**Why:** The missing browser-debugger binary is optional to serving the app and can be mistaken for the cause of a failed preview.

**How to apply:** Confirm Metro starts and the Expo preview renders before treating this warning as blocking; continue to investigate actual server or bundle errors separately.
