# KK2 milestones and checks

This is the original milestone list. It is not a claim that every item has been demonstrated. The current code is the two-LED bench described in `README.md`: the page controls brightness over WebSocket on port 81, and the HTTP routes from V0.1 are still present but unused by the page.

| Milestone | In this repository |
| --- | --- |
| V0.1 REST | Routes exist. The live page does not call them. |
| V0.2 React page | Implemented. Transport is WebSocket, not a 300 ms HTTP poll. |
| V0.3 Page on the board | Build and LittleFS copy path exist. |
| V0.4 LED bench | Implemented. PWM is enabled for GPIO14 and GPIO15 only. |
| V0.5 Motors | Not implemented. |
| V1.0 Launcher | Not implemented. |

## V0.1 — REST communication

- ESP32-S3 advertises the access point `PingPong-ESP32`
- `GET /api/status` returns parseable JSON
- `POST /api/start` enters the running state
- `POST /api/motors` accepts 0–100 values and prints them on Serial
- `POST /api/stop` clears the outputs immediately; about one minute without a command also stops

## V0.2 — React controller

- The React page shows link state, two sliders, presets, Start, and Stop
- The browser and the ESP32 exchange commands continuously
- A lost network connection is shown clearly

## V0.3 — Board serves the page

- `web/dist` is deployed to LittleFS
- The phone joins the ESP32 Wi-Fi and opens `http://192.168.4.1`
- Add to Home Screen in iOS Safari; test an Android shortcut
- The page still works after the development computer is shut down

## V0.4 — LED check

- With the wiring reviewed, enable two PWM channels and connect only LEDs that have series resistors
- Both channels can be told apart by eye

## V0.5 — Motor test

- Design and review the supply, drivers, wiring, and emergency stop separately
- Check maximum current, loss of link, reset, and a stop when control is lost
- The intended power stage is two 775 motors and BTS7960 drivers. That hardware is not part of the LED demonstration

## V1.0 — Mechanical launch check

- Finished friction wheels, a guard, and an adjustable motor mount
- One ball can be launched repeatedly; the phone sets speed and the speed difference

## Risks

- A real motor can jam a ball, throw material from a wheel, overcurrent, or break a plastic hub
- The SoftAP has no Internet path; a phone may switch back to mobile data on its own
- HTTP is not encrypted; any other client on the hotspot can control the device
- Plain local HTTP does not meet the secure-context rules of a normal service worker
