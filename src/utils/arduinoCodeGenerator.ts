import { HardwareConfig, Tank } from '../types';

export function generateArduinoSketch(config: HardwareConfig, tank: Tank): string {
  const isEsp = config.board === 'esp8266_nodemcu' || config.board === 'esp32';

  const wifiIncludes = isEsp
    ? config.board === 'esp8266_nodemcu'
      ? `#include <ESP8266WiFi.h>\n#include <PubSubClient.h>`
      : `#include <WiFi.h>\n#include <PubSubClient.h>`
    : `// Standard Arduino without WiFi Shield (Serial Telemetry mode)`;

  return `/*
  AquaSense IoT - Automated Water Level Detection & Monitoring System
  Target Board: ${config.board.toUpperCase()}
  Sensors: HC-SR04 Ultrasonic Sensor + 5V Relay Module + Buzzer + Multi-Stage LEDs
  Tank Height: ${tank.totalHeightCm} cm | Capacity: ${tank.capacityLiters} L
*/

${wifiIncludes}

// --- Pin Definitions ---
const int TRIG_PIN = ${config.trigPin};
const int ECHO_PIN = ${config.echoPin};
const int RELAY_PIN = ${config.relayPin};     // Controls Water Pump (Active LOW or HIGH)
const int BUZZER_PIN = ${config.buzzerPin};   // Alert Buzzer
const int LED_GREEN = ${config.ledGreenPin};    // Optimal Level
const int LED_YELLOW = ${config.ledYellowPin};  // Filling / Moderate
const int LED_RED = ${config.ledRedPin};       // Critical Warning

// --- Tank Parameters ---
const float TANK_HEIGHT_CM = ${tank.totalHeightCm}.0;
const float SENSOR_OFFSET_CM = 10.0; // Distance between sensor and maximum overflow line
const float AUTO_STOP_PCT = ${tank.highThresholdPct}.0;  // Auto Cutoff High Threshold
const float AUTO_START_PCT = ${tank.lowThresholdPct}.0; // Auto Refill Low Threshold
const float OVERFLOW_PCT = ${tank.criticalOverflowPct}.0;

${isEsp ? `// --- Network & MQTT Settings ---
const char* WIFI_SSID = "${config.wifiSsid}";
const char* WIFI_PASS = "${config.wifiPass}";
const char* MQTT_SERVER = "${config.mqttBroker}";
const char* MQTT_TOPIC = "${config.mqttTopic}";

WiFiClient espClient;
PubSubClient client(espClient);
` : ''}

// State tracking
bool pumpIsActive = false;
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 1000; // 1 second

void setup() {
  Serial.begin(${config.baudRate});
  while (!Serial) { delay(10); }

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  // Default initial states
  digitalWrite(RELAY_PIN, HIGH); // Relay OFF (Active LOW typical for 5V modules)
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println(F("====================================="));
  Serial.println(F("AquaSense Water Level Controller V2.4"));
  Serial.println(F("Status: Initializing Hardware..."));
  Serial.println(F("====================================="));

  ${isEsp ? `setupWiFi();
  client.setServer(MQTT_SERVER, 1883);` : ''}
}

float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Read sound wave travel time in microseconds
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5m max range)
  if (duration == 0) {
    return -1.0; // Sensor timeout or reading error
  }
  // Speed of sound = 343 m/s = 0.0343 cm/us -> distance = (duration * 0.0343) / 2
  return (duration * 0.0343) / 2.0;
}

void loop() {
  ${isEsp ? `if (!client.connected()) { reconnectMqtt(); }
  client.loop();` : ''}

  float distance = measureDistanceCm();
  if (distance < 0) {
    Serial.println(F("[WARN] Sensor reading out of range!"));
    delay(500);
    return;
  }

  // Calculate water height and fill percentage
  float waterDepthCm = (TANK_HEIGHT_CM + SENSOR_OFFSET_CM) - distance;
  if (waterDepthCm < 0) waterDepthCm = 0;
  if (waterDepthCm > TANK_HEIGHT_CM) waterDepthCm = TANK_HEIGHT_CM;

  float levelPercentage = (waterDepthCm / TANK_HEIGHT_CM) * 100.0;
  float currentVolumeLiters = (levelPercentage / 100.0) * ${tank.capacityLiters}.0;

  // --- Automatic Pump Logic ---
  if (levelPercentage <= AUTO_START_PCT && !pumpIsActive) {
    pumpIsActive = true;
    digitalWrite(RELAY_PIN, LOW); // Turn ON pump
    Serial.println(F("[AUTO] Water below low threshold. Pump STARTED."));
  } else if (levelPercentage >= AUTO_STOP_PCT && pumpIsActive) {
    pumpIsActive = false;
    digitalWrite(RELAY_PIN, HIGH); // Turn OFF pump
    Serial.println(F("[AUTO] Tank reached full capacity. Pump STOPPED."));
  }

  // --- LED & Buzzer Alert Indicators ---
  if (levelPercentage >= OVERFLOW_PCT) {
    // Critical Overflow Alert
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, LOW);
    tone(BUZZER_PIN, 2000, 100); // Fast pulse buzzer
  } else if (levelPercentage <= ${tank.criticalLowPct}.0) {
    // Critical Low Water Alert
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, LOW);
    tone(BUZZER_PIN, 1200, 200);
  } else if (levelPercentage <= AUTO_START_PCT) {
    // Low Refill in Progress
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_GREEN, LOW);
    noTone(BUZZER_PIN);
  } else {
    // Healthy Normal Range
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, HIGH);
    noTone(BUZZER_PIN);
  }

  // --- Serial Telemetry Broadcast ---
  if (millis() - lastTelemetryMillis >= TELEMETRY_INTERVAL) {
    lastTelemetryMillis = millis();
    Serial.print(F("DATA,dist:"));
    Serial.print(distance, 1);
    Serial.print(F("cm,depth:"));
    Serial.print(waterDepthCm, 1);
    Serial.print(F("cm,pct:"));
    Serial.print(levelPercentage, 1);
    Serial.print(F("%,vol:"));
    Serial.print(currentVolumeLiters, 0);
    Serial.print(F("L,pump:"));
    Serial.println(pumpIsActive ? F("ON") : F("OFF"));

    ${isEsp ? `char payload[128];
    snprintf(payload, sizeof(payload), "{\\"level\\":%.1f,\\"volume\\":%.0f,\\"pump\\":%s}",
             levelPercentage, currentVolumeLiters, pumpIsActive ? "true" : "false");
    client.publish(MQTT_TOPIC, payload);` : ''}
  }

  delay(200);
}

${isEsp ? `void setupWiFi() {
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println(F("\\nWiFi Connected. IP: "));
  Serial.println(WiFi.localIP());
}

void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print(F("Attempting MQTT connection..."));
    if (client.connect("AquaSenseNodeClient")) {
      Serial.println(F("connected"));
    } else {
      Serial.print(F("failed, rc="));
      Serial.print(client.state());
      Serial.println(F(" try again in 5 seconds"));
      delay(5000);
    }
  }
}
` : ''}
`;
}
