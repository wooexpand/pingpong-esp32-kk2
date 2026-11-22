# KK2 — ESP32-S3 Wi-Fi Ping-Pong Launcher

> Project planning handoff for Cursor. Version: 2026-11-17. This is **planning only**. The project source is already open in Cursor. Do not regenerate, overwrite or restructure the existing project without inspecting it and asking first.

## 0. Plan versus the current tree

Sections 1–8 below are the handoff from 2026-11-17. They stay in their original meaning. They are not a description of the firmware as it runs today. `README.md` is that description.

What the repository does now, and where this plan says something else:

- The page controls two LEDs, not motors. `ENABLE_PWM_OUTPUTS` is `true` for GPIO14 and GPIO15. V0.5 and V1.0 have not been built. Enabling LED PWM is not permission to connect a 775 motor or a BTS7960.
- The live commands are WebSocket text frames on port 81: `{"t":"start"}`, `{"t":"stop"}`, and `{"t":"level","a":N,"b":N}`. The HTTP routes from section 4 are still registered. The page does not use them for brightness.
- `POST /api/motors` reads form fields `motor1` and `motor2`. It does not parse a JSON body.
- The page sends the latest slider pair about every 30 ms, plus a 5-second keepalive while it is running and visible. It does not post an HTTP heartbeat every 300 ms. The firmware timeout remains one minute (`CONTROL_TIMEOUT_MS` 60000). The last WebSocket client disconnecting also stops at once.
- Section 8 says to keep motor outputs disabled until a hardware review. That rule still applies to any future motor stage. It does not describe the LED bench, where the outputs were turned on deliberately.

## 1. Product goal

Build a practical, demonstrable table-tennis ball launcher controlled from a single React-based mobile interface on Android and iPhone. ESP32-S3 runs a local Wi-Fi access point, a small HTTP API and (later) hosts the built web UI. Two independent 12 V brushed motors drive two friction wheels; differential speed changes ball spin.

**KK2 MVP:** a phone can control the two motor target values and reliably launch one ball. Automatic feeding, measured RPM, PID, FreeRTOS decomposition and advanced spin modes are explicitly out of scope for MVP.

**Engineering rule:** every increment must compile, run, have a repeatable test and be demonstrable. Do not add the next layer before verifying the current one.

## 2. Current environment and decisions

- Development: Windows 11; Cursor as single IDE; Arduino C++ / existing ESP32 project tools; React + Vite + TypeScript.
- Hardware: Freenove ESP32-S3 kit. Initially no motors attached. Later, two 12 V brushed motors (candidate XD-775, advertised 6000 RPM, 5 mm shaft) and appropriately rated motor drivers, separate power supply, fusing, protective covers and physical emergency stop. P1S 3D printer for static components.
- Communications: **Wi-Fi SoftAP + HTTP REST**, not BLE, not native Android/iOS apps.
- UI: React web controller, mobile-first. App icon / home-screen entry desired.
- No cloud, router, Android Studio, Xcode, Kotlin or Swift requirement for early milestones.

## 3. Architecture

```text
Android / iPhone / desktop browser
        │ Wi-Fi to ESP32 AP
        │ HTTP requests
        ▼
ESP32-S3 SoftAP (example gateway 192.168.4.1)
  ├── WebServer: /api/*
  ├── LittleFS: React dist (later milestone)
  ├── commands & operational state
  └── two independent PWM outputs (hardware stages only)
           └── suitable motor drivers, external 12V supply
                    └── two guarded friction wheels
```

**Safety ownership:** ESP32 controls safe outputs; browser connection state is advisory only. Any command timeout, disconnect, reset or invalid command must default to a stopped target. Software stop is not a substitute for a physical emergency stop.

## 4. API contract (baseline; inspect existing implementation first)

- `GET /api/status`: JSON with at least `connected`, `running`, `motor1`, `motor2`, `outputs_enabled`, `uptime_ms` (adjust documentation to actual implementation, not vice versa without reason).
- `POST /api/motors`: JSON `{ "motor1": 60, "motor2": 80 }` (integer 0–100). Validate type/range; reject malformed commands; refresh watchdog on valid authorized commands.
- `POST /api/start`: transition to control-enabled/running state only when interlocks are satisfied.
- `POST /api/stop`: immediately force target outputs to zero and stop state.
- On active control, web UI sends a heartbeat/command roughly every 300 ms; ESP32 times out at 1 minute, stopping outputs. Exact timeouts should be centrally defined and tested, not scattered as magic numbers.
- API is local HTTP for lab-only use; prevent exposure on untrusted networks. Make response/error behavior deterministic, including no-connection and malformed-body paths.

## 5. Versioned delivery and acceptance

