# PingPong KK2

A phone page joins an ESP32-S3 access point and sets the brightness of two LEDs. The LEDs stand in for the two motors of a table-tennis launcher. The firmware maps each 0–100 command to its own PWM output: LED 1 on GPIO14 and LED 2 on GPIO15.

The access point is `PingPong-ESP32`, password `pingpong123`, address `http://192.168.4.1`. Change the password before any deployment outside the lab.

## Projektsammanfattning (KK2)

Den här versionen är en mobil demonstration av den planerade bordtenniskanonen. Två lysdioder simulerar de två motorerna. ESP32-S3 skapar nätet `PingPong-ESP32`. En React-sida styr ljusstyrkan på GPIO14 och GPIO15 över WebSocket, med var sin PWM-kanal. Start och Stop finns. Lysdioderna släcks efter en minut utan nytt kommando, och genast när den sista sidan kopplas ner. Nästa prototyp är två 775-motorer med BTS7960-drivare, separat 12 V-matning och fysiskt nödstopp. Motorerna är inte anslutna i den här versionen.

## Current implementation

This repository demonstrates the LED bench, not the finished launcher.

- ESP32-S3 (Freenove kit) runs a Wi-Fi SoftAP, a small HTTP server on port 80, and a WebSocket server on port 81.
- The React page is built with Vite and TypeScript. On the bench it is stored in LittleFS and served by the board. During development, Vite serves it on the computer and proxies the device.
- Two independent LEDC channels, 2 kHz, 12-bit. `ENABLE_PWM_OUTPUTS` is `true`, so the LEDs follow the sliders. GPIO12 and GPIO13 are unused.
- The page sends brightness over WebSocket. The older HTTP routes are still in the firmware. The page does not use them to move the sliders.
- Start, Stop, a one-minute command timeout, and an immediate stop when the last page disconnects are implemented for the LEDs.
- Two 775 motors and BTS7960 drivers are the next hardware stage. They are not wired, and this firmware does not drive them.

`web/src/i18n.ts` keeps the on-screen phrases in Swedish, English, and Chinese. That file is runtime copy, not project documentation.

## Architecture

```text
Phone or desktop browser
        │  Wi-Fi to PingPong-ESP32
        ▼
ESP32-S3 SoftAP, 192.168.4.1
  ├── HTTP :80   LittleFS page, and the earlier /api/* routes
  ├── WebSocket :81   start, stop, brightness
  └── LEDC
        ├── GPIO14  LED 1
        └── GPIO15  LED 2
```

The browser is not in charge of safety. The firmware writes PWM only while it considers the session running, and it forces both outputs off on Stop, timeout, or loss of the last WebSocket client.

## WebSocket

The live page uses these text frames.

| Direction | Frame | Meaning |
| --- | --- | --- |
| Browser → board | `{"t":"start"}` | Enter the running state. Both levels become 0. |
| Browser → board | `{"t":"stop"}` | Stop and clear both levels. |
| Browser → board | `{"t":"level","a":60,"b":40}` | Set LED 1 and LED 2, integers 0–100. Ignored unless the session is running. |
| Board → browser | `{"t":"status","running":true,"a":60,"b":40,"pwm":true,"up":12345}` | Running flag, both levels, PWM enable, uptime in milliseconds. |

While a slider is moving, the page sends the latest pair about every 30 ms. It does not wait for an HTTP response. While the page is running and visible, it resends the current pair every 5 seconds so an idle slider still counts as a command. Hiding the page sends Stop.

In development, Vite proxies `/ws` to `ws://192.168.4.1:81`. The page served by the board connects straight to port 81.

## Start, Stop, and timeout

- **Start** enables the session. Until the next level frame, both LEDs are off.
- **Stop** clears the session and both levels immediately.
- **Timeout.** `CONTROL_TIMEOUT_MS` is 60000. One minute without a new command turns both LEDs off and broadcasts status.
- **Last client.** When the last WebSocket client disconnects during a running session, the firmware stops immediately. It does not wait for the minute.
- Reset and a failed start leave the outputs off. `stopNow()` runs at the end of `setup()`.

## Hardware wiring

This version drives LEDs only. Each LED needs its own series resistor. Do not connect a motor, a BTS7960, or a 12 V supply to the ESP32 pins.

| ESP32-S3 | Connect |
| --- | --- |
| GPIO14 | Resistor, then LED 1, then GND |
| GPIO15 | Resistor, then LED 2, then GND |
| GND | LED cathodes |
| GPIO12, GPIO13 | Leave unconnected |

The GPIO is a 3.3 V logic output. Brightness is the PWM duty written by `ledcWrite`. A lit LED means the firmware accepted a level while the session was running. It is not a measurement of motor speed.

## Repository layout

```text
pingpong-kk2/
├── README.md                 This document
├── KK2_PROJECT_PLAN.md       Planning handoff from 2026-11-17
├── CURSOR_START_HERE.md      Original Cursor onboarding note
├── .gitignore
├── docs/
│   └── PLAN.md               Milestone checklist and risks
├── tools/
│   └── deploy_web.py         Copy web/dist to esp32/data
├── web/                      Browser control page
│   ├── index.html            Page shell, title KK2 LED
│   ├── package.json          Node dependencies and npm scripts
│   ├── package-lock.json     Locked dependency versions
│   ├── vite.config.ts        Dev server, PWA, proxy /api and /ws
│   ├── tsconfig.json         TypeScript project references
│   ├── tsconfig.app.json     TypeScript config for the page
│   ├── tsconfig.node.json    TypeScript config for the Vite config
│   ├── public/               Icons copied into the build
│   └── src/
│       ├── main.tsx          React entry
│       ├── App.tsx           Sliders, Start/Stop, WebSocket client
│       ├── i18n.ts           Swedish, English, and Chinese UI phrases
│       ├── style.css         Page styles
│       └── vite-env.d.ts     Vite client types for import.meta.env
└── esp32/                    PlatformIO firmware
    ├── platformio.ini        Board, USB serial, LittleFS, WebSockets library
    ├── src/main.cpp          Access point, page, WebSocket, two PWM channels
    └── data/                 Generated filesystem image, not edited by hand
```

