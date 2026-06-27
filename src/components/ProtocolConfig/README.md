# Protocol Config Component (`/components/ProtocolConfig/index.vue`)

## Overview
This component serves as a metadata-driven dynamic form engine. It automatically iterates over schema definitions provided by the active modem protocol class to build interactive configuration subpanels. This avoids hardcoding unique form markup for different modulation parameters.

## Features
* **Schema-Driven Rendering**: Loops directly over a fields metadata array to decide whether to render selection dropdowns or numerical text inputs.
* **Strict Numeric Ingestion**: Intercepts DOM inputs and explicitly wraps them in native `Number()` casting routines. This safeguards the digital signal processing (DSP) math files from encountering string concatenation bugs during runtime operations.
* **Immutable Object Tracking**: Implements an immutable update pattern by cloning and emitting modified object structures (`{...props.modelValue, [key]: value}`) to adhere strictly to Vue 3 two-way data binding principles.
* **Integrated Units Display**: Detects optional configuration metadata fields (`field.unit`) to overlay visual label metrics (e.g., `Hz`, `dB`) inside input fields without breaking alignment.

## Interface Contracts (API)
### Props Passed In
* `fields: Array` - Configuration metadata blueprint objects containing typing schemas (`select` | `number`), keys, labels, options, boundaries, and increments.
* `modelValue: Object` - A reactive configuration packet object storing key-value pairs matching the active protocol schema layout.

### Events Emitted Out
* `@update:modelValue` - Standard `v-model` change boundary broadcasting updated deep state config copies up to parent layers.

## Schema Configuration Blueprint Example
Modem protocols hook into this engine by returning a `getMetaInfo()` array structure resembling this pattern:
```javascript
static getMetaInfo() {
  return {
    fields: [
      { type: "select", key: "baud", label: "Symbols/sec", options: [{ v: 300, l: "300" }] },
      { type: "number", key: "carrierFreq", label: "Carrier Freq", min: 500, max: 3000, step: 10, unit: "Hz" }
    ]
  };
}
```

