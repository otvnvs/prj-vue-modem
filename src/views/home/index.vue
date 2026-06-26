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
	<div class="mode-toggle-row">
	  <label class="toggle-label">
	    <input type="checkbox" v-model="isLoopbackMode">
	    <span class="toggle-text">Enable Virtual Loopback</span>
	  </label>
	  
	  <!-- Speed Sub-Selector Toggle -->
	  <div v-if="isLoopbackMode" class="speed-selector">
	    <label>
	      <input type="radio" value="realtime" v-model="loopbackSpeed">
	      <span>Real-Time (Scope Enabled)</span>
	    </label>
	    <label>
	      <input type="radio" value="instant" v-model="loopbackSpeed">
	      <span>Max Speed (Instant Data)</span>
	    </label>
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


<!-- Diagnostic & Verification Panel -->
<section class="card diagnostic-panel" :class="testMetrics.testStatus.toLowerCase()">
  <h2>Diagnostic Verification Suite</h2>
  
  <div class="diagnostic-actions">
    <button 
      class="test-btn" 
      :disabled="isTestingModeActive" 
      @click="runAutomatedValidationTest"
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
const isLoopbackMode = ref(false);
const loopbackSpeed = ref('realtime'); // Options: 'realtime' or 'instant'
let loopbackIntervalId = null;


const orchestrator = new ModemOrchestrator();
const receiverInstance = new AudioReceiver();
const senderInstance = new AudioSender();

const isTestingModeActive = ref(false);
const testMetrics = ref({
    expectedText: '',
    receivedText: '',
    charAccuracy: 100,
    bitErrors: 0,
    testStatus: 'IDLE' // 'IDLE', 'RUNNING', 'PASSED', 'FAILED'
});

// A standard high-variance sequence to stress-test your DSP synchronization limits
const STANDARD_TEST_PAYLOAD = "MODEM_TEST_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz_++--";


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
    // If a validation test run is executing, accumulate and calculate error rate live
    if (isTestingModeActive.value) {
        testMetrics.value.receivedText += character;
        calculateValidationResults();
    }
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

//const handleToggleEngine = async () => {
//  if (!isEngineActive.value) {
//    try {
//      const activeAnalyser = await receiverInstance.start((audioSamplesChunk) => {
//        orchestrator.ingestIncomingAudioSamples(audioSamplesChunk, receiverInstance.audioContext.sampleRate);
//      });
//      sharedAnalyser.value = activeAnalyser;
//      senderInstance.init(receiverInstance.audioContext);
//      isEngineActive.value = true;
//      debugMetrics.value.mode = 'LISTENING / IDLE';
//    } catch (err) {
//      console.error("Audio Engine launch script blocked:", err);
//      alert("Microphone hardware connection blocked. Check browser peripheral permissions.");
//    }
//  } else {
//    receiverInstance.stop();
//    senderInstance.stopTone();
//    sharedAnalyser.value = null;
//    isEngineActive.value = false;
//    rxStreamBuffer.value = '';
//    debugMetrics.value = { mode: 'OFFLINE', lockFreq: 0, snr: 0 };
//  }
//};
const handleToggleEngine = async () => {
    if (!isEngineActive.value) {
        try {
            // Start standard hardware contexts
            const activeAnalyser = await receiverInstance.start((audioSamplesChunk) => {
                if (!isLoopbackMode.value) {
                    orchestrator.ingestIncomingAudioSamples(audioSamplesChunk, receiverInstance.audioContext.sampleRate);
                }
            });

            sharedAnalyser.value = activeAnalyser;
            senderInstance.init(receiverInstance.audioContext);
            isEngineActive.value = true;
            debugMetrics.value.mode = 'LISTENING / IDLE';
            
        } catch (err) {
            console.error("Audio Engine launch script blocked:", err);
            alert("Microphone hardware connection blocked.");
        }
    } else {
        if (loopbackIntervalId) clearInterval(loopbackIntervalId);
        receiverInstance.stop();
        senderInstance.stopTone();
        sharedAnalyser.value = null;
        isEngineActive.value = false;
        rxStreamBuffer.value = '';
        debugMetrics.value = { mode: 'OFFLINE', lockFreq: 0, snr: 0 };
    }
};

