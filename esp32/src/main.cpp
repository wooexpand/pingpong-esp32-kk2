#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <LittleFS.h>

// Two LEDs. GPIO14 and GPIO15 each have their own PWM channel.
// A series resistor is required. GPIO12 and GPIO13 are unused.
constexpr bool ENABLE_PWM_OUTPUTS = true;
constexpr int LED_M1 = 14;
constexpr int LED_M2 = 15;
constexpr int LED_M1_CH = 0;
constexpr int LED_M2_CH = 1;
constexpr int PWM_FREQ = 2000;
constexpr int PWM_BITS = 12;
constexpr int PWM_MAX = (1 << PWM_BITS) - 1;
constexpr unsigned long CONTROL_TIMEOUT_MS = 60000;
constexpr const char* AP_SSID = "PingPong-ESP32";
constexpr const char* AP_PASSWORD = "pingpong123"; // Change this password before any real deployment.

WebServer server(80);
// Brightness uses its own WebSocket port. HTTP on port 80 serves the page and the earlier REST routes.
WebSocketsServer ws(81);
int wsClients = 0;
unsigned long lastStatusBroadcast = 0;
unsigned long lastLevelLog = 0;
bool running = false;
int motor1 = 0;
int motor2 = 0;
unsigned long lastCommand = 0;
bool bootBannerPrinted = false;

void printBootBanner();

void writeLed(int pin, int channel, int percent) {
  percent = constrain(percent, 0, 100);
  const uint32_t duty = (uint32_t)percent * PWM_MAX / 100;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pin, duty);
  (void)channel;
#else
  // Arduino-ESP32 2.x writes the LEDC channel, not the GPIO number.
  ledcWrite(channel, duty);
  (void)pin;
#endif
}

void initOutputs() {
  if (!ENABLE_PWM_OUTPUTS) return;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  if (!ledcAttach(LED_M1, PWM_FREQ, PWM_BITS) ||
      !ledcAttach(LED_M2, PWM_FREQ, PWM_BITS)) {
    Serial.println("PWM init failed");
    while (true) delay(500);
  }
#else
  ledcSetup(LED_M1_CH, PWM_FREQ, PWM_BITS);
  ledcAttachPin(LED_M1, LED_M1_CH);
  ledcSetup(LED_M2_CH, PWM_FREQ, PWM_BITS);
  ledcAttachPin(LED_M2, LED_M2_CH);
#endif
  writeLed(LED_M1, LED_M1_CH, 0);
  writeLed(LED_M2, LED_M2_CH, 0);
}

void applyOutputs() {
  // Stopped, timed out, or not yet started: both LEDs stay off.
  const int a = running ? motor1 : 0;
  const int b = running ? motor2 : 0;
  if (!ENABLE_PWM_OUTPUTS) return;
  writeLed(LED_M1, LED_M1_CH, a);
  writeLed(LED_M2, LED_M2_CH, b);
}

void stopNow() {
  running = false;
  motor1 = motor2 = 0;
  applyOutputs();
}

void sendJson() {
  if (!bootBannerPrinted) {
    bootBannerPrinted = true;
    printBootBanner();
  }
  server.sendHeader("Cache-Control", "no-store");
  String body = "{\"connected\":true,\"running\":";
  body += running ? "true" : "false";
  body += ",\"motor1\":" + String(motor1);
  body += ",\"motor2\":" + String(motor2);
  body += ",\"uptime_ms\":" + String(millis());
  body += ",\"outputs_enabled\":";
  body += ENABLE_PWM_OUTPUTS ? "true" : "false";
  body += "}";
  server.send(200, "application/json", body);
}

void onStart() {
  // On the real machine, interlock checks belong here.
  motor1 = motor2 = 0;
  running = true;
  lastCommand = millis();
  applyOutputs();
  Serial.println("START");
  sendJson();
}

void onMotors() {
  if (!running) { server.send(409, "text/plain", "Not running"); return; }
  if (!server.hasArg("motor1") || !server.hasArg("motor2")) {
    server.send(400, "text/plain", "Missing values"); return;
  }
  const String aText = server.arg("motor1");
  const String bText = server.arg("motor2");
  // Strict integer check: no sign, decimal point, or trailing junk.
  auto valid = [](const String& s) {
    if (s.isEmpty() || s.length() > 3) return false;
    for (size_t i = 0; i < s.length(); ++i) if (!isDigit(s[i])) return false;
    return s.toInt() <= 100;
  };
  if (!valid(aText) || !valid(bText)) {
    server.send(400, "text/plain", "Invalid target"); return;
  }
  motor1 = aText.toInt();
  motor2 = bText.toInt();
  lastCommand = millis();
  applyOutputs();
  Serial.printf("M1=%d%% M2=%d%%\n", motor1, motor2);
  sendJson();
}

