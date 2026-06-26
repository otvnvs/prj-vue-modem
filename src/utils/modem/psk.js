// utils/modem/psk.js
import {registerModem}from"./registry.js";

export class PSKProtocol {
  constructor(config) {
    this.config = {};
    this.sampleRate = 44100; // Calibrated live by orchestrator
    this.updateRuntimeParameters(config);
    
    // Core state mechanisms for receiver carrier tracking
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
    this.sampleHistoryBuffer = [];
    this.phaseAccumulator = 0;
  }

  // Establishes default values closely tracking the amateur radio BPSK31 standard
  static getDefaultConfig() {
    return {
      baud: 31.25,
      carrierFreq: 1000 // 1 kHz standard audio carrier tone
    };
  }

  updateRuntimeParameters(newConfig) {
    this.config = {
      baud: newConfig.baud || 31.25,
      carrierFreq: newConfig.carrierFreq || 1000
    };
    this.samplesPerSymbol = this.sampleRate / this.config.baud;
  }

  // Web Audio API Transmission helper:
  // Instead of shifting pitches, we use a single frequency and shift phase parameters
  getFrequencyForBit(bit) {
    return this.config.carrierFreq;
  }

  // Pure mathematical BPSK coherent product demodulator engine
  processIncomingSamples(rawSamplesChunk, sampleRateContext, onBitDecoded) {
    this.sampleRate = sampleRateContext;
    this.samplesPerSymbol = this.sampleRate / this.config.baud;

    for (let i = 0; i < rawSamplesChunk.length; i++) {
      this.sampleHistoryBuffer.push(rawSamplesChunk[i]);
    }

    const carrierOmega = 2.0 * Math.PI * this.config.carrierFreq / this.sampleRate;

    // Process blocks when the buffer accumulates enough samples for a complete symbol duration
    while (this.sampleHistoryBuffer.length >= this.samplesPerSymbol) {
      const symbolSamples = this.sampleHistoryBuffer.slice(0, Math.floor(this.samplesPerSymbol));
      this.sampleHistoryBuffer = this.sampleHistoryBuffer.slice(Math.floor(this.samplesPerSymbol));

      let inPhaseSum = 0;
      let quadratureSum = 0;

      // Correlate incoming sample arrays against locally generated reference waves
      for (let t = 0; t < symbolSamples.length; t++) {
        const referenceAngle = carrierOmega * (t + this.phaseAccumulator);
        inPhaseSum += symbolSamples[t] * Math.cos(referenceAngle);
        quadratureSum += symbolSamples[t] * Math.sin(referenceAngle);
      }

      // Track relative internal phases relative to timing baselines
      const currentPhase = Math.atan2(quadratureSum, inPhaseSum);
      
      // Compute the magnitude profile metrics of the received block
      const signalMagnitude = Math.sqrt(inPhaseSum * inPhaseSum + quadratureSum * quadratureSum);
      
      if (signalMagnitude > 0.01) {
        // Evaluate the raw decision bit based on boundaries: 
        // Cosine is positive for 0-degree shifts, negative for 180-degree shifts
        const decisionBit = Math.cos(currentPhase) >= 0 ? 1 : 0;
        
        // Calculate log-scaled SNR metrics for live UI dashboard readouts
        const logSnr = Math.round(10 * Math.log10(signalMagnitude / 0.001));

        onBitDecoded(decisionBit, this.config.carrierFreq, logSnr);
      }

      // Step forward the internal phase wheel tracking reference timeline safely
      this.phaseAccumulator += symbolSamples.length;
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


registerModem('psk', PSKProtocol);
