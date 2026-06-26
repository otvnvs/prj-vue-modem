<!--src/main.vue or src/App.vue-->
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
      <!-- Controls Column -->
      <div class="control-sidebar">
        <!-- Modem Engine Panel -->
        <section class="card control-panel">
          <h2>Modem Control</h2>
          <div class="control-row">
            <button 
              :class="['power-btn', isEngineActive ? 'active-stop' : 'active-start']" 
              @click="handleToggleEngine"
            >
              {{ isEngineActive ? 'STOP ENGINE' : 'START ENGINE' }}
            </button>
            <div class="status-badge" :data-status="engineState">
              STATUS: {{ engineState }}
            </div>
          </div>
          
          <div class="telemetry-readout">
            <div class="data-field">
              <span class="label">Lock Frequency:</span>
              <span class="value">{{ debugMetrics.lockFreq }}Hz</span>
            </div>
            <div class="data-field">
              <span class="label">Signal Quality:</span>
              <span class="value">{{ debugMetrics.snr }}dB</span>
            </div>
          </div>
        </section>

        <!-- Profile Panel -->
        <section class="card protocol-selection-panel">
          <h2>Protocol Profile</h2>
          <div class="input-group select-group">
            <label>Selected Architecture</label>
            <div class="select-wrapper">
              <select 
                v-model="selectedProtocol" 
                @change="handleProtocolChange" 
                :disabled="senderInstance?.isRunning"
              >
                <option v-for="proto in availableProtocols" :key="proto.id" :value="proto.id">
                  {{ proto.displayName }}
                </option>
              </select>
            </div>
          </div>
          <ProtocolConfig :fields="activeFields" v-model="protocolConfigs[selectedProtocol]" />
        </section>
      </div>

      <!-- Displays Column -->
      <div class="display-workspace">
        <section class="card graphics-panel">
          <AudioOscilloscope :analyserNode="sharedAnalyser" />
        </section>

        <div class="terminal-grid">
          <TerminalBox title="Transmit Terminal Buffer" mode="tx" @send="handleOutputTransmission" />
          <TerminalBox title="Incoming Message Stream" mode="rx" :streamData="rxStreamBuffer" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { AudioReceiver } from '../../utils/receiver.js';
import { AudioSender } from '../../utils/sender.js';
import { ModemOrchestrator } from '../../utils/modem/index.js';
import AudioOscilloscope from '../../components/AudioOscilloscope.vue';
import ProtocolConfig from '../../components/ProtocolConfig.vue';
import TerminalBox from '../../components/TerminalBox.vue';

const isEngineActive = ref(false);
const sharedAnalyser = ref(null);
const rxStreamBuffer = ref('');
const debugMetrics = ref({ mode: 'OFFLINE', lockFreq: 0, snr: 0 });
const availableProtocols = ref([]);
const selectedProtocol = ref('');
const protocolConfigs = ref({});

const orchestrator = new ModemOrchestrator();
const receiverInstance = new AudioReceiver();
const senderInstance = new AudioSender();

const activeFields = computed(() => {
  const current = availableProtocols.value.find(p => p.id === selectedProtocol.value);
  return current ? current.fields : [];
});

const engineState = computed(() => {
  if (!isEngineActive.value) return 'OFFLINE';
  return debugMetrics.value.mode;
});

onMounted(() => {
  availableProtocols.value = orchestrator.getAvailableProtocols();
  if (availableProtocols.value.length > 0) {
    selectedProtocol.value = availableProtocols.value[0].id;
    availableProtocols.value.forEach(proto => {
      protocolConfigs.value[proto.id] = proto.defaultConfig;
    });
    orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
  }

  orchestrator.onDebug((metrics) => {
    debugMetrics.value.lockFreq = metrics.freqLock;
    debugMetrics.value.snr = metrics.signalQuality;
    if (debugMetrics.value.mode !== 'TRANSMITTING') {
      debugMetrics.value.mode = metrics.mode;
    }
  });

  orchestrator.onData((character) => {
    rxStreamBuffer.value += character;
  });
});

watch(() => protocolConfigs.value[selectedProtocol.value], (newSettings) => {
  if (newSettings) {
    orchestrator.updateConfig(newSettings);
  }
}, { deep: true });

const handleProtocolChange = () => {
  if (selectedProtocol.value) {
    orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
  }
};

