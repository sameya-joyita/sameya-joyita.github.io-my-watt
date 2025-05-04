# my-watt
-sameya shajahan

## Directory Structure
```
MyWatt/
├── Sensor Module/        # Current sensing firmware and hardware files
├── Display Module/       # ESP32-S3 display firmware (JC3248W535C)
└── web dashboard/        # Web application
    └── mywatt/
        ├── frontend/     # React frontend
        └── backend/      # FastAPI backend
```
- **Sensor Module**: firmware for current sensing and data collection
- **Display Module**: ESP32-S3 based  display interface firmware
- **Web Dashboard**: Web Dashboard with FastAPI backend and React frontend

### Hardware Installation

#### Current Sensing Unit Installation
1. Locate the main live wire(s) you want to monitor in your electrical panel.
2. Open the CT (Current Transformer) clamp and place it around the live wire. Ensure it fully closes and clicks into place.
3. Connect the CT sensor to the appropriate input on the Sensor Module.
4. Mount the Sensor Module in a safe location near your electrical panel.
5. Connect the Sensor Module ESP to a power supply (5V DC).

#### Display Module Installation
1. Find a convenient location to mount the display where it's easily visible.
2. Connect the ESP32-S3 display module to a power supply (5V DC).
3. Verify the display powers on and initiates its startup sequence.
