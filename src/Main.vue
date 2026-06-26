<!-- src/main.vue or src/App.vue -->
<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1>Acoustic Data Modem Sandbox</h1>
        <span class="engine-indicator" :class="{ running: isEngineActive }">
          ● Engine {{ isEngineActive ? 'ON' : 'OFF' }}
        </span>
      </div>
    </header>

    <main class="grid-layout">
      <!-- Left Column: Controls & Dynamic Configuration Panels -->
      <div class="control-sidebar">
        
        <!-- Section: Modem Hardware Engine Controls -->
        <section class="card control-panel">
          <h2>Modem Control</h2>
          <div class="control-row">
            <button 
              :class="['power-btn', isEngineActive ? 'active-stop' : 'active-start']"
              @click="handleToggleEngine"
            >
              {{ isEngineActive ? 'STOP MODEM ENGINE' : 'START MODEM ENGINE' }}
            </button>
            <div class="status-badge" :data-status="engineState">
              STATUS: {{ engineState }}
            </div>
          </div>

          <div class="telemetry-readout">
            <div class="data-field">
              <span class="label">Lock Frequency:</span>
              <span class="value">{{ debugMetrics.lockFreq }} Hz</span>
            </div>
            <div class="data-field">
              <span class="label">Signal Quality:</span>
              <span class="value">{{ debugMetrics.snr }} dB</span>
            </div>
          </div>
        </section>

        <!-- Section: Protocol Selection & Parameters -->
        <section class="card protocol-selection-panel">
          <h2>Protocol Profile</h2>
          <div class="input-group select-group">
            <label>Selected Architecture</label>
      <select v-model="selectedProtocol" @change="handleProtocolChange" :disabled="senderInstance?.isRunning">
    <!-- Automated loop builds select box items from metadata -->
    <option v-for="proto in availableProtocols" :key="proto.id" :value="proto.id">
      {{ proto.displayName }}
    </option>
  </select>
          </div>
          
  <!-- Dynamic Injection Form Configuration View -->
<ProtocolConfig 
  :fields="activeFields" 
  v-model="protocolConfigs[selectedProtocol]" 
/>
        </section>
        
      </div>

      <!-- Right Column: Visualizer Monitors & Alphanumeric Message Logs -->
      <div class="display-workspace">
        
        <!-- Audio Oscilloscope Viewport Component -->
        <section class="card graphics-panel">
          <AudioOscilloscope :analyserNode="sharedAnalyser" />
        </section>

        <!-- Twin Text Transmission and Logging Terminal Arrays -->
        <div class="terminal-grid">
          <TerminalBox 
            title="Transmit Terminal Buffer" 
            mode="tx" 
            @send="handleOutputTransmission" 
          />
          <TerminalBox 
            title="Incoming Message Stream" 
            mode="rx" 
            :streamData="rxStreamBuffer" 
          />
        </div>
        
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

// Import core logic modules
import { AudioReceiver } from './utils/receiver.js';
import { AudioSender } from './utils/sender.js';
import { ModemOrchestrator } from './utils/modem/index.js';

// Import graphical components
import AudioOscilloscope from './components/AudioOscilloscope.vue';
import ProtocolConfig from './components/ProtocolConfig.vue';
import TerminalBox from './components/TerminalBox.vue';

// --- REACTIVE STATE DECK ---
const isEngineActive = ref(false);
const sharedAnalyser = ref(null);
const rxStreamBuffer = ref('');
const debugMetrics = ref({ mode: 'OFFLINE', lockFreq: 0, snr: 0 });

// Dynamic Discovery Lists & Settings Cache Mapping
const availableProtocols = ref([]);
const selectedProtocol = ref('');
const protocolConfigs = ref({});

// --- ENGINE SYSTEM CORE INSTANCES ---
const orchestrator = new ModemOrchestrator();
const receiverInstance = new AudioReceiver();
const senderInstance = new AudioSender();

// --- COMPUTED ARCHITECTURE ENGINE ---

// Automatically returns the exact fields requested by the active protocol manifest
const activeFields = computed(() => {
  const current = availableProtocols.value.find(p => p.id === selectedProtocol.value);
  return current ? current.fields : [];
});

const engineState = computed(() => {
  if (!isEngineActive.value) return 'OFFLINE';
  return debugMetrics.value.mode;
});

// --- CORE LIFE CYCLE HOOKS ---

onMounted(() => {
  // 1. Register operational sub-modules with the orchestration engine
  //orchestrator.registerProtocol('afsk', AFSKProtocol);
  //orchestrator.registerProtocol('psk', PSKProtocol);

  // 2. Discover available protocols dynamically to avoid manual UI building
  availableProtocols.value = orchestrator.getAvailableProtocols();
  
  // 3. Extract default config schemas out of our discovered manifest registry
  if (availableProtocols.value.length > 0) {
    selectedProtocol.value = availableProtocols.value[0].id;
    
    availableProtocols.value.forEach(proto => {
      protocolConfigs.value[proto.id] = proto.defaultConfig;
    });
    
    // Set fallback instance
    orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
  }

  // 4. Wire telemetry data updates back to the UI parameters
  orchestrator.onDebug((metrics) => {
    debugMetrics.value.lockFreq = metrics.freqLock;
    debugMetrics.value.snr = metrics.signalQuality;
    
    // Prevent background receiver routines from writing over a transmission mode state lock
    if (debugMetrics.value.mode !== 'TRANSMITTING') {
      debugMetrics.value.mode = metrics.mode;
    }
  });

  // 5. Direct incoming parsed characters straight into terminal logs
  orchestrator.onData((character) => {
    rxStreamBuffer.value += character;
  });
});

