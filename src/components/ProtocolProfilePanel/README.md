# Protocol Profile Panel Component (`/components/ProtocolProfilePanel/index.vue`)

## Overview
This component manages the selection and configuration of individual data link modulation profiles (ASK, FSK4, PSK). It abstracts the protocol choice architecture drop-downs away from the master layout view shell and wraps the nested configuration layouts.

## Features
* **Architecture Selection Safety Locks**: Integrates dropdown options to cleanly shift operational architectures. Automatically applies disabled states while a transmission is actively running on the background thread to prevent critical parameter array fracturing.
* **Dynamic Config Form Routing**: Hosts and pipes property configurations downstream directly into the dynamic layout form generator component (`ProtocolConfig`).

## Interface Contracts (API)
### Props Passed In
* `availableProtocols: Array` - Array manifest containing registered modem metadata, fields, and options maps.
* `selectedProtocol: String` - Unique tracking identifier string for the active modem profile.
* `protocolConfig: Object` - The active key-value configuration schema map currently mapped inside the engine orchestrator.
* `activeFields: Array` - Target property field schema configurations for form rendering.
* `isTransmitting: Boolean` - Active transmission state flag used to lock form adjustments.

### Events Emitted Out
* `@update:selectedProtocol` - Broadcasts underlying value mutations when standard selection options are clicked.
* `@change-protocol` - Sync boundary informing the orchestration layers to destroy the old modem instance and instantiate a new subclass block.
* `@update:protocolConfig` - Upward binding payload conveying modified form properties.