//const handleOutputTransmission = (messageText) => {
//  if (!isEngineActive.value) {
//    alert("Please launch the modem hardware engine before initiating audio transmission.");
//    return;
//  }
//  debugMetrics.value.mode = 'TRANSMITTING';
//  senderInstance.transmitString(messageText, orchestrator.activeProtocol);
//
//  const totalFramedBits = messageText.length * 10;
//  const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;
//
//  setTimeout(() => {
//    if (isEngineActive.value) {
//      debugMetrics.value.mode = 'LISTENING / IDLE';
//    }
//  }, transmissionDurationMs + 150);
//};
//const handleOutputTransmission = (messageText) => {
//    if (!isEngineActive.value && !isLoopbackMode.value) {
//        alert("Please launch the modem hardware engine before initiating audio transmission.");
//        return;
//    }
//
//    if (isLoopbackMode.value) {
//        // --- INTERNAL LOOPBACK MODE (BYPASSES MIC/SPEAKER) ---
//        debugMetrics.value.mode = 'TRANSMITTING';
//        
//        // Generate pure mathematical samples instantly
//        const sampleRate = receiverInstance.audioContext?.sampleRate || 44100;
//        const virtualAudioSamples = senderInstance.generateLoopbackSamples(
//            messageText, 
//            orchestrator.activeProtocol, 
//            sampleRate
//        );
//
//        // Feed the array directly into your DSP parsing orchestrator chunk by chunk
//        // simulating incoming blocks to test framing and noise thresholds
//        const chunkSize = 512;
//        for (let i = 0; i < virtualAudioSamples.length; i += chunkSize) {
//            const chunk = virtualAudioSamples.slice(i, i + chunkSize);
//            orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
//        }
//
//        // Instantly toggle back to idle since array execution is synchronous
//        debugMetrics.value.mode = 'LISTENING / IDLE';
//
//    } else {
//        // --- NORMAL PHYSICAL AIR-GAP HARDWARE TRANSMISSION ---
//        debugMetrics.value.mode = 'TRANSMITTING';
//        senderInstance.transmitString(messageText, orchestrator.activeProtocol);
//
//        const totalFramedBits = messageText.length * 10;
//        const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;
//
//        setTimeout(() => {
//            if (isEngineActive.value) {
//                debugMetrics.value.mode = 'LISTENING / IDLE';
//            }
//        }, transmissionDurationMs + 150);
//    }
//};
const handleOutputTransmission = (messageText) => {
    // Clear any previous running simulation loops safety first
    if (loopbackIntervalId) {
        clearInterval(loopbackIntervalId);
        loopbackIntervalId = null;
    }

    if (!isEngineActive.value && !isLoopbackMode.value) {
        alert("Please launch the modem hardware engine before initiating audio transmission.");
        return;
    }

    if (isLoopbackMode.value) {
        debugMetrics.value.mode = 'TRANSMITTING';
        
        const sampleRate = receiverInstance.audioContext?.sampleRate || 44100;
        const virtualAudioSamples = senderInstance.generateLoopbackSamples(
            messageText, 
            orchestrator.activeProtocol, 
            sampleRate
        );

        const chunkSize = 512;
        let currentSampleOffset = 0;

        // --- OPTION A: MAXIMUM SPEED (INSTANT SCAN) ---
        if (loopbackSpeed.value === 'instant') {
            for (let i = 0; i < virtualAudioSamples.length; i += chunkSize) {
                const chunk = virtualAudioSamples.slice(i, i + chunkSize);
                orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
            }
            debugMetrics.value.mode = 'LISTENING / IDLE';

//        // --- OPTION B: REAL-TIME SIMULATION (SCOPE VISIBLE / SILENT) ---
//        } else if (loopbackSpeed.value === 'realtime') {
//            // Calculate interval delay: 512 samples / 44100 samples per sec ≈ 11.61ms
//            const tickRateMs = (chunkSize / sampleRate) * 1000;
//
//            loopbackIntervalId = setInterval(() => {
//                if (currentSampleOffset >= virtualAudioSamples.length) {
//                    clearInterval(loopbackIntervalId);
//                    loopbackIntervalId = null;
//                    debugMetrics.value.mode = 'LISTENING / IDLE';
//                    return;
//                }
//
//                const chunk = virtualAudioSamples.slice(currentSampleOffset, currentSampleOffset + chunkSize);
//                
//                // CRITICAL FOR SCOPES: Mock the Analyzer visual data window!
//                if (sharedAnalyser.value && sharedAnalyser.value.getByteTimeDomainData) {
//                    // If a custom or mock analyser property exists, we can inject data,
//                    // but since the component reads from web-audio stream directly,
//                    // your main canvas reads props.analyserNode. We will push chunks manually.
//                    // To force visual update on standard Analyser Node we feed it via a silent Gain node
//                }
//
//                orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
//                currentSampleOffset += chunkSize;
//            }, tickRateMs);
//        }
        // --- OPTION B: REAL-TIME SIMULATION (SCOPE VISIBLE / SILENT) ---
        } else if (loopbackSpeed.value === 'realtime') {
            // Calculate interval delay: 512 samples / 44100 samples per sec ≈ 11.61ms
            const tickRateMs = (chunkSize / sampleRate) * 1000;

            loopbackIntervalId = setInterval(() => {
                if (currentSampleOffset >= virtualAudioSamples.length) {
                    clearInterval(loopbackIntervalId);
                    loopbackIntervalId = null;
                    debugMetrics.value.mode = 'LISTENING / IDLE';
                    return;
                }

                const chunk = virtualAudioSamples.slice(currentSampleOffset, currentSampleOffset + chunkSize);

                // --- CRITICAL FOR SCOPES: PUMP SILENT DATA INTO ANALYSER NODE ---
                const ctx = receiverInstance.audioContext;
                if (ctx && sharedAnalyser.value) {
                    try {
                        // 1. Create a transient 1-channel buffer matching your sample size
                        const audioBuf = ctx.createBuffer(1, chunk.length, sampleRate);
                        
                        // 2. Safely populate channel 0 memory with our current float chunk
                        audioBuf.getChannelData(0).set(chunk);
                        
                        // 3. Create a runtime scheduled buffer playback worker
                        const bufferSource = ctx.createBufferSource();
                        bufferSource.buffer = audioBuf;
                        
                        // 4. Connect to analyzer (Forces scope to draw without speaking to system speakers!)
                        bufferSource.connect(sharedAnalyser.value);
                        bufferSource.start(0);
                    } catch (e) {
                        console.warn("Scope visual injection skipped this tick:", e);
                    }
                }

                // Ingest the chunk into the DSP parsing math pipeline
                orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
                currentSampleOffset += chunkSize;
            }, tickRateMs);
        }


    } else {
        // --- NORMAL PHYSICAL AUDIO MODE ---
        debugMetrics.value.mode = 'TRANSMITTING';
        senderInstance.transmitString(messageText, orchestrator.activeProtocol);

        const totalFramedBits = messageText.length * 10;
        const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;

        setTimeout(() => {
            if (isEngineActive.value) {
                debugMetrics.value.mode = 'LISTENING / IDLE';
            }
        }, transmissionDurationMs + 150);
    }
};