const handleToggleEngine = async () => {
  if (!isEngineActive.value) {
    try {
      const activeAnalyser = await receiverInstance.start((audioSamplesChunk) => {
        orchestrator.ingestIncomingAudioSamples(audioSamplesChunk, receiverInstance.audioContext.sampleRate);
      });
      sharedAnalyser.value = activeAnalyser;
      senderInstance.init(receiverInstance.audioContext);
      isEngineActive.value = true;
      debugMetrics.value.mode = 'LISTENING / IDLE';
    } catch (err) {
      console.error("Audio Engine launch script blocked:", err);
      alert("Microphone hardware connection blocked. Check browser peripheral permissions.");
    }
  } else {
    receiverInstance.stop();
    senderInstance.stopTone();
    sharedAnalyser.value = null;
    isEngineActive.value = false;
    rxStreamBuffer.value = '';
    debugMetrics.value = { mode: 'OFFLINE', lockFreq: 0, snr: 0 };
  }
};

const handleOutputTransmission = (messageText) => {
  if (!isEngineActive.value) {
    alert("Please launch the modem hardware engine before initiating audio transmission.");
    return;
  }
  debugMetrics.value.mode = 'TRANSMITTING';
  senderInstance.transmitString(messageText, orchestrator.activeProtocol);

  const totalFramedBits = messageText.length * 10;
  const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;

  setTimeout(() => {
    if (isEngineActive.value) {
      debugMetrics.value.mode = 'LISTENING / IDLE';
    }
  }, transmissionDurationMs + 150);
};
</script>

<style scoped>
:global(body) {
  background-color: #090d16;
  color: #f1f5f9;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin: 0;
  padding: 12px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Fluid Outer Container */
.app-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 4px;
}

/* Header Adjustments */
.app-header {
  border-bottom: 1px solid #1e293b;
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.app-header h1 {
  font-size: 1.25rem;
  margin: 0;
  color: #f8fafc;
  letter-spacing: -0.025em;
  font-weight: 700;
}

.engine-indicator {
  font-size: 0.75rem;
  font-weight: bold;
  color: #94a3b8;
  background: #111827;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #1e293b;
  display: inline-flex;
  align-items: center;
}

.engine-indicator.running {
  color: #34d399;
  border-color: #065f46;
  background: #022c22;
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.15);
}

/* Mobile-First Layout Cascade */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.control-sidebar, 
.display-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terminal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Cards & Content Elements */
.card {
  background: #0f172a;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #1e293b;
}

.card h2 {
  font-size: 0.8rem;
  margin-top: 0;
  margin-bottom: 16px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

/* Layout Row Configuration */
.control-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

/* Dynamic Interactive Controls */
.power-btn {
  border: none;
  padding: 14px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  transition: background 0.15s ease, transform 0.1s ease;
  letter-spacing: 0.025em;
  width: 100%;
}

.power-btn:active {
  transform: scale(0.98);
}

.active-start {
  background: #3b82f6;
  color: #ffffff;
}

.active-start:hover {
  background: #2563eb;
}

.active-stop {
  background: #ef4444;
  color: #ffffff;
}

.active-stop:hover {
  background: #dc2626;
}

/* Data Status Elements */
.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 1px solid #334155;
}

.telemetry-readout {
  background: #090d16;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #1e293b;
}

.data-field {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.8rem;
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

/* Form Selection & Inputs */
.select-group {
  display: flex;
  flex-direction: column;
}

.select-group label {
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: bold;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper select {
  width: 100%;
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  padding: 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
appearance: none;cursor: pointer;}.select-wrapper select:focus {border-color: #3b82f6;}/* Custom Dropdown Arrow */.select-wrapper::after {content: "▼";font-size: 0.65rem;color: #64748b;position: absolute;right: 14px;top: 50%;transform: translateY(-50%);pointer-events: none;}/* Responsive Viewports Optimization */@media (min-width: 480px) {:global(body) {padding: 16px;}.header-content {flex-direction: row;justify-content: space-between;align-items: center;}.control-row {grid-template-columns: 1fr 1fr;}}@media (min-width: 768px) {.grid-layout {grid-template-columns: 320px 1fr;gap: 20px;}.card {padding: 20px;}.app-header h1 {font-size: 1.35rem;}}@media (min-width: 1024px) {.grid-layout {grid-template-columns: 360px 1fr;gap: 24px;}.terminal-grid {grid-template-columns: 1fr 1fr;gap: 24px;}}</style>
