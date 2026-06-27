<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { AudioReceiver } from '../../utils/receiver.js';
import { AudioSender } from '../../utils/sender.js';
import { ModemOrchestrator } from '../../utils/modem/index.js';
import { calculateValidationResults } from '../../utils/modem/diagnostics.js';
import { runVirtualLoopback } from '../../utils/modem/loopback.js';

import ModemControlPanel from '../../components/ModemControlPanel/index.vue';
import ProtocolProfilePanel from '../../components/ProtocolProfilePanel/index.vue';
import TerminalWorkspace from '../../components/TerminalWorkspace/index.vue';
import AudioOscilloscope from '../../components/AudioOscilloscope/index.vue';

const orchestrator = new ModemOrchestrator();
const receiverInstance = new AudioReceiver();
const senderInstance = new AudioSender();

const isEngineActive = ref(false);
const sharedAnalyser = ref(null);
const rxStreamBuffer = ref('');
const debugMetrics = ref({ mode: 'OFFLINE', lockFreq: 0, snr: 0 });
const availableProtocols = ref([]);
const selectedProtocol = ref('');
const protocolConfigs = ref({});
const isLoopbackMode = ref(false);
const loopbackSpeed = ref('realtime');
let loopbackIntervalId = null;

const isTestingModeActive = ref(false);
const testMetrics = ref({ expectedText: '', receivedText: '', charAccuracy: 100, bitErrors: 0, testStatus: 'IDLE' });
const STANDARD_TEST_PAYLOAD = "MODEM_TEST_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz_++--";

const currentTxIndex = ref(-1); 

const activeFields = computed(() => {
    const current = availableProtocols.value.find(p => p.id === selectedProtocol.value);
    return current ? current.fields : [];
});

const engineState = computed(() => !isEngineActive.value ? 'OFFLINE' : debugMetrics.value.mode);

//onMounted(() => {
//    availableProtocols.value = orchestrator.getAvailableProtocols();
//    if (availableProtocols.value.length > 0) {
//        selectedProtocol.value = availableProtocols.value[0].id;
//        availableProtocols.value.forEach(proto => protocolConfigs.value[proto.id] = proto.defaultConfig);
//        orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
//    }
//    orchestrator.onDebug(metrics => {
//        debugMetrics.value.lockFreq = metrics.freqLock;
//        debugMetrics.value.snr = metrics.signalQuality;
//        if (debugMetrics.value.mode !== 'TRANSMITTING') debugMetrics.value.mode = metrics.mode;
//    });
//    orchestrator.onData(character => {
//        rxStreamBuffer.value += character;
//        if (isTestingModeActive.value) {
//            testMetrics.value.receivedText += character;
//            const res = calculateValidationResults(testMetrics.value.expectedText, testMetrics.value.receivedText);
//            testMetrics.value.charAccuracy = res.charAccuracy;
//            testMetrics.value.bitErrors = res.bitErrors;
//        }
//    });
//});
onMounted(() => {
    // Collect the global registered protocols array
    availableProtocols.value = orchestrator.getAvailableProtocols();
    
    if (availableProtocols.value.length > 0) {
        // 🌟 FIX: Access index 0 to cleanly read the string ID mapping property!
        selectedProtocol.value = availableProtocols.value[0].id;
        
        // Securely initialize default keys for each architecture setup
        availableProtocols.value.forEach(proto => {
            protocolConfigs.value[proto.id] = proto.defaultConfig;
        });
        
        // Instantiate the background engine driver protocol model
        orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
    }
    
    // Capture incoming bit telemetry
    orchestrator.onDebug(metrics => {
        debugMetrics.value.lockFreq = metrics.freqLock;
        debugMetrics.value.snr = metrics.signalQuality;
        if (debugMetrics.value.mode !== 'TRANSMITTING') debugMetrics.value.mode = metrics.mode;
    });
    
    // Capture incoming string text streams
    orchestrator.onData(character => {
        rxStreamBuffer.value += character;
        if (isTestingModeActive.value) {
            testMetrics.value.receivedText += character;
            const res = calculateValidationResults(testMetrics.value.expectedText, testMetrics.value.receivedText);
            testMetrics.value.charAccuracy = res.charAccuracy;
            testMetrics.value.bitErrors = res.bitErrors;
        }
    });
});

