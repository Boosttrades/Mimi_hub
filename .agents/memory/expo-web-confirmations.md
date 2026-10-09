---
name: Expo web confirmation dialogs
description: Cross-platform confirmation UI for destructive actions in the Expo admin preview.
---

Do not rely on multi-button `Alert.alert` for destructive confirmations in the Expo app's browser preview. Use an in-app dialog with explicit cancel/confirm actions and show request errors in the dialog.

**Why:** In the Replit browser preview, the native-style alert did not appear, and no DELETE request reached the API.

**How to apply:** Use a React Native `Modal` or equivalent cross-platform UI for confirmation, then verify the delete request and list refresh behavior.
