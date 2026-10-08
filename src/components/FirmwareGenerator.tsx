import React, { useState } from 'react';
import { HardwareConfig, Tank } from '../types';
import { generateArduinoSketch } from '../utils/arduinoCodeGenerator';
import { Cpu, Copy, Check, Terminal, Share2, Layers, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/audioAlert';

interface FirmwareGeneratorProps {
  tank: Tank;
}

export const FirmwareGenerator: React.FC<FirmwareGeneratorProps> = ({ tank }) => {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<HardwareConfig>({
    board: 'esp8266_nodemcu',
    trigPin: 14, // D5 on NodeMCU
    echoPin: 12, // D6 on NodeMCU
    relayPin: 4, // D2
    buzzerPin: 5, // D1
    ledGreenPin: 13, // D7
    ledYellowPin: 15, // D8
    ledRedPin: 0, // D3
    wifiSsid: 'Home_IoT_Network',
    wifiPass: 'WaterDetect2026',
    mqttBroker: 'broker.emqx.io',
    mqttTopic: 'aquasense/tank_1/telemetry',
    baudRate: 115200,
  });

  const generatedCode = generateArduinoSketch(config, tank);

  const handleCopy = () => {
    soundManager.playBuzzer('click');
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBoardChange = (board: HardwareConfig['board']) => {
    soundManager.playBuzzer('click');
    if (board === 'arduino_uno') {
      setConfig((prev) => ({
        ...prev,
        board,
        trigPin: 9,
        echoPin: 10,
        relayPin: 7,
        buzzerPin: 8,
        ledGreenPin: 4,
        ledYellowPin: 3,
        ledRedPin: 2,
        baudRate: 9600,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        board,
        trigPin: 14,
        echoPin: 12,
        relayPin: 4,
        buzzerPin: 5,
        ledGreenPin: 13,
        ledYellowPin: 15,
        ledRedPin: 0,
        baudRate: 115200,
      }));
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Embedded Firmware Generator &amp; Pinout</h3>
            <p className="text-xs text-slate-400">
              Generate ready-to-flash C++ sketch for Arduino Uno, ESP8266 NodeMCU &amp; ESP32
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-200" /> Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy Arduino Code (.ino)
            </>
          )}
        </button>
      </div>

      {/* Hardware selection & wiring map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left: Configuration Inputs */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Board Selector */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select Target Hardware Microcontroller:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleBoardChange('esp8266_nodemcu')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all border ${
                  config.board === 'esp8266_nodemcu'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ESP8266 NodeMCU
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('esp32')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all border ${
                  config.board === 'esp32'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ESP32 DevKit
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('arduino_uno')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all border ${
                  config.board === 'arduino_uno'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Arduino Uno
              </button>
            </div>
          </div>

          {/* Pin Configuration */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> GPIO Pin Assignment
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400">HC-SR04 TRIG:</span>
                <input
                  type="number"
                  value={config.trigPin}
                  onChange={(e) => setConfig({ ...config, trigPin: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">HC-SR04 ECHO:</span>
                <input
                  type="number"
                  value={config.echoPin}
                  onChange={(e) => setConfig({ ...config, echoPin: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-cyan-300"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Pump Relay:</span>
                <input
                  type="number"
                  value={config.relayPin}
                  onChange={(e) => setConfig({ ...config, relayPin: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-amber-300"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Buzzer:</span>
                <input
                  type="number"
                  value={config.buzzerPin}
                  onChange={(e) => setConfig({ ...config, buzzerPin: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-rose-300"
                />
              </div>
            </div>
          </div>

          {/* Quick Hardware Wiring Guide */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300 block mb-1">🔌 Wiring Circuit Summary:</span>
            <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
              <li><strong className="text-slate-200">VCC</strong>: Connect to 5V power supply</li>
              <li><strong className="text-slate-200">GND</strong>: Common ground across sensor &amp; MCU</li>
              <li><strong className="text-slate-200">HC-SR04</strong>: Mount facing perpendicular to water surface</li>
              <li><strong className="text-slate-200">Relay</strong>: IN pin to Pin {config.relayPin}, NO to Pump Live Wire</li>
            </ul>
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1">
            <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                water_level_controller.ino
              </span>
              <span className="text-[11px] text-slate-500">C++ / Arduino IDE / PlatformIO</span>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/95 overflow-x-auto max-h-[460px] leading-relaxed selection:bg-cyan-500/30">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