watch(() => protocolConfigs.value[selectedProtocol.value], newSettings => {
    if (newSettings) orchestrator.updateConfig(newSettings);
}, { deep: true });

const handleToggleEngine = async () => {
    if (!isEngineActive.value) {
        try {
            sharedAnalyser.value = await receiverInstance.start(chunk => {
                if (!isLoopbackMode.value) orchestrator.ingestIncomingAudioSamples(chunk, receiverInstance.audioContext.sampleRate);
            });
            senderInstance.init(receiverInstance.audioContext);
            isEngineActive.value = true;
            debugMetrics.value.mode = 'LISTENING / IDLE';
        } catch (err) {
            alert("Microphone hardware permission blocked.");
        }
    } else {
        if (loopbackIntervalId) clearInterval(loopbackIntervalId);
        receiverInstance.stop(); senderInstance.stopTone(); sharedAnalyser.value = null;
        isEngineActive.value = false; rxStreamBuffer.value = '';
        debugMetrics.value = { mode: 'OFFLINE', lockFreq: 0, snr: 0 };
    }
};

const handleProtocolChange = () => {
    if (selectedProtocol.value) orchestrator.setProtocol(selectedProtocol.value, protocolConfigs.value[selectedProtocol.value]);
};

//const handleOutputTransmission = (messageText) => {
//    if (loopbackIntervalId) clearInterval(loopbackIntervalId);
//    if (!isEngineActive.value && !isLoopbackMode.value) {
//        alert("Please launch the modem hardware engine first.");
//        return;
//    }
//    if (isLoopbackMode.value) {
//        debugMetrics.value.mode = 'TRANSMITTING';
//        loopbackIntervalId = runVirtualLoopback({
//            messageText, senderInstance, receiverInstance, orchestrator, loopbackSpeed: loopbackSpeed.value, sharedAnalyser: sharedAnalyser.value,
//            onComplete: () => debugMetrics.value.mode = 'LISTENING / IDLE'
//        });
//    } else {
//        debugMetrics.value.mode = 'TRANSMITTING';
//        senderInstance.transmitString(messageText, orchestrator.activeProtocol);
//        setTimeout(() => { if (isEngineActive.value) debugMetrics.value.mode = 'LISTENING / IDLE'; }, ((messageText.length * 10) / orchestrator.config.baud) * 1000 + 150);
//    }
//};
const handleOutputTransmission = (messageText) => {
    if (loopbackIntervalId) clearInterval(loopbackIntervalId);
    currentTxIndex.value = -1; // Reset to safe idle baseline

    if (!isEngineActive.value && !isLoopbackMode.value) {
        alert("Please launch the modem hardware engine first.");
        return;
    }

    if (isLoopbackMode.value) {
        debugMetrics.value.mode = 'TRANSMITTING';
        
        // 🌟 FIX: Wire up state setters into your utility parameter mapping
        loopbackIntervalId = runVirtualLoopback({
            messageText, 
            senderInstance, 
            receiverInstance, 
            orchestrator, 
            loopbackSpeed: loopbackSpeed.value, 
            sharedAnalyser: sharedAnalyser.value,
            onIndexChanged: (idx) => {
                currentTxIndex.value = idx; // ⚡ Pushes the index up to templates in real-time
            },
            onComplete: () => {
                debugMetrics.value.mode = 'LISTENING / IDLE';
                currentTxIndex.value = -1; // Clear highlight trails upon completion
            }
        });
    } else {
        // --- PHYSICAL SPEAKER AIR-GAP MODE ---
        debugMetrics.value.mode = 'TRANSMITTING';
        senderInstance.transmitString(messageText, orchestrator.activeProtocol);
        
        // Simulates physical progression across speakers using an estimated interval clock
        currentTxIndex.value = 0;
        const charDurationMs = ((10 / orchestrator.config.baud) * 1000);
        
        let charTimer = setInterval(() => {
            if (currentTxIndex.value < messageText.length - 1) {
                currentTxIndex.value++;
            } else {
                clearInterval(charTimer);
            }
        }, charDurationMs);

        setTimeout(() => {
            clearInterval(charTimer);
            currentTxIndex.value = -1; // Reset highlights
            if (isEngineActive.value) debugMetrics.value.mode = 'LISTENING / IDLE';
        }, ((messageText.length * 10) / orchestrator.config.baud) * 1000 + 150);
    }
};