### V0.1 — ESP32 Wi-Fi AP + HTTP API

- Serial shows hotspot startup and IP.
- Android 9 and a desktop can join ESP32 Wi-Fi and GET `/api/status`.
- POST changes stored target values, visible in serial/status; STOP resets values.
- **No hardware motor output.** Confirm PWM output remains disabled.
- Provide a command-line smoke-test procedure and a short evidence log.

### V0.2 — React responsive controller

- Two sliders 0–100, connected/offline indication, Start, STOP, optional presets.
- React communicates with API; handles errors, disconnect and invalid values.
- Stop is visually prominent; reconnect cannot silently restart motion.
- Manual browser test on Android 9 and desktop.

### V0.3 — Standalone ESP32-hosted UI

- `npm run build`; deploy static artifacts to LittleFS; ESP32 serves site and API at `http://192.168.4.1`.
- Phone controls without development PC. Add a home-screen icon/shortcut where supported.
- **PWA caveat:** local HTTP IP is *not* a secure context; a full installable/offline service-worker PWA cannot be promised on iOS/Android in this setup. Manifest/icon and shortcut workarounds are separate from guaranteed PWA installation. Do not claim automatic Wi-Fi switching; user joins AP in system settings.

### V0.4 — PWM LED bench test

- Two independently dimmable LEDs with suitable series resistors; map API 0–100 to Arduino LEDC duty.
- Zero on reset/timeout/STOP. Keep real motors disconnected.
- Demonstrate safe behavior during browser disconnect and reset.

### V0.5 — Two brushed motor bench test

- Confirm actual motor datasheet, shaft mount, no-load vs load current and **stall current** before driver and PSU selection. Marketplace motor ratings may be inconsistent; do not assume advertised 30 W / RPM is validated.
- Use suitable motor drivers, separate fused 12 V supply, grounding/EMI considerations, accessible physical E-stop, and guarded rotating parts. No GPIO-to-motor direct connection.
- Only enable PWM motor output after hardware review; work up from low speed. Confirm STOP and watchdog fail-safe independently.

### V1.0 — Manual single-ball launcher (KK2 MVP)

- Two friction wheels with secure rated hubs and adjustable gap; sturdy P1S-printed static supports and protective guard.
- Stable *single-ball* launch with phone-commanded speeds; speed difference demonstrated cautiously.
- Keep fingers clear and use physical E-stop. Document test results, limits, risks and failures.

### Post-MVP (not needed for KK2 pass)

- Servo feeder, tachometer / Hall feedback, closed-loop PID, richer spin presets, FreeRTOS task split, Wi-Fi mode selection, telemetry.

## 6. KK2 assignment report mapping

1. **Idea, concept, target:** what problem, user group, system context and block diagram.
2. **Requirements:** functional/nonfunctional, usability, interface, communication, processor, toolchain and verification tools.
3. **First rig architecture:** sensors (none initially), actuators, UI and wiring diagram.
4. **Implementation and demo:** source, working demo, problems and solutions, photo/video evidence.
5. **Future prototype:** material choice, environmental impact, initial Bill of Materials, lessons learned, cost and safety.
6. **Submission:** design report, documented code/Git repo, running rig and ideally sections 1–5.

## 7. Documentation per increment

Each milestone needs: Git tag or commit, steps to build, test checklist and observed results, screenshots/serial output, issue list, known limitations. Keep docs short and credible. Do not claim tested on hardware if only compiled.

## 8. Instructions to Cursor Agent

1. **Inspect the existing repository before coding.** Summarize directory structure, actual ESP32 tooling, React components, API routes, packages and missing pieces; do not assume this plan matches code exactly.
2. Find any breaking configuration issues. Make minimal changes, never replace working code wholesale.
3. Work **only on the earliest incomplete milestone**. Start with V0.1, unless repository evidence proves it already passes.
4. For a proposed change, state files, reason and acceptance test. Implement in small reviewable diffs.
5. Run local builds/lint/tests where tools are available. If not available, state what was not verified. Never fabricate run/test results.
6. Never energize motors as a side effect of UI testing. Preserve `outputs_enabled=false` or equivalent until deliberate hardware authorization.
7. Keep UUID/BLE material out of the new Wi-Fi implementation unless historical notes. Avoid adding native mobile stack, login/cloud, advanced architecture or speculative features.
8. Keep this plan as design intent; report discrepancies between plan and actual code rather than silently rewriting facts.

**First task for Cursor:** Inspect the already opened project and give a V0.1 readiness audit, then propose the shortest verification path for SoftAP + `GET /api/status` + `POST /api/motors` + STOP using the existing code. Do not start V0.2 until V0.1 is demonstrably working.
