# Modem Control Panel Component (`/components/ModemControlPanel/index.vue`)

## Overview
This component encapsulates the physical layout, button bindings, and telemetry indicators tracking the hardware modem state. It provides direct interactive controls to turn on the core engine, manipulate debugging flags, and execute automated signal validation routines.

## Features
* **Engine Power Toggle**: Dispatches hardware driver request boundaries to activate or deactivate browser audio layers.
* **Virtual Loopback Controls**: Custom-themed interactive check toggle allowing users to isolate digital logic by blocking hardware components. Includes speed mode sub-selection (`realtime` vs `instant`).
* **Telemetry Feed Readout**: Real-time numerical display grid rendering carrier lock frequencies and live Signal-to-Noise Ratio (SNR) dB levels.
* **Verification Metrics Display**: A contextual diagnostic wrapper card that dynamically adjustments its glowing border coloring rules (`passed`=green, `failed`=red, `running`=blue) depending on algorithmic test suite performance.

## Interface Contracts (API)
### Props Passed In
* `isEngineActive: Boolean` - Parent hardware initialization status.
* `engineState: String` - Decoupled mode label text string (`LISTENING / IDLE`, `TRANSMITTING`, `RECEIVING`).
* `debugMetrics: Object` - Object packet passing in `lockFreq` and `snr` properties.
* `isLoopbackMode: Boolean` - Flag mapping if physical streams are routed internally.
* `loopbackSpeed: String` - Configured speed mode selector value.
* `isTestingModeActive: Boolean` - Test runner state flag.
* `testMetrics: Object` - Matrix calculation payload tracker.

### Events Emitted Out
* `@toggle-engine` - Signal boundary to instantiate or kill hardware loops.
* `@update:isLoopbackMode` - Emits state change value for checkbox mutations.
* `@update:loopbackSpeed` - Emits configuration strings for testing timelines.
* `@run-test` - Fire trigger initiating the pseudo-random benchmark payload stream.

