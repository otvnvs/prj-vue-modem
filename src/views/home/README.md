# Home View Orchestrator (`/views/home/index.vue`)

## Overview
This view acts as the top-level state orchestrator and central nervous system for the Acoustic Data Modem Sandbox application. It maintains global data loops, manages physical and virtual hardware states, handles configuration lifecycles, and routes synchronous stream chunks between independent layout sub-components.

## Key Responsibilities
* **Device Drivers Lifecycles**: Initializes and controls the background audio contexts (`AudioReceiver` and `AudioSender`).
* **Sub-Component Coordination**: Distributes reactive streams, configurations, and state payloads to child modules without letting them couple with each other.
* **Stream Routing Interception**: Manages the runtime logic switch determining if data streams flow over physical air gaps or discrete virtual loopback layers.

## Shared State Architecture
* `isEngineActive`: Controls whether browser Media Streams and AudioContext loops are structurally spun up or collapsed.
* `protocolConfigs`: A dictionary tracking custom runtime configurations keyed uniquely by specific protocol identifier strings.
* `testMetrics`: Data telemetry model storing automated benchmark verification results, calculated byte errors, and Levenshtein alignment scores.

## External Sub-Utilities Used
* `runVirtualLoopback` (`/utils/modem/loopback.js`) - Drives silent memory array sample injection tickers.
* `calculateValidationResults` (`/utils/modem/diagnostics.js`) - Computes index-shift resilient string similarity metrics.