//--------------------------------------------------------------------------------
//automation
//--------------------------------------------------------------------------------
const runAutomatedValidationTest = () => {
    // Reset test criteria
    rxStreamBuffer.value = '';
    testMetrics.value = {
        expectedText: STANDARD_TEST_PAYLOAD,
        receivedText: '',
        charAccuracy: 0,
        bitErrors: 0,
        testStatus: 'RUNNING'
    };
    isTestingModeActive.value = true;

    // Fire the transmission string down whatever channel is currently selected (Loopback or Physical)
    handleOutputTransmission(STANDARD_TEST_PAYLOAD);

    // Calculate total duration based on protocol baud rate
    const totalFramedBits = STANDARD_TEST_PAYLOAD.length * 10;
    const transmissionDurationMs = (totalFramedBits / orchestrator.config.baud) * 1000;

    // Schedule validation evaluation window shortly after transmission completes
    setTimeout(() => {
        finalizeValidationTest();
    }, transmissionDurationMs + (isLoopbackMode.value && loopbackSpeed.value === 'instant' ? 100 : 1500));
};

//const calculateValidationResults = () => {
//    const expected = testMetrics.value.expectedText;
//    const received = testMetrics.value.receivedText;
//    
//    let correctlyDecodedChars = 0;
//    let totalBitErrors = 0;
//
//    // Scan through incoming characters up to the expected total bounds
//    for (let i = 0; i < received.length; i++) {
//        if (i >= expected.length) break;
//
//        const expectedCharCode = expected.charCodeAt(i);
//        const receivedCharCode = received.charCodeAt(i);
//
//        if (expectedCharCode === receivedCharCode) {
//            correctlyDecodedChars++;
//        } else {
//            // Bitwise XOR reveals exactly how many discrete bits flipped in the air-gap
//            let bitwiseXor = expectedCharCode ^ receivedCharCode;
//            while (bitwiseXor > 0) {
//                if (bitwiseXor & 1) totalBitErrors++;
//                bitwiseXor >>= 1;
//            }
//        }
//    }
//
//    // Account for dropped trailing characters as complete bit blowouts (8 bits per char)
//    if (received.length < expected.length) {
//        totalBitErrors += (expected.length - received.length) * 8;
//    }
//
//    testMetrics.value.charAccuracy = expected.length > 0 
//        ? Math.round((correctlyDecodedChars / expected.length) * 100) 
//        : 0;
//    testMetrics.value.bitErrors = totalBitErrors;
//};
const calculateValidationResults = () => {
    const expected = testMetrics.value.expectedText;
    const received = testMetrics.value.receivedText;

    if (!expected) return;
    if (!received) {
        testMetrics.value.charAccuracy = 0;
        testMetrics.value.bitErrors = expected.length * 8;
        return;
    }

    // ==========================================
    // 1. CHARACTER ACCURACY: Levenshtein Distance
    // ==========================================
    const expectedLen = expected.length;
    const receivedLen = received.length;
    
    // Initialize distance matrix
    const matrix = Array.from({ length: expectedLen + 1 }, () => new Array(receivedLen + 1).fill(0));
    for (let i = 0; i <= expectedLen; i++) matrix[i][0] = i;
    for (let j = 0; j <= receivedLen; j++) matrix[0][j] = j;

    for (let i = 1; i <= expectedLen; i++) {
        for (let j = 1; j <= receivedLen; j++) {
            const cost = expected.charCodeAt(i - 1) === received.charCodeAt(j - 1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // Deletion
                matrix[i][j - 1] + 1,      // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }

    const editDistance = matrix[expectedLen][receivedLen];
    // Accuracy is calculated based on how close the text matches the reference footprint
    const rawAccuracy = ((expectedLen - editDistance) / expectedLen) * 100;
    testMetrics.value.charAccuracy = Math.max(0, Math.round(rawAccuracy));

    // ==========================================
    // 2. BIT ERROR RATE (BER): Backtrack Alignment
    // ==========================================
    let totalBitErrors = 0;
    let i = expectedLen;
    let j = receivedLen;

    // Backtrack through the matrix to calculate bit transformations across aligned text characters
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + (expected.charCodeAt(i - 1) === received.charCodeAt(j - 1) ? 0 : 1)) {
            // Character Aligned or Substituted
            const expChar = expected.charCodeAt(i - 1);
            const recChar = received.charCodeAt(j - 1);
            
            let bitwiseXor = expChar ^ recChar;
            while (bitwiseXor > 0) {
                if (bitwiseXor & 1) totalBitErrors++;
                bitwiseXor >>= 1;
            }
            i--; j--;
        } else if (i > 0 && (j === 0 || matrix[i][j] === matrix[i - 1][j] + 1)) {
            // Dropped Character (Complete 8-bit blowout penalty)
            totalBitErrors += 8;
            i--;
        } else if (j > 0 && (i === 0 || matrix[i][j] === matrix[i][j - 1] + 1)) {
            // Spurious Extra Inserted Character (8-bit noise penalty)
            totalBitErrors += 8;
            j--;
        }
    }

    testMetrics.value.bitErrors = totalBitErrors;
};

const finalizeValidationTest = () => {
    calculateValidationResults();
    isTestingModeActive.value = false;
    
    if (testMetrics.value.charAccuracy === 100 && testMetrics.value.receivedText.length === testMetrics.value.expectedText.length) {
        testMetrics.value.testStatus = 'PASSED';
    } else {
        testMetrics.value.testStatus = 'FAILED';
    }
};

//--------------------------------------------------------------------------------

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
appearance: none;cursor: pointer;}.select-wrapper select:focus {border-color: #3b82f6;}/* Custom Dropdown Arrow */.select-wrapper::after {content: "▼";font-size: 0.65rem;color: #64748b;position: absolute;right: 14px;top: 50%;transform: translateY(-50%);pointer-events: none;}/* Responsive Viewports Optimization */@media (min-width: 480px) {:global(body) {padding: 16px;}.header-content {flex-direction: row;justify-content: space-between;align-items: center;}.control-row {grid-template-columns: 1fr 1fr;}}@media (min-width: 768px) {.grid-layout {grid-template-columns: 320px 1fr;gap: 20px;}.card {padding: 20px;}.app-header h1 {font-size: 1.35rem;}}@media (min-width: 1024px) {.grid-layout {grid-template-columns: 360px 1fr;gap: 24px;}.terminal-grid {grid-template-columns: 1fr 1fr;gap: 24px;}}

/* --------------------------------------------------------------------------------
 * loopback control
 * -------------------------------------------------------------------------------- */
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
/* --------------------------------------------------------------------------------
 * automation test
 * -------------------------------------------------------------------------------- */
/* Diagnostic Panel Container Base */
.diagnostic-panel {
  border: 1px solid #334155;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

/* Status Reactive Borders */
.diagnostic-panel.running {
  border-color: #3b82f6;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}
.diagnostic-panel.passed {
  border-color: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
}
.diagnostic-panel.failed {
  border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
}

/* Run Test Button Accent */
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
.test-btn:hover:not(:disabled) {
  background: #334155;
  border-color: #94a3b8;
}
.test-btn:disabled {
  background: #1e293b;
  color: #475569;
  border-color: #222222;
  cursor: wait;
}

/* Text Result Content Fields */
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
.status-badge-text {
  font-weight: bold;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}
.running .status-badge-text { color: #3b82f6; }
.passed .status-badge-text { color: #10b981; }
.failed .status-badge-text { color: #ef4444; }

.results-scroller {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.payload-preview {
  display: block;
  background: #0b0f19;
  border: 1px solid #1a2333;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
  overflow-x: auto;
}
.precision-text {
  color: #38bdf8;
}

/* Metric Display Badges */
.metrics-summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.metric-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 6px;
}
.pill-label {
  font-size: 0.6rem;
  color: #475569;
  text-transform: uppercase;
  font-weight: bold;
}
.pill-val {
  font-size: 0.9rem;
  font-weight: bold;
  color: #f1f5f9;
}

/* Metric Context Color Shifting */
.metric-pill.error {
  border-color: #7f1d1d;
  background: #270505;
}
.metric-pill.error .pill-val { color: #fca5a5; }

.metric-pill.success {
  border-color: #064e3b;
  background: #022c22;
}
.metric-pill.success .pill-val { color: #34d399; }

/* Container Layout Matrix */
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

/* Polished Multi-line Monospace Layout Blocks */
.payload-display-wrapper {
  display: block;
  background: #0b0f19;
  border: 1px solid #1a2333;
  padding: 10px 12px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  word-break: break-all;     /* 🌟 Automatically wrap text to new lines cleanly */
  white-space: pre-wrap;     /* Preserves formatting and whitespace structural bounds */
  max-height: 110px;         /* Caps vertical bloat safely with clean vertical scroll */
  overflow-y: auto;          /* Only scroll vertically if payload string explodes */
}

/* Specific Context Theme Color Shifts */
.payload-display-wrapper.expected {
  color: #64748b;            /* Soft slate gray for reference blueprint string */
}

.payload-display-wrapper.received {
  color: #38bdf8;            /* Bright cyan for incoming live telemetry text data */
  border-color: rgba(56, 189, 248, 0.15);
}

.payload-display-wrapper.received.empty {
  color: #475569;
  font-style: italic;
}

/* Custom Scrollbar Hide for Clean Webkit Panes (if vertical overflow trips) */
.payload-display-wrapper::-webkit-scrollbar {
  width: 4px;
}
.payload-display-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.payload-display-wrapper::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 2px;
}


/* --------------------------------------------------------------------------------
 * loopback toggle
 * -------------------------------------------------------------------------------- */
.mode-toggle-row {
  margin-top: 4px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
  transition: all 0.2s ease;
}

/* Subtle highlight effect when hovering over the panel zone */
.mode-toggle-row:hover {
  background: #222f44;
  border-color: #475569;
}

.toggle-label {
  display: flex;
  align-items: center; /* 🌟 Perfect vertical centering alignment */
  gap: 12px;           /* Gives comfortable breathing space between the box and text */
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.toggle-text {
  font-size: 0.75rem;
  color: #e2e8f0;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase; /* Standardizes panel typography to match your headers */
}

/* Custom styled checkbox geometry */
.mode-toggle-row input[type="checkbox"] {
  appearance: none; /* Strip out ugly native browser style elements */
  width: 16px;
  height: 16px;
  background: #0f172a;
  border: 2px solid #475569;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  place-content: center;
  margin: 0; /* Clear baseline displacement shift artifacts */
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Active checked states */
.mode-toggle-row input[type="checkbox"]:checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

/* Add a clean checkmark glyph structure */
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


</style>