const runAutomatedValidationTest = () => {
    rxStreamBuffer.value = '';
    testMetrics.value = { expectedText: STANDARD_TEST_PAYLOAD, receivedText: '', charAccuracy: 0, bitErrors: 0, testStatus: 'RUNNING' };
    isTestingModeActive.value = true;
    handleOutputTransmission(STANDARD_TEST_PAYLOAD);
    setTimeout(() => {
        isTestingModeActive.value = false;
        testMetrics.value.testStatus = (testMetrics.value.charAccuracy === 100 && testMetrics.value.receivedText.length === testMetrics.value.expectedText.length) ? 'PASSED' : 'FAILED';
    }, ((STANDARD_TEST_PAYLOAD.length * 10) / orchestrator.config.baud) * 1000 + (isLoopbackMode.value && loopbackSpeed.value === 'instant' ? 100 : 1500));
};
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1>Acoustic Data Modem Sandbox</h1>
        <span class="engine-indicator" :class="{ running: isEngineActive }">● Engine {{ isEngineActive ? 'ON' : 'OFF' }}</span>
      </div>
    </header>
    <main class="grid-layout">
      <div class="control-sidebar">
        <ModemControlPanel
          :is-engine-active="isEngineActive"
          :engine-state="engineState"
          :debug-metrics="debugMetrics"
          v-model:is-loopback-mode="isLoopbackMode"
          v-model:loopback-speed="loopbackSpeed"
          :is-testing-mode-active="isTestingModeActive"
          :test-metrics="testMetrics"
          @toggle-engine="handleToggleEngine"
          @run-test="runAutomatedValidationTest"
          :current-tx-index="currentTxIndex"
        />
        <ProtocolProfilePanel
          :available-protocols="availableProtocols"
          v-model:selected-protocol="selectedProtocol"
          v-model:protocol-config="protocolConfigs[selectedProtocol]"
          :active-fields="activeFields"
          :is-transmitting="senderInstance?.isRunning"
          @change-protocol="handleProtocolChange"
        />
      </div>
      <div class="display-workspace">
        <section class="card graphics-panel">
          <AudioOscilloscope :analyserNode="sharedAnalyser" />
        </section>
        <TerminalWorkspace :rx-stream-data="rxStreamBuffer" @send-message="handleOutputTransmission" />
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(body) { background-color: #090d16; color: #f1f5f9; font-family: ui-monospace, monospace; margin: 0; padding: 12px; }
.app-container { max-width: 1400px; margin: 0 auto; padding: 4px; }
.app-header { border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
.header-content { display: flex; flex-direction: column; gap: 12px; }
.app-header h1 { font-size: 1.25rem; margin: 0; color: #f8fafc; font-weight: 700; }
.engine-indicator { font-size: 0.75rem; font-weight: bold; color: #94a3b8; background: #111827; padding: 6px 12px; border-radius: 6px; border: 1px solid #1e293b; }
.engine-indicator.running { color: #34d399; border-color: #065f46; background: #022c22; }
.grid-layout { display: grid; grid-template-columns: 1fr; gap: 16px; }
.control-sidebar, .display-workspace { display: flex; flex-direction: column; gap: 16px; }
.card { background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #1e293b; }
@media (min-width: 960px) { .grid-layout { grid-template-columns: 380px 1fr; } }
</style>

