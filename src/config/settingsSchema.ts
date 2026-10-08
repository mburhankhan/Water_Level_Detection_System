// Schema-driven device settings definition
// The Settings UI, validation, defaults and "Reset to default" are generated from here.

export type SettingType = 'number' | 'boolean' | 'radio';
export type SettingScope = 'pipeline' | 'pump';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDefinition {
  id: string;
  scope: SettingScope;
  group: string;
  label: string;
  help: string;
  type: SettingType;
  unit?: string;
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: SettingOption[];
  adminOnly?: boolean;
}

export const SETTINGS_SCHEMA: SettingDefinition[] = [
  // --- Pipeline Settings ---
  {
    id: 'confirmAvailableSec',
    scope: 'pipeline',
    group: 'Water Detection',
    label: 'Confirmation window: Water Available',
    help: 'Sensor must detect water continuously for this long before declaring AVAILABLE to filter out pipeline air pockets or splashes.',
    type: 'number',
    unit: 's',
    default: 30,
    min: 5,
    max: 600,
    step: 5,
    adminOnly: true,
  },
  {
    id: 'confirmFinishedSec',
    scope: 'pipeline',
    group: 'Water Detection',
    label: 'Confirmation window: Water Finished',
    help: 'Sensor must detect no water continuously for this long before declaring FINISHED to avoid false finishes on momentary pressure drops.',
    type: 'number',
    unit: 's',
    default: 180,
    min: 10,
    max: 1800,
    step: 10,
    adminOnly: true,
  },
  {
    id: 'floatMeaning',
    scope: 'pipeline',
    group: 'Hardware Interface',
    label: 'Float Switch Polarity',
    help: 'Electrical contact state that corresponds to water presence in the pipeline sensor chamber.',
    type: 'radio',
    default: 'closed_is_water',
    options: [
      { value: 'closed_is_water', label: 'Closed circuit = Water present' },
      { value: 'open_is_water', label: 'Open circuit = Water present' },
    ],
    adminOnly: true,
  },
  {
    id: 'heartbeatSec',
    scope: 'pipeline',
    group: 'Telemetry & Connectivity',
    label: 'Heartbeat ping interval',
    help: 'How frequently the ESP32 updates its /status/lastSeen timestamp in the database.',
    type: 'number',
    unit: 's',
    default: 60,
    min: 15,
    max: 600,
    step: 5,
    adminOnly: true,
  },
  {
    id: 'offlineAfterSec',
    scope: 'pipeline',
    group: 'Telemetry & Connectivity',
    label: 'Offline detection timeout',
    help: 'If no heartbeat is received after this elapsed duration, the app marks the device OFFLINE.',
    type: 'number',
    unit: 's',
    default: 180,
    min: 60,
    max: 3600,
    step: 10,
    adminOnly: true,
  },
  {
    id: 'settingsPollSec',
    scope: 'pipeline',
    group: 'Telemetry & Connectivity',
    label: 'Settings sync check interval',
    help: 'How often the device checks for updated configuration values.',
    type: 'number',
    unit: 's',
    default: 60,
    min: 15,
    max: 900,
    step: 5,
    adminOnly: true,
  },
  {
    id: 'historyMaxPeriods',
    scope: 'pipeline',
    group: 'Storage & Retention',
    label: 'Maximum retained periods',
    help: 'Cap on historic water availability period records stored on the device / queried.',
    type: 'number',
    default: 1000,
    min: 100,
    max: 5000,
    step: 50,
    adminOnly: true,
  },

  // --- Pump Settings (Phase 2 stub, hidden) ---
  {
    id: 'pumpMode',
    scope: 'pump',
    group: 'Pump Mode',
    label: 'Pump Operation Mode',
    help: 'Select operational mode for the water pump controller.',
    type: 'radio',
    default: 'OFF',
    options: [
      { value: 'OFF', label: 'Disabled / OFF' },
      { value: 'MANUAL', label: 'Manual Run' },
      { value: 'AUTO', label: 'Auto (Start when water available)' },
    ],
    adminOnly: true,
  },
  {
    id: 'maxRunMin',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Maximum continuous run duration',
    help: 'Safety shutoff timer to protect pump from overheating.',
    type: 'number',
    unit: 'min',
    default: 10,
    min: 1,
    max: 120,
    step: 1,
    adminOnly: true,
  },
  {
    id: 'minRestMin',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Minimum motor rest duration',
    help: 'Enforced cooling time between successive pump cycles.',
    type: 'number',
    unit: 'min',
    default: 10,
    min: 1,
    max: 240,
    step: 1,
    adminOnly: true,
  },
  {
    id: 'tankFullRestartDelayMin',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Tank full restart delay',
    help: 'Delay after tank float indicates full before allowing re-engagement.',
    type: 'number',
    unit: 'min',
    default: 10,
    min: 0,
    max: 240,
    step: 1,
    adminOnly: true,
  },
  {
    id: 'startDelayAfterPowerSec',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Power recovery start delay',
    help: 'Wait time before starting pump following grid power restoration.',
    type: 'number',
    unit: 's',
    default: 120,
    min: 0,
    max: 900,
    step: 10,
    adminOnly: true,
  },
  {
    id: 'commandExpirySec',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Command execution expiry',
    help: 'Commands not acknowledged within this window will be rejected.',
    type: 'number',
    unit: 's',
    default: 120,
    min: 30,
    max: 600,
    step: 10,
    adminOnly: true,
  },
  {
    id: 'tankFloatMeaning',
    scope: 'pump',
    group: 'Hardware Interface',
    label: 'Rooftop Tank Float Polarity',
    help: 'Electrical state signaling full tank condition.',
    type: 'radio',
    default: 'closed_is_full',
    options: [
      { value: 'closed_is_full', label: 'Closed circuit = Tank full' },
      { value: 'open_is_full', label: 'Open circuit = Tank full' },
    ],
    adminOnly: true,
  },
  {
    id: 'stopOnConnectionLoss',
    scope: 'pump',
    group: 'Safety Limits',
    label: 'Halt pump if Wi-Fi / connection drops',
    help: 'Failsafe to turn off pump relay if communication with Firebase is lost.',
    type: 'boolean',
    default: true,
    adminOnly: true,
  },
];

export function getSettingsByScope(scope: SettingScope): SettingDefinition[] {
  return SETTINGS_SCHEMA.filter((s) => s.scope === scope);
}

export function getDefaultSettings(scope: SettingScope): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const s of SETTINGS_SCHEMA) {
    if (s.scope === scope) {
      result[s.id] = s.default;
    }
  }
  return result;
}

export function validateSettingValue(def: SettingDefinition, val: unknown): { valid: boolean; error?: string } {
  if (def.type === 'number') {
    const num = Number(val);
    if (isNaN(num)) return { valid: false, error: 'Must be a valid number' };
    if (def.min !== undefined && num < def.min) return { valid: false, error: `Minimum value is ${def.min}` };
    if (def.max !== undefined && num > def.max) return { valid: false, error: `Maximum value is ${def.max}` };
    return { valid: true };
  }
  if (def.type === 'boolean') {
    if (typeof val !== 'boolean') return { valid: false, error: 'Must be true or false' };
    return { valid: true };
  }
  if (def.type === 'radio' && def.options) {
    const valid = def.options.some((opt) => opt.value === val);
    if (!valid) return { valid: false, error: 'Invalid selection option' };
    return { valid: true };
  }
  return { valid: true };
}
