export * from './types/index';

export type WaterType = 'potable' | 'rainwater' | 'greywater' | 'borewell';

export interface Tank {
  id: string;
  name: string;
  location: string;
  capacityLiters: number;
  totalHeightCm: number;
  currentLevelPct: number;
  sensorType: 'ultrasonic' | 'float_switch' | 'hydrostatic';
  waterType: WaterType;
  pumpStatus: 'idle' | 'pumping_in' | 'draining';
  pumpMode: 'auto' | 'manual';
  lowThresholdPct: number;
  highThresholdPct: number;
  criticalOverflowPct: number;
  criticalLowPct: number;
  temperatureC: number;
  turbidityNTU: number;
  inflowRateLpm: number;
  outflowRateLpm: number;
  lastUpdated: number;
}

export interface TelemetryPoint {
  timestamp: string;
  levelPct: number;
  distanceCm: number;
  volumeLiters: number;
  pumpActive: boolean;
}

export interface AlertNotification {
  id: string;
  tankId: string;
  tankName: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface HardwareConfig {
  board: 'arduino_uno' | 'esp8266_nodemcu' | 'esp32';
  trigPin: number;
  echoPin: number;
  relayPin: number;
  buzzerPin: number;
  ledGreenPin: number;
  ledYellowPin: number;
  ledRedPin: number;
  wifiSsid: string;
  wifiPass: string;
  mqttBroker: string;
  mqttTopic: string;
  baudRate: number;
}