String mimeType(const String& path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webmanifest")) return "application/manifest+json";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

void serveStatic() {
  String path = server.uri();
  if (path.indexOf("..") >= 0 || path.startsWith("/api/")) {
    server.send(404, "text/plain", "Not found"); return;
  }
  if (path == "/") path = "/index.html";
  if (LittleFS.exists(path)) {
    File file = LittleFS.open(path, "r");
    server.streamFile(file, mimeType(path));
    file.close();
  } else if (LittleFS.exists("/index.html") && path.indexOf('.') < 0) {
    File file = LittleFS.open("/index.html", "r");
    server.streamFile(file, "text/html");
    file.close();
  } else if (path == "/index.html") {
    server.send(200, "text/html", "<h1>KK2 LED</h1><p>API ready. Upload the React build to LittleFS.</p>");
  } else {
    server.send(404, "text/plain", "Not found");
  }
}

void fillStatus(char* buf, size_t size) {
  snprintf(buf, size,
           "{\"t\":\"status\",\"running\":%s,\"a\":%d,\"b\":%d,\"pwm\":%s,\"up\":%lu}",
           running ? "true" : "false",
           motor1,
           motor2,
           ENABLE_PWM_OUTPUTS ? "true" : "false",
           millis());
}

void broadcastStatus() {
  char buf[128];
  fillStatus(buf, sizeof(buf));
  ws.broadcastTXT(buf);
  lastStatusBroadcast = millis();
}

void sendStatus(uint8_t num) {
  char buf[128];
  fillStatus(buf, sizeof(buf));
  ws.sendTXT(num, buf);
}

// Reads a 0–100 integer after a JSON key, for example "a".
bool readJsonInt(const char* json, const char* key, int& value) {
  const char* p = strstr(json, key);
  if (!p) return false;
  p += strlen(key);
  while (*p == ' ' || *p == ':') p++;
  if (!isdigit(static_cast<unsigned char>(*p))) return false;
  int v = 0;
  while (isdigit(static_cast<unsigned char>(*p))) {
    v = v * 10 + (*p - '0');
    if (v > 100) return false;
    p++;
  }
  value = v;
  return true;
}

void handleWsText(const char* body) {
  if (strstr(body, "\"t\":\"start\"")) {
    motor1 = motor2 = 0;
    running = true;
    lastCommand = millis();
    applyOutputs();
    Serial.println("START");
    broadcastStatus();
    return;
  }
  if (strstr(body, "\"t\":\"stop\"")) {
    stopNow();
    Serial.println("STOP");
    broadcastStatus();
    return;
  }
  if (!strstr(body, "\"t\":\"level\"") || !running) return;
  int a = 0;
  int b = 0;
  if (!readJsonInt(body, "\"a\"", a) || !readJsonInt(body, "\"b\"", b)) return;
  motor1 = a;
  motor2 = b;
  lastCommand = millis();
  applyOutputs();
  if (millis() - lastLevelLog > 250) {
    lastLevelLog = millis();
    Serial.printf("L1=%d%% L2=%d%%\n", motor1, motor2);
  }
}

void onWsEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsClients++;
      if (!bootBannerPrinted) {
        bootBannerPrinted = true;
        printBootBanner();
      }
      sendStatus(num);
      break;
    case WStype_DISCONNECTED:
      if (wsClients > 0) wsClients--;
      // Last page gone: turn the LEDs off now, without waiting for the one-minute timeout.
      if (wsClients == 0 && running) {
        stopNow();
        Serial.println("WS DISCONNECT: STOP");
      }
      break;
    case WStype_TEXT: {
      char tmp[96];
      const size_t n = length < sizeof(tmp) - 1 ? length : sizeof(tmp) - 1;
      memcpy(tmp, payload, n);
      tmp[n] = 0;
      handleWsText(tmp);
      break;
    }
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  initOutputs();
  stopNow();
  if (!LittleFS.begin(true)) Serial.println("LittleFS mount failed");
  WiFi.mode(WIFI_AP);
  if (!WiFi.softAP(AP_SSID, AP_PASSWORD)) {
    Serial.println("WiFi AP failed");
    while (true) delay(500);
  }
  server.on("/api/status", HTTP_GET, sendJson);
  server.on("/api/start", HTTP_POST, onStart);
  server.on("/api/motors", HTTP_POST, onMotors);
  server.on("/api/stop", HTTP_POST, []() {
    stopNow(); Serial.println("STOP"); sendJson();
  });
  server.onNotFound(serveStatic);
  server.begin();
  ws.begin();
  ws.onEvent(onWsEvent);
}

// Printed on the first API response or WebSocket connection. A boot-time print is dropped
// by USB-Serial/JTAG when no monitor is reading, and a long printf can overflow the 256-byte TX buffer.
void printBootBanner() {
  Serial.print("SSID=");
  Serial.print(AP_SSID);
  Serial.print(" IP=");
  Serial.print(WiFi.softAPIP());
  Serial.print(" outputs_enabled=");
  Serial.println(ENABLE_PWM_OUTPUTS ? "true" : "false");
}

void loop() {
  server.handleClient();
  ws.loop();
  if (running && millis() - lastCommand > CONTROL_TIMEOUT_MS) {
    stopNow();
    Serial.println("SAFETY TIMEOUT: STOP");
    broadcastStatus();
  }
  if (wsClients > 0 && millis() - lastStatusBroadcast > 1000) broadcastStatus();
  delay(2);
}
