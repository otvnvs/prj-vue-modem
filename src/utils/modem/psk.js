// utils/modem/afsk.js
import {registerModem}from"./registry.js";
export class AFSKProtocol {
  constructor(config) {
    this.config = {};
    this.sampleRate = 44100; // Updated dynamically by the orchestrator loop
    this.updateRuntimeParameters(config);
    
    // Core bit tracking and clock state parameters
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
    this.sampleHistoryBuffer = [];
  }

  static getDefaultConfig() {
    return {
      baud: 1200,
      freqMark: 1200,  // Binary 1
      freqSpace: 2200  // Binary 0
    };
  }

  updateRuntimeParameters(newConfig) {
    this.config = {
      baud: newConfig.baud || 1200,
      freqMark: newConfig.freqMark || 1200,
      freqSpace: newConfig.freqSpace || 2200
    };
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
  }

  getFrequencyForBit(bit) {
    return bit === 1 ? this.config.freqMark : this.config.freqSpace;
  }

  // Pure mathematical Goertzel calculation routine targeting specific tones
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

    // Return the absolute mathematical power magnitude of the target tone
    return sPrev * sPrev + sPrev2 * sPrev2 - coefficient * sPrev * sPrev2;
  }

  // Decodes incoming chunks of audio samples and extracts binary bits
  processIncomingSamples(rawSamplesChunk, sampleRateContext, onBitDecoded) {
    this.sampleRate = sampleRateContext;
    this.samplesPerSymbol = this.sampleRate / this.config.baud;

    // Append new sample data to the rolling historical buffer
    for (let i = 0; i < rawSamplesChunk.length; i++) {
      this.sampleHistoryBuffer.push(rawSamplesChunk[i]);
    }

    // Process blocks when the buffer accumulates enough samples for a complete symbol
    while (this.sampleHistoryBuffer.length >= this.samplesPerSymbol) {
      const symbolSamples = this.sampleHistoryBuffer.slice(0, Math.floor(this.samplesPerSymbol));
      this.sampleHistoryBuffer = this.sampleHistoryBuffer.slice(Math.floor(this.samplesPerSymbol));

      // Calculate the power of both configured frequencies
      const markPower = this.computeGoertzelPower(symbolSamples, this.config.freqMark);
      const spacePower = this.computeGoertzelPower(symbolSamples, this.config.freqSpace);

      // Simple threshold comparator: the strongest tone wins the bit assignment
      if (markPower > spacePower && markPower > 0.005) {
        onBitDecoded(1, this.config.freqMark, Math.round(10 * Math.log10(markPower / (spacePower + 1e-6))));
      } else if (spacePower > markPower && spacePower > 0.005) {
        onBitDecoded(0, this.config.freqSpace, Math.round(10 * Math.log10(spacePower / (markPower + 1e-6))));
      }
    }
  }
  static getMetaInfo() {
  return {
    displayName: "PSK (Phase Shift Keying)",
    fields: [
      { type: "select", key: "baud", label: "Baud Rate (Symbols/sec)", options: [{ v: 31.25, l: "31.25 (BPSK31)" }, { v: 62.5, l: "62.50" }] },
      { type: "number", key: "carrierFreq", label: "Carrier Frequency", min: 500, max: 3000, step: 100, unit: "Hz" },
      // NEW: Dynamic UI binding to inject the squelch limiter slider automatically
      { type: "number", key: "squelchDb", label: "Noise Squelch Gate Floor", min: 0, max: 50, step: 1, unit: "dB" }
    ]
  };
}

static getDefaultConfig() {
  return { baud: 31.25, carrierFreq: 1000, squelchDb: 8 }; // PSK handles tight conditions down to 8dB
}
}
registerModem('afsk', AFSKProtocol);
