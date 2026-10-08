# AquaSense - Water Level Detection & Monitoring System

An interactive IoT and hardware simulation platform for real-time water level detection, automated pump relay control, multi-tank management, and Arduino/ESP8266 embedded firmware generation.

## Features
- **Visual Cross-Section Tank Simulation**: Animated fluid dynamics, fluid types (potable, rainwater, borewell), sound wave propagation from HC-SR04 ultrasonic transducer, and depth rulers.
- **Microcontroller & Sensor Telemetry**: Ultrasonic echo flight time in microseconds, DS18B20 temperature sensor, water purity / turbidity (NTU), and 3-stage hardware status LEDs.
- **Automated Pump & Relay Engine**: Configurable hysteresis thresholds for auto-refill start, auto-cutoff stop, dry-run protection lockout, and manual override.
- **Serial Monitor**: Real-time UART terminal console streaming 115200 baud telemetry frames with command dispatch (`AT+STATUS`, `RELAY=ON`, `RELAY=OFF`, `AT+PING`).
- **Embedded C++ Code Generator**: Generates complete, compilable Arduino IDE / PlatformIO sketch code tailored to selected MCU pins and tank dimensions.
- **Multi-Tank Reservoir Matrix**: Manage overhead domestic tanks, basement sumps, and agricultural reservoirs with water transfer pump routines.
- **Audio Synthesizer Alerts**: Synthesized Web Audio buzzer alarms for overflow and dry-run hazards.

## Tech Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Lucide Icons
