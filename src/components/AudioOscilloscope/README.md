# Audio Oscilloscope Component (`/components/AudioOscilloscope/index.vue`)

## Overview
A hardware-accelerated visual monitoring component that renders incoming digital signal samples onto an HTML5 Canvas grid. It allows developers to visually inspect signal attributes in real time, making it easy to check for ambient acoustic noise or trace frequency shifts.

## Features
* **Dual Monitoring Modes**: 
  * `Wave (Time Domain)`: Collects 8-bit time domain data arrays to map physical continuous signal waves over a flat baseline grid.
  * `Spectrum (Frequency Domain)`: Tracks Fast Fourier Transform (FFT) frequency distribution logs, rendering a live waterfall spectrum graph that isolates the lower 40% of the audible audio spectrum.
* **Zero-Leak Animation Loop**: Uses explicit window frame hooks (`requestAnimationFrame`) wrapped inside component lifecycle destruction loops (`onBeforeUnmount`) to stop execution loops immediately when pages are changed, preventing hidden memory leaks.

## Interface Contracts (API)
### Props Passed In
* `analyserNode: Object` - A reference to an active Web Audio API native `AnalyserNode` wrapper. Renders flat baselines automatically if passed a null or uninitialized reference node.

