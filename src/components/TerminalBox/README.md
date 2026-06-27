# Terminal Box Component (`/components/TerminalBox/index.vue`)

## Overview
A dual-mode, re-usable text workspace cell configured as either an input character transmitter (TX) or a rolling historic log receiver (RX) for raw text streams.

## Features
* **Context-Driven View Switching**: Swaps seamlessly between an active, event-trapped `<textarea>` wrapper (TX Mode) and a read-only, layout-scrolling text history display window (RX Mode).
* **Automatic Layout Autoscrolling**: Monitors incoming character strings via deep Vue watchers, firing layout lifecycle calculations (`nextTick`) to automatically force the log scrollbar down to match incoming text.
* **Typing Interceptor Shortcuts**: Intercepts Enter keystrokes (`@keydown.enter.prevent`) to allow rapid transmissions without clicking the mouse.

## Interface Contracts (API)
### Props Passed In
* `title: String` - Descriptive header label printed onto the top-left title bar.
* `mode: String` - Strict verification enum value (`tx` or `rx`) enforcing separate layout configurations.
* `streamData: String` - Incoming log text bound directly to the output wrapper window when in RX mode.

### Events Emitted Out
* `@send` - Fires the collected text string buffer upward for packet serialization routines.

