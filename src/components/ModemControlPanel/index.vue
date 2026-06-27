<!-- src/components/ModemControlPanel/index.vue -->
<template>
  <div class="panel-stack">
    <!-- Modem Engine Power Panel -->
    <section class="card control-panel">
      <h2>Modem Control</h2>
      <div class="control-row">
        <button 
          :class="['power-btn', isEngineActive ? 'active-stop' : 'active-start']" 
          @click="$emit('toggle-engine')"
        >
          {{ isEngineActive ? 'STOP ENGINE' : 'START ENGINE' }}
        </button>
        <div class="status-badge" :data-status="engineState">STATUS: {{ engineState }}</div>
      </div>

      <!-- Custom Themed Loopback Switch -->
      <div class="mode-toggle-row">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            :checked="isLoopbackMode" 
            @change="$emit('update:isLoopbackMode', $event.target.checked)"
          >
          <span class="toggle-text">Virtual Loopback</span>
        </label>
        
        <!-- Speed Selector Controls -->
        <div v-if="isLoopbackMode" class="speed-selector">
          <label>
            <input 
              type="radio" 
              value="realtime" 
              :checked="loopbackSpeed === 'realtime'" 
              @change="$emit('update:loopbackSpeed', 'realtime')"
            >
            <span>Real-Time (Scope Enabled)</span>
          </label>
          <label>
            <input 
              type="radio" 
              value="instant" 
              :checked="loopbackSpeed === 'instant'" 
              @change="$emit('update:loopbackSpeed', 'instant')"
            >
            <span>Max Speed (Instant Data)</span>
          </label>
        </div>
      </div>

      <!-- Telemetry Status Feed -->
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

    <!-- Algorithmic Verification Suite -->
    <section class="card diagnostic-panel" :class="testMetrics.testStatus.toLowerCase()">
      <h2>Diagnostic Verification Suite</h2>
      
      <div class="diagnostic-actions">
        <button 
          class="test-btn" 
          :disabled="isTestingModeActive" 
          @click="$emit('run-test')"
        >
          {{ isTestingModeActive ? 'TEST RUNNING...' : 'RUN VERIFICATION TEST' }}
        </button>
      </div>

      <div class="test-results-grid" v-if="testMetrics.expectedText">
        <div class="result-row status-header">
          <span class="label">Test Status:</span>
          <span class="status-badge-text">{{ testMetrics.testStatus }}</span>
        </div>
        
        <div class="results-layout-block">
          <div class="result-field">
            <span class="label">Expected Payload:</span>
            <div class="payload-display-wrapper expected">
              {{ testMetrics.expectedText }}
            </div>
          </div>
          
          <div class="result-field">
            <span class="label">Received Payload:</span>
            <div class="payload-display-wrapper received" :class="{ empty: !testMetrics.receivedText }">
              {{ testMetrics.receivedText || '(Awaiting incoming characters...)' }}
            </div>
          </div>
        </div>

        <div class="metrics-summary-row">
          <div class="metric-pill" :class="{ error: testMetrics.bitErrors > 0 }">
            <span class="pill-label">Bit Errors</span>
            <span class="pill-val">{{ testMetrics.bitErrors }}</span>
          </div>
          
          <div class="metric-pill" :class="{ success: testMetrics.charAccuracy === 100 && testMetrics.receivedText.length === testMetrics.expectedText.length }">
            <span class="pill-label">Char Accuracy</span>
            <span class="pill-val">{{ testMetrics.charAccuracy }}%</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  isEngineActive: Boolean,
  engineState: String,
  debugMetrics: Object,
  isLoopbackMode: Boolean,
  loopbackSpeed: String,
  isTestingModeActive: Boolean,
  testMetrics: Object
});

defineEmits([
  'toggle-engine', 
  'update:isLoopbackMode', 
  'update:loopbackSpeed', 
  'run-test'
]);
</script>

<style scoped>
.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.control-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

@media (min-width: 480px) {
  .control-row {
    grid-template-columns: 1fr auto;
  }
}

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
}

.power-btn:active {
  transform: scale(0.98);
}