`web/node_modules/`, `web/dist/`, `esp32/data/`, and `esp32/.pio/` are install or build output.

## Development setup

1. Install [Node.js](https://nodejs.org/), including npm.
2. Install Python 3. `tools/deploy_web.py` uses the standard library only.
3. Install PlatformIO in Cursor or VS Code. The firmware project is `esp32/`, environment `freenove_esp32s3`, board `esp32-s3-devkitc-1`, framework Arduino.
4. Connect the Freenove ESP32-S3 with USB. PlatformIO chooses the upload port. If `pio` is not on `PATH`, call the executable from the PlatformIO virtualenv. On Windows that is `%USERPROFILE%\.platformio\penv\Scripts\pio.exe`.
5. From `web/`, run `npm install` once.

The monitor baud rate is 115200. The firmware prints the SSID and `192.168.4.1` on the first HTTP API response or the first WebSocket connection. A print issued before a monitor is attached can be dropped by USB-Serial/JTAG.

## Build and deployment

PlatformIO compiles the C++ sources, links `firmware.elf`, and writes `firmware.bin`.

From `esp32/`:

```powershell
pio run
pio run -t upload
pio device monitor
```

`pio run` compiles and links. `pio run -t upload` writes the firmware to flash. It does not update the files in LittleFS.

The page can be opened in either of these ways.

**Edit the page on the computer.** From `web/`:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. That address is the computer, and the board does not yet contain this copy of the page. The computer must join `PingPong-ESP32`, because the device is at `http://192.168.4.1` and is not on the home network. Vite then forwards `/ws` to `ws://192.168.4.1:81` and `/api` to `http://192.168.4.1`. A phone does not open `localhost:5173`.

**Put the page on the board.** From the repository root:

```powershell
cd web
npm run build
cd ..
python tools/deploy_web.py
cd esp32
pio run -t uploadfs
```

`npm run build` writes the static site to `web/dist/`. `deploy_web.py` replaces `esp32/data/` with that site. `pio run -t uploadfs` writes it to LittleFS. Then stop the development server. Join `PingPong-ESP32` and open `http://192.168.4.1`. The board serves the page, and the two sliders set LED 1 and LED 2.

Changing the partition table in `platformio.ini`, or flashing firmware in a way that erases the filesystem, can remove the page. Run `uploadfs` again after that.

## Demonstration and verification

1. Flash the firmware and the filesystem image.
2. Join `PingPong-ESP32` and open `http://192.168.4.1`.
3. Press Start. Both LEDs stay off until a level is sent.
4. Move the sliders. LED 1 follows GPIO14 and LED 2 follows GPIO15. The presets are 60/60, 80/40, and 40/80.
5. Press Stop. Both LEDs go off.
6. Start again, leave the page open without moving a slider, and wait one minute. The keepalive should prevent the timeout. Hide the page, or disconnect the last client, and both LEDs go off without waiting for the minute.
7. On the serial monitor, expect `START`, throttled `L1` / `L2` lines, `STOP`, and `SAFETY TIMEOUT: STOP` when the minute really expires.

The web build check is `npm run build` in `web/` (`tsc -b` and `vite build`). The firmware check is `pio run` in `esp32/`.

## Earlier HTTP API

`esp32/src/main.cpp` still registers the first communication contract:

- `GET /api/status`
- `POST /api/start`
- `POST /api/motors` with form fields `motor1` and `motor2` (integers 0–100)
- `POST /api/stop`

Those routes answer JSON that uses `motor1` and `motor2`. The WebSocket frames use `a` and `b`. The React page does not poll `/api` and does not post brightness there. `KK2_PROJECT_PLAN.md` describes the older request shape, including a JSON body and a 300 ms heartbeat. That description is the original plan. The code accepts form fields, and the page uses WebSocket.

The page footer in `web/src/i18n.ts` still reads `REST API` and `V0.1`. The phrase is part of the shipped UI copy and was left unchanged.

## Future prototype

The launcher itself is not in this version. The planned machine uses two 775 brushed motors, each behind a BTS7960 (or the same class of high-current H-bridge), a separate fused 12 V supply, a common-ground plan, a physical emergency stop, and guarded friction wheels. ESP32 PWM would feed the driver logic inputs. It must not feed the motor terminals. GPIO14 and GPIO15 stay 3.3 V signals.

Before any motor is powered, the supply, driver wiring, stall current, loss of Wi-Fi, reset, and the physical stop need their own review. `ENABLE_PWM_OUTPUTS` being true for these LEDs is not that review. Automatic feeding, measured RPM, PID, and a FreeRTOS split of the application are outside the current work.

## Project plans

`KK2_PROJECT_PLAN.md` and `docs/PLAN.md` keep the original milestone text. Read them as the plan, then use this README for what the firmware and page do now. V0.5 (motor bench) and V1.0 (one-ball launcher) are not implemented.

## Safety

The access point has no Internet connection, and the HTTP and WebSocket traffic is not encrypted. Anyone who knows the password and joins the hotspot can send the same commands. The software stop does not replace a physical emergency stop once motors exist. Real wheels can jam, throw a ball, overcurrent a motor, or break a hub. None of that hardware is connected here.
