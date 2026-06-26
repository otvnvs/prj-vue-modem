// utils/modem/fsk4.js
import { registerModem } from './registry.js';

export default class FSK4Protocol {
  constructor(config) {
    this.config = {};
    this.sampleRate = 44100; // Updated live by orchestration tracking loops
    this.updateRuntimeParameters(config);

    this.samplesPerSymbol = this.sampleRate / this.config.baud;
    this.sampleHistoryBuffer = [];
  }

  // Schema manifest consumed automatically by ProtocolConfig.vue
  static getMetaInfo() {
    return {
      displayName: "FSK-4 (4-Frequency Multi-Tone Shift Keying)",
      fields: [
        { type: "select", key: "baud", label: "Baud Rate (Symbols/sec)", options: [{ v: 300, l: "300 (Stable)" }, { v: 600, l: "600 (Fast)" }] },
        { type: "number", key: "baseFreq", label: "Base Anchor Frequency (Tone 0)", min: 500, max: 2500, step: 100, unit: "Hz" },
        { type: "number", key: "spacing", label: "Tone Frequency Spacing Offset", min: 50, max: 500, step: 25, unit: "Hz" },
        { type: "number", key: "squelchDb", label: "Noise Squelch Gate Floor", min: 0, max: 50, step: 1, unit: "dB" }
      ]
    };
  }

  static getDefaultConfig() {
    return {
      baud: 300,
      baseFreq: 1000,
      spacing: 200, // Tones will sit at 1000Hz, 1200Hz, 1400Hz, 1600Hz
      squelchDb: 10
    };
  }

  updateRuntimeParameters(newConfig) {
    this.config = {
      baud: newConfig.baud || 300,
      baseFreq: newConfig.baseFreq || 1000,
      spacing: newConfig.spacing || 200,
      squelchDb: newConfig.squelchDb !== undefined ? newConfig.squelchDb : 10
    };
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
  }

  /**
   * Serializer Hook used by utils/sender.js
   * Converts a single 1 or 0 bit into frequencies.
   * NOTE: The default sender.js streams bits sequentially. For an M-FSK multi-bit modem,
   * we intercept the stream or interpret consecutive bits to resolve the symbol tone.
   */
  getFrequencyForBit(bit) {
    // Fallback logic to protect baseline single-bit sender iteration paths
    return bit === 1 ? this.config.baseFreq + this.config.spacing : this.config.baseFreq;
  }

  // Pure mathematical Goertzel execution routing targeting specific pitch positions
  computeGoertzelPower(samples, targetFrequency) {
    const numSamples = samples.length;
    const normalizedFrequency = targetFrequency / this.sampleRate;
    const coefficient = 2.0 * Math.cos(2.0 * Math.PI * normalizedFrequency);

    let sPrev = 0.0;
    let sPrev2 = 0.0;

    for (let i = 0; i < numSamples; i++) {
      const s = samples[i] + coefficient * sPrev - sPrev2;
      sPrev2 = sPrev;
      sPrev = s;
    }

    return sPrev * sPrev + sPrev2 * sPrev2 - coefficient * sPrev * sPrev2;
  }

  // Demodulates sample frames by determining the dominant signal tone out of 4 bands
  processIncomingSamples(rawSamplesChunk, sampleRateContext, onBitDecoded) {
    this.sampleRate = sampleRateContext;
    this.samplesPerSymbol = this.sampleRate / this.config.baud;

    for (let i = 0; i < rawSamplesChunk.length; i++) {
      this.sampleHistoryBuffer.push(rawSamplesChunk[i]);
    }

    // Map out our four distinct target frequency channels
    const tones = [
      this.config.baseFreq,
      this.config.baseFreq + this.config.spacing,
      this.config.baseFreq + (this.config.spacing * 2),
      this.config.baseFreq + (this.config.spacing * 3)
    ];

    while (this.sampleHistoryBuffer.length >= this.samplesPerSymbol) {
      const symbolSamples = this.sampleHistoryBuffer.slice(0, Math.floor(this.samplesPerSymbol));
      this.sampleHistoryBuffer = this.sampleHistoryBuffer.slice(Math.floor(this.samplesPerSymbol));

      // Calculate relative energy values across all four channels simultaneously
      const powers = tones.map(t => this.computeGoertzelPower(symbolSamples, t));
      
      // Find the maximum power index
      let maxPowerIdx = 0;
      let maxPowerVal = powers[0];
      let backgroundNoiseFloorSum = 0;

      for (let i = 0; i < powers.length; i++) {
        backgroundNoiseFloorSum += powers[i];
        if (powers[i] > maxPowerVal) {
          maxPowerVal = powers[i];
          maxPowerIdx = i;
        }
      }

      // Calculate approximate signal SNR relative to adjacent tracking channels
      const averageNoiseFloor = (backgroundNoiseFloorSum - maxPowerVal) / 3;
      const currentSnr = Math.round(10 * Math.log10(maxPowerVal / (averageNoiseFloor + 1e-6)));

      // SQUELCH GATE EVALUATION:
      if (currentSnr < this.config.squelchDb || maxPowerVal < 0.005) {
        continue;
      }

      // Deconstruct the targeted symbol index back down into 2 distinct binary bits
      // Index 0 (00) -> Bit 0, Bit 0
      // Index 1 (01) -> Bit 0, Bit 1
      // Index 2 (10) -> Bit 1, Bit 0
      // Index 3 (11) -> Bit 1, Bit 1
      const bit1 = (maxPowerIdx >> 1) & 1;
      const bit0 = maxPowerIdx & 1;

      // Fire individual bit sequence callback executions back up to the frame orchestrator
      onBitDecoded(bit1, tones[maxPowerIdx], currentSnr);
      onBitDecoded(bit0, tones[maxPowerIdx], currentSnr);
    }
  }
}

// REGISTER PLUGIN AUTOMATICALLY
registerModem('fsk4', FSK4Protocol);
