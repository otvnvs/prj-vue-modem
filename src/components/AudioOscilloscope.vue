<!-- components/AudioOscilloscope.vue -->
<template>
  <div class="scope-wrapper">
    <div class="scope-header">
      <h3>Signal Monitor</h3>
      <div class="btn-group">
        <button 
          :class="{ active: visualMode === 'time' }" 
          @click="visualMode = 'time'"
        >Time Domain (Wave)</button>
        <button 
          :class="{ active: visualMode === 'frequency' }" 
          @click="visualMode = 'frequency'"
        >Frequency Domain (Spectrum)</button>
      </div>
    </div>
    
    <canvas ref="canvasRef" width="800" height="240" class="scope-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  analyserNode: {
    type: Object,
    default: null
  }
});

const canvasRef = ref(null);
const visualMode = ref('time'); // 'time' or 'frequency'
let animationId = null;

// Watch for when the parent component boots up the audio engine and provides the node
watch(() => props.analyserNode, (newNode) => {
  if (newNode) {
    startDrawingLoop();
  } else {
    stopDrawingLoop();
  }
});

const startDrawingLoop = () => {
  if (animationId) cancelAnimationFrame(animationId);
  
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const bufferLength = props.analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    animationId = requestAnimationFrame(draw);
    
    // Clear display canvas with a sleek dark aesthetic
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw baseline references
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    if (visualMode.value === 'time') {
      // --- TIME DOMAIN: WAVEFORM GENERATION ---
      props.analyserNode.getByteTimeDomainData(dataArray);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#10B981'; // Vivid green waveform
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalise data byte around 1.0
        const y = (v * canvas.height) / 2;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        x += sliceWidth;
      }
      ctx.stroke();
      
    } else {
      // --- FREQUENCY DOMAIN: SPECTRUM BARS ---
      props.analyserNode.getByteFrequencyData(dataArray);
      
      // Focus mapping exclusively to low/mid bands where acoustic data modems operate (0 - 4kHz)
      const visibleBins = Math.floor(bufferLength * 0.4); 
      const barWidth = canvas.width / visibleBins;
      
      for (let i = 0; i < visibleBins; i++) {
        const percentHeight = dataArray[i] / 255;
        const barHeight = percentHeight * canvas.height;
        
        // Dynamically shift colour output across warm tones as audio signal grows hotter
        const red = 50 + (percentHeight * 205);
        const blue = 200 - (percentHeight * 150);
        ctx.fillStyle = `rgb(${red}, 139, ${blue})`;
        
        ctx.fillRect(
          i * barWidth, 
          canvas.height - barHeight, 
          barWidth - 0.5, 
          barHeight
        );
      }
    }
  };

  draw();
};

const stopDrawingLoop = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  // Clear screen to idle state
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

onBeforeUnmount(() => stopDrawingLoop());
</script>

<style scoped>
.scope-wrapper {
  background: #1f2937;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #374151;
}
.scope-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
h3 { color: #f3f4f6; margin: 0; font-family: monospace; }
.btn-group button {
  background: #4b5563;
  color: #d1d5db;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  font-family: monospace;
}
.btn-group button:first-child { border-radius: 4px 0 0 4px; }
.btn-group button:last-child { border-radius: 0 4px 4px 0; }
.btn-group button.active { background: #3b82f6; color: #fff; }
.scope-canvas {
  display: block;
  width: 100%;
  border-radius: 4px;
  background: #111827;
}
</style>
