# Cursor handoff

This note is the original onboarding prompt. The repository now contains the two-LED demonstration in `README.md`: WebSocket brightness control on GPIO14 and GPIO15. The audit below belongs to the start of the work. Do not treat it as an instruction to rebuild only V0.1 or to turn the LED outputs off.

The source project is ALREADY extracted and open in Cursor. **Do not replace it with another generated project.**

Copy `KK2_PROJECT_PLAN.md` to the existing project root. Optionally copy `.cursor/rules/kk2-mvp.mdc` into the existing repository's `.cursor/rules/` directory.

Paste into Cursor Agent:

> Read KK2_PROJECT_PLAN.md and inspect the currently opened repository. Do not generate a new project or overwrite existing files. Audit V0.1 against the code (ESP32 SoftAP, HTTP routes, web/client configuration, safety defaults). List gaps and give the minimal steps to build/flash/test V0.1. After showing the plan, implement only necessary V0.1 fixes and report what was actually verified.
