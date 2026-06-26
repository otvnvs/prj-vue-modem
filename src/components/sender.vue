<template>
  <div class="sender-container">
    <input 
      v-model="message" 
      type="text" 
      placeholder="Enter text to encode..." 
      maxlength="100" 
      :disabled="isTransmitting"
      class="message-input"
    />
    <button 
      :disabled="isTransmitting || !message || !audioContext" 
      @click="handleTransmit"
      class="transmit-btn"
    >
      {{ isTransmitting ? 'Transmitting...' : 'Transmit via Sound' }}
    </button>
  </div>
</template>

<script setup>
import { ref, watch, defineProps } from 'vue';
// Route directly through the centralized factory gateway router
import { runModulator } from '../utils/modem/index.js';

const props = defineProps({
  audioContext: { type: Object, default: null },
  analyser: { type: Object, default: null },
  config: { type: Object, required: true },
  protocol: { type: String, default: 'AFSK' }
});

const message = ref('HELLO');
const isTransmitting = ref(false);
let activeOsc = null;

// Clean up interface lock state immediately if the parent engine shuts down mid-flight
watch(() => props.audioContext, (newCtx) => {
  if (!newCtx && isTransmitting.value) {
    forceAbortTransmission();
  }
});

/**
 * Orchestrates the audio modulation sequence using the selected protocol factory router
 */
const handleTransmit = () => {
  if (!message.value || isTransmitting.value || !props.audioContext) return;
  
  isTransmitting.value = true;
  const ctx = props.audioContext;

  try {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.connect(ctx.destination);

    activeOsc = ctx.createOscillator();
    activeOsc.type = 'sine';
    activeOsc.connect(gainNode);

    // Maintain virtual internal loopback wire link if visualizer is tracking
    if (props.analyser) {
      activeOsc.connect(props.analyser);
    }

    // Execute the modulation calculations via central gateway hub
    const endPlaybackTime = runModulator(props.protocol, message.value, ctx, activeOsc, props.config);

    // Launch output wave generation
    activeOsc.start();
    activeOsc.stop(endPlaybackTime);
    
    activeOsc.onended = () => { 
      isTransmitting.value = false; 
      activeOsc = null;
    };
  } catch (err) {
    console.error('Transmission fault:', err);
    isTransmitting.value = false;
    activeOsc = null;
  }
};

const forceAbortTransmission = () => {
  isTransmitting.value = false;
  if (activeOsc) {
    try { activeOsc.disconnect(); } catch(e) {}
    activeOsc = null;
  }
};
</script>

<style scoped>
.sender-container { 
  background-color: #121212; 
  border: 1px solid #222222; 
  border-radius: 8px; 
  padding: 12px; 
  width: 100%; 
  max-width: 400px; 
  box-sizing: border-box; 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
}
.message-input { 
  background-color: #000000; 
  border: 1px solid #333333; 
  color: #ffffff; 
  padding: 10px; 
  border-radius: 6px; 
  font-size: 14px; 
  outline: none; 
  font-family: monospace; 
}
.message-input:focus { border-color: #00e676; }
.transmit-btn { 
  background-color: #00e676; 
  color: #000000; 
  border: none; 
  padding: 10px; 
  border-radius: 6px; 
  font-size: 13px; 
  font-weight: bold; 
  cursor: pointer; 
  -webkit-tap-highlight-color: transparent; 
}
.transmit-btn:disabled { 
  background-color: #222222; 
  color: #555555; 
  cursor: not-allowed; 
}
</style>
