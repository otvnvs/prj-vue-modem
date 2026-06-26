// utils/modem/ask.js
import { registerModem } from './registry.js';

export default class ASKProtocol {
  constructor(config) {
    this.config = {};
    this.sampleRate = 44100; // Calibrated live by orchestrator
    this.updateRuntimeParameters(config);

    this.samplesPerSymbol = this.sampleRate / this.config.baud;
    this.sampleHistoryBuffer = [];
  }

  // Meta information consumed by the dynamic configuration form renderer
  static getMetaInfo() {
    return {
      displayName: "ASK (Amplitude Shift Keying / OOK)",
      fields: [
        { type: "select", key: "baud", label: "Baud Rate (bps)", options: [{ v: 300, l: "300 (Stable)" }, { v: 600, l: "600 (Medium)" }] },
        { type: "number", key: "carrierFreq", label: "Carrier Frequency", min: 500, max: 3000, step: 100, unit: "Hz" },
        { type: "number", key: "squelchDb", label: "Noise Squelch Gate Floor", min: 0, max: 50, step: 1, unit: "dB" }
      ]
    };
  }

  static getDefaultConfig() {
    return {
      baud: 300,
      carrierFreq: 1500, // 1.5 kHz carrier wave pitch
      squelchDb: 10
    };
  }

  updateRuntimeParameters(newConfig) {
    this.config = {
      baud: newConfig.baud || 300,
      carrierFreq: newConfig.carrierFreq || 1500,
      squelchDb: newConfig.squelchDb !== undefined ? newConfig.squelchDb : 10
    };
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
  }

  // Used by utils/sender.js to fetch transmission frequencies
  getFrequencyForBit(bit) {
    // Note: The baseline sender node handles continuous audio streams.
    // To cleanly modulate amplitude over standard oscillators, if a bit is 0,
    // we return a supersonic pitch out-of-band (e.g. 21kHz) that falls safely 
    // into low-pass hardware filters, behaving effectively as a muted output.
    return bit === 1 ? this.config.carrierFreq : 21000;
  }

  // Pure mathematical Goertzel calculation targeting the single carrier tone
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

  // Decodes incoming chunks of raw audio samples by reading power variations
  processIncomingSamples(rawSamplesChunk, sampleRateContext, onBitDecoded) {
    this.sampleRate = sampleRateContext;
    this.samplesPerSymbol = this.sampleRate / this.config.baud;

    for (let i = 0; i < rawSamplesChunk.length; i++) {
      this.sampleHistoryBuffer.push(rawSamplesChunk[i]);
    }

    while (this.sampleHistoryBuffer.length >= this.samplesPerSymbol) {
      const symbolSamples = this.sampleHistoryBuffer.slice(0, Math.floor(this.samplesPerSymbol));
      this.sampleHistoryBuffer = this.sampleHistoryBuffer.slice(Math.floor(this.samplesPerSymbol));

      // Calculate the absolute power of the target carrier pitch
      const carrierPower = this.computeGoertzelPower(symbolSamples, this.config.carrierFreq);
      
      // Calculate signal metrics relative to a fixed baseline noise expectation (1e-5)
      const currentSnr = Math.round(10 * Math.log10(carrierPower / 1e-5));

      // 1. SQUELCH GATE EVALUATION:
      // If the channel energy falls below the noise gate floor, output nothing (line is idle)
      if (currentSnr < this.config.squelchDb) {
        continue;
      }

      // 2. DECISION LOGIC:
      // If the carrier energy is strong, it's a logical 1. If it's a weak signal, it's a logical 0.
      const decisionBit = carrierPower > 0.008 ? 1 : 0;
      
      onBitDecoded(decisionBit, this.config.carrierFreq, currentSnr);
    }
  }
}

// REGISTER WITH SYSTEM INTERFACE INSTANTLY UPON EVALUATION
registerModem('ask', ASKProtocol);
