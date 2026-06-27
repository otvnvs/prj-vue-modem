<template>
  <div class="receiver-status-wrapper">
    <!-- Clean, compact status indicator -->
    <div :class="['status-badge', { 'active-lock': rxState.state !== 'IDLE' }]">
      Modem Decoder Mode: <span class="state-txt">{{ rxState.state }}</span>
    </div>

    <!-- Restored Classic Mini Layout Diagnostics panel -->
    <div class="debug-panel">
      <div class="debug-title">Receiver Diagnostic Telemetry</div>
      <div class="debug-row">
        <span>Signal Level:</span>
        <div class="meter-bg">
          <div class="meter-bar" :style="{ width: `${Math.min(100, dbLevel * 3)}%` }"></div>
        </div>
        <span class="value-txt">{{ Math.round(dbLevel) }}</span>
      </div>
      <div class="debug-row">
        <span>Detected Pitch:</span>
        <span class="value-txt frequency">{{ Math.round(liveFrequency) }} Hz</span>
      </div>
      <div class="debug-row">
        <span>Sync Lock:</span>
        <span class="value-txt">{{ Math.round(rxState.preambleCounter) }} ms</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onBeforeUnmount, defineProps, defineEmits } from 'vue';
// Route directly through the centralized factory gateway router
import { runDemodulator } from '../utils/modem/index.js';

const props = defineProps({
  analyser: { type: Object, default: null },
  audioContext: { type: Object, default: null },
  config: { type: Object, required: true },
  protocol: { type: String, default: 'AFSK' }
});

const emit = defineEmits(['decoded']);

// Reactive Diagnostic Values
const dbLevel = ref(0);
const liveFrequency = ref(0);

// Open architecture state container passed down into modular driver matrices
const rxState = reactive({
  state: 'IDLE',
  preambleCounter: 0,
  nextBitExpectedTimestamp: 0,
  currentByteBits: []
});

let dataArray = null;
let animationId = null;
let lastFrameTimestamp = 0;

// Re-evaluate pipeline attachments if props change from Main.vue
watch(
  () => [props.analyser, props.audioContext],
  ([newAnalyser, newCtx]) => {
    if (animationId) cancelAnimationFrame(animationId);

    if (newAnalyser && newCtx) {
      dataArray = new Float32Array(newAnalyser.fftSize);
      
      // Reset tracker context parameters completely
      rxState.state = 'IDLE';
      rxState.preambleCounter = 0;
      rxState.currentByteBits = [];
      lastFrameTimestamp = performance.now();
      
      processSignalData();
    } else {
      rxState.state = 'IDLE';
      dbLevel.value = 0;
      liveFrequency.value = 0;
    }
  },
  { immediate: true }
);

const processSignalData = () => {
  if (!props.analyser || !props.audioContext) return;
  animationId = requestAnimationFrame(processSignalData);

  const now = performance.now();
  const deltaMs = now - lastFrameTimestamp;
  lastFrameTimestamp = now;

  props.analyser.getFloatTimeDomainData(dataArray);
  const frameLength = dataArray.length;

  let sumSquares = 0;
  let crossings = 0;
  
  for (let i = 0; i < frameLength; i++) {
    const val = dataArray[i];
    sumSquares += val * val;

    if (i < frameLength - 1) {
      if ((dataArray[i] >= 0 && dataArray[i + 1] < 0) || (dataArray[i] < 0 && dataArray[i + 1] >= 0)) {
        if (Math.abs(dataArray[i] - dataArray[i + 1]) > 0.01) crossings++;
      }
    }
  }
  
  const rms = Math.sqrt(sumSquares / frameLength);
  dbLevel.value = rms * 100;

  const currentFreq = crossings > 0 ? (crossings * props.audioContext.sampleRate) / (frameLength * 2) : 0;
  liveFrequency.value = currentFreq;

  // Execute the demodulation calculations via central gateway hub factory
  runDemodulator(
    props.protocol,
    rxState, 
    dataArray, 
    currentFreq, 
    dbLevel.value, 
    deltaMs, 
    now, 
    props.config, 
    (char) => emit('decoded', char)
  );
};

onBeforeUnmount(() => { 
  if (animationId) cancelAnimationFrame(animationId); 
});
</script>

<style scoped>
.receiver-status-wrapper { width: 100%; max-width: 400px; margin: 10px auto; box-sizing: border-box; }
.status-badge { background-color: #141414; border: 1px solid #222222; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #666666; font-family: monospace; text-align: left; text-transform: uppercase; }
.status-badge.active-lock { border-color: #00e676; color: #e0e0e0; }
.state-txt { font-weight: bold; color: #ff1744; }
.active-lock .state-txt { color: #00e676; }

.debug-panel { background-color: #111111; border: 1px dashed #333333; border-radius: 6px; margin-top: 6px; padding: 8px; font-family: monospace; font-size: 11px; color: #888888; text-align: left; }
.debug-title { color: #00e676; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
.debug-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px; }
.debug-row:last-child { margin-bottom: 0; }
.meter-bg { flex-grow: 1; height: 4px; background-color: #222222; border-radius: 2px; overflow: hidden; }
.meter-bar { height: 100%; background-color: #00e676; width: 0%; transition: width 0.05s linear; }
.value-txt { min-width: 45px; text-align: right; color: #ffffff; font-weight: bold; }
.value-txt.frequency { color: #ffb300; }
</style>