// --- DYNAMIC PARAMETERS SYNC DECK ---

// Deep watch options allow hot-swapping form parameter mutations live inside classes
watch(() => protocolConfigs.value[selectedProtocol.value], (newSettings) => {
  if (newSettings) {
    orchestrator.updateConfig(newSettings);
  }
}, { deep: true });

// --- INTERACTIVE ACTION DISPATCHERS ---

const handleProtocolChange = () => {
  if (selectedProtocol.value) {
    orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
  }
};

const handleToggleEngine = async () => {
  if (!isEngineActive.value) {
    try {
      // Connect background hardware worklet sample delivery arrays right to the orchestrator layer
      const activeAnalyser = await receiverInstance.start((audioSamplesChunk) => {
        orchestrator.ingestIncomingAudioSamples(
          audioSamplesChunk, 
          receiverInstance.audioContext.sampleRate
        );
      });
      
      sharedAnalyser.value = activeAnalyser;
      
      // Share exact hardware audio context timelines down to eliminate phase pops
      senderInstance.init(receiverInstance.audioContext);
      
      isEngineActive.value = true;
      debugMetrics.value.mode = 'LISTENING / IDLE';
    } catch (err) {
      console.error("Audio Engine launch script blocked:", err);
      alert("Microphone hardware connection blocked. Check browser peripheral permissions.");
    }
  } else {
    // Clean up operational pipelines to free system memory
    receiverInstance.stop();
    senderInstance.stopTone();
    sharedAnalyser.value = null;
    isEngineActive.value = false;
    rxStreamBuffer.value = ''; // Flush history terminals
    debugMetrics.value = { mode: 'OFFLINE', lockFreq: 0, snr: 0 };
  }
};

// Locate inside main.vue -> handleOutputTransmission Method

const handleOutputTransmission = (messageText) => {
  if (!isEngineActive.value) {
    alert("Please launch the modem hardware engine before initiating audio transmission.");
    return;
  }
  
  debugMetrics.value.mode = 'TRANSMITTING';
  senderInstance.transmitString(messageText, orchestrator.activeProtocol);
  
  // UPDATED: Account for 10 bits per character frame (1 start + 8 data + 1 stop)
  const totalFramedBits = messageText.length * 10;
  const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;
  
  setTimeout(() => {
    if (isEngineActive.value) {
      debugMetrics.value.mode = 'LISTENING / IDLE';
    }
  }, transmissionDurationMs + 150); // Settlement padding
};


</script>
<style scoped>/* ==========================================================================
   ACOUSTIC DATA MODEM DASHBOARD DESIGN SYSTEM
   ========================================================================== */

/* 1. Global Application Architecture & Resets */
body {
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin: 0;
  padding: 24px;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  max-width: 1280px;
  margin: 0 auto;
}

.app-header {
  border-bottom: 2px solid #1e293b;
  padding-bottom: 14px;
  margin-bottom: 28px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  font-size: 1.4rem;
  margin: 0;
  color: #f8fafc;
  letter-spacing: -0.025em;
}

/* 2. Live Engine Status Indicator Bubble */
.engine-indicator {
  font-size: 0.8rem;
  font-weight: bold;
  color: #64748b;
  background: #111827;
  padding: 4px 10px;
  border-radius: 20px;
}

.engine-indicator.running {
  color: #10b981;
  text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

/* 3. High-Level Adaptive Grid Layouts */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .grid-layout {
    grid-template-columns: 360px 1fr;
  }
}

.control-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.display-workspace {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 4. Modular Panel Cards */
.card {
  background: #1e293b;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #334155;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 0.95rem;
  margin-top: 0;
  margin-bottom: 18px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.075em;
}

/* 5. Interactive Elements & Control Rows */
.control-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.power-btn {
  border: none;
  padding: 14px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  letter-spacing: 0.025em;
}

.active-start {
  background: #10b981;
  color: #ffffff;
}

.active-start:hover {
  background: #059669;
}

.active-stop {
  background: #ef4444;
  color: #ffffff;
}

.active-stop:hover {
  background: #dc2626;
}

/* 6. Live Hardware Telemetry Displays */
.status-badge {
  text-align: center;
  background: #0f172a;
  color: #f1f5f9;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  border: 1px solid #1e293b;
}

.telemetry-readout {
  background: #0f172a;
  padding: 14px;
  border-radius: 6px;
  border: 1px solid #1e293b;
}

.data-field {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.data-field:last-child {
  margin-bottom: 0;
}

.label {
  color: #64748b;
}

.value {
  color: #38bdf8;
  font-weight: bold;
}

/* 7. Configuration Inputs & Dropdowns */
.select-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.select-group label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.select-group select {
  width: 100%;
  background: #0f172a;
  color: #f1f5f9;
  border: 1px solid #334155;
  padding: 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
}

/* 8. Text Terminals Workspace Layout */
.terminal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 960px) {
  .terminal-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