.active-start { background: #3b82f6; color: #ffffff; }
.active-start:hover { background: #2563eb; }
.active-stop { background: #ef4444; color: #ffffff; }
.active-stop:hover { background: #dc2626; }

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
  min-width: 140px;
}

.mode-toggle-row {
  margin-top: 4px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
  transition: all 0.2s ease;
}

.mode-toggle-row:hover {
  background: #222f44;
  border-color: #475569;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.toggle-text {
  font-size: 0.75rem;
  color: #e2e8f0;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.mode-toggle-row input[type="checkbox"] {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #0f172a;
  border: 2px solid #475569;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  place-content: center;
  margin: 0;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-toggle-row input[type="checkbox"]:checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.mode-toggle-row input[type="checkbox"]::before {
  content: "";
  width: 8px;
  height: 5px;
  border-left: 2px solid white;
  border-bottom: 2px solid white;
  transform: rotate(-45deg) translate(1px, -1px);
  scale: 0;
  transition: transform 0.1s ease;
}

.mode-toggle-row input[type="checkbox"]:checked::before {
  scale: 1;
}

.speed-selector {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #334155;
}

.speed-selector label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: #94a3b8;
  cursor: pointer;
}

.speed-selector input[type="radio"] {
  accent-color: #3b82f6;
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

.label { color: #64748b; }
.value { color: #38bdf8; font-weight: bold; }

.diagnostic-panel {
  border: 1px solid #334155;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.diagnostic-panel.running { border-color: #3b82f6; box-shadow: 0 0 12px rgba(59, 130, 246, 0.15); }
.diagnostic-panel.passed { border-color: #10b981; box-shadow: 0 0 12px rgba(16, 185, 129, 0.15); }
.diagnostic-panel.failed { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.15); }

.test-btn {
  width: 100%;
  background: #475569;
  color: #ffffff;
  border: 1px solid #64748b;
  padding: 12px;
  font-weight: bold;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: all 0.15s ease;
}

.test-btn:hover:not(:disabled) { background: #334155; border-color: #94a3b8; }
.test-btn:disabled { background: #1e293b; color: #475569; border-color: #222222; cursor: wait; }

.test-results-grid {
  margin-top: 14px;
  background: #090d16;
  border-radius: 8px;
  border: 1px solid #1e293b;
  padding: 12px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.status-badge-text { font-weight: bold; font-size: 0.8rem; letter-spacing: 0.05em; }
.running .status-badge-text { color: #3b82f6; }
.passed .status-badge-text { color: #10b981; }
.failed .status-badge-text { color: #ef4444; }

.results-layout-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.payload-display-wrapper {
  display: block;
  background: #0b0f19;
  border: 1px solid #1a2333;
  padding: 10px 12px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  word-break: break-all;
  white-space: pre-wrap;
  max-height: 110px;
  overflow-y: auto;
}

.payload-display-wrapper.expected { color: #64748b; }
.payload-display-wrapper.received { color: #38bdf8; border-color: rgba(56, 189, 248, 0.15); }
.payload-display-wrapper.received.empty { color: #475569; font-style: italic; }

.payload-display-wrapper::-webkit-scrollbar { width: 4px; }
.payload-display-wrapper::-webkit-scrollbar-track { background: transparent; }
.payload-display-wrapper::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }.metrics-summary-row {display: grid;grid-template-columns: 1fr 1fr;gap: 8px;margin-top: 12px;}.metric-pill {display: flex;flex-direction: column;align-items: center;justify-content: center;background: #111827;border: 1px solid #1e293b;border-radius: 6px;padding: 6px;}.pill-label { font-size: 0.6rem; color: #475569; text-transform: uppercase; font-weight: bold; }.pill-val { font-size: 0.9rem; font-weight: bold; color: #f1f5f9; }.metric-pill.error { border-color: #7f1d1d; background: #270505; }.metric-pill.error .pill-val { color: #fca5a5; }.metric-pill.success { border-color: #064e3b; background: #022c22; }.metric-pill.success .pill-val { color: #34d399; }</style>
