// utils/modem/index.js

// Simply import your custom protocol files here to execute their self-registration scripts
import './psk.js';
import './ask.js';
import './fsk4.js';




// To add a new protocol tomorrow, you ONLY add its import path line here:
// import './ask.js';

import { globalModemRegistry } from './registry.js';

export class ModemOrchestrator {
  constructor() {
    this.activeProtocol = null;
    this.currentProtocolName = '';
    this.config = {};
	
    // UART Frame State Machine variables
    this.rxState = 'IDLE'; // States: 'IDLE', 'DATA', 'STOP'
    this.bitAccumulator = [];
    
    this.listeners = { onDataReceived: null, onStateChanged: null, onDebugUpdated: null };
  }

  // Reads data from the self-registered catalog
  getAvailableProtocols() {
    const manifest = [];
    globalModemRegistry.forEach((protocolClass, name) => {
      manifest.push({
        id: name,
        displayName: protocolClass.getMetaInfo().displayName,
        defaultConfig: protocolClass.getDefaultConfig(),
        fields: protocolClass.getMetaInfo().fields
      });
    });
    return manifest;
  }

  setProtocol(name, customConfig = {}) {
    const id = name.toLowerCase();
    if (!globalModemRegistry.has(id)) {
      throw new Error(`Protocol "${name}" is not registered in the global catalog.`);
    }

    this.currentProtocolName = id;
    const ProtocolClass = globalModemRegistry.get(id);
    
    this.config = { ...ProtocolClass.getDefaultConfig(), ...customConfig };
    this.activeProtocol = new ProtocolClass(this.config);
    this.bitAccumulator = [];

    this.notifyDebug({ mode: 'IDLE', freqLock: 0, signalQuality: 0 });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.activeProtocol) {
      this.activeProtocol.updateRuntimeParameters(this.config);
    }
  }

  ingestIncomingAudioSamples(rawSamples, sampleRate) {
    if (!this.activeProtocol || !this.activeProtocol.processIncomingSamples) return;

    this.activeProtocol.processIncomingSamples(rawSamples, sampleRate, (decodedBit, targetFreq, measuredSnr) => {
      this.notifyDebug({ mode: 'RECEIVING', freqLock: targetFreq, signalQuality: measuredSnr });
      this.handleIncomingBit(decodedBit);
    });
  }

  handleIncomingBit(bit) {
    this.bitAccumulator.push(bit);
    if (this.bitAccumulator.length === 8) {
      let byteValue = 0;
      for (let i = 0; i < 8; i++) byteValue |= (this.bitAccumulator[i] << (7 - i));
      const decodedChar = String.fromCharCode(byteValue);
      if (this.listeners.onDataReceived) this.listeners.onDataReceived(decodedChar);
      this.bitAccumulator = [];
    }
  }
  
   ingestIncomingAudioSamples(rawSamples, sampleRate) {
    if (!this.activeProtocol || !this.activeProtocol.processIncomingSamples) return;

    this.activeProtocol.processIncomingSamples(rawSamples, sampleRate, (decodedBit, targetFreq, measuredSnr) => {
      this.notifyDebug({
        mode: this.rxState === 'IDLE' ? 'LISTENING / IDLE' : 'RECEIVING',
        freqLock: targetFreq,
        signalQuality: measuredSnr
      });
      
      // Process the bit through the UART State Machine
      this.handleIncomingFramedBit(decodedBit);
    });
  }
  
  
 handleIncomingFramedBit(bit) {
    switch (this.rxState) {
      case 'IDLE':
        // A Start Bit must be a logical 0. If found, wake up the data sync clock
        if (bit === 0) {
          this.rxState = 'DATA';
          this.bitAccumulator = [];
        }
        break;

      case 'DATA':
        this.bitAccumulator.push(bit);
        
        // Once we have accumulated the 8 payload bits, step to the Stop verification state
        if (this.bitAccumulator.length === 8) {
          this.rxState = 'STOP';
        }
        break;

      case 'STOP':
        // A Stop Bit must be a logical 1 to confirm frame alignment validity
        if (bit === 1) {
          let byteValue = 0;
          
          // Reconstruct data byte from accumulated bits (Read LSB first to match sender mapping)
          for (let i = 0; i < 8; i++) {
            if (this.bitAccumulator[i] === 1) {
              byteValue |= (1 << i);
            }
          }

          const decodedChar = String.fromCharCode(byteValue);
          if (this.listeners.onDataReceived) {
            this.listeners.onDataReceived(decodedChar);
          }
        } else {
          console.warn("UART Framing Error: Expected stop bit '1', but captured '0'. Frame discarded.");
        }
        
        // Reset state machine back to IDLE, ready to look for the next character's start bit
        this.rxState = 'IDLE';
        break;
    }
  }

  onData(callback) { this.listeners.onDataReceived = callback; }
  onState(callback) { this.listeners.onStateChanged = callback; }
  onDebug(callback) { this.listeners.onDebugUpdated = callback; }
  notifyDebug(metrics) { if (this.listeners.onDebugUpdated) this.listeners.onDebugUpdated(metrics); }
}
