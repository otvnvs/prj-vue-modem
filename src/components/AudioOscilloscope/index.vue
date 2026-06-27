<!--components/AudioOscilloscope.vue-->
<template>
  <div class="scope-wrapper">
    <div class="scope-header">
      <h3>Signal Monitor</h3>
      <div class="btn-group">
        <button 
          :class="{ active: visualMode === 'time' }" 
          @click="visualMode = 'time'"
        >
          Wave
        </button>
        <button 
          :class="{ active: visualMode === 'frequency' }" 
          @click="visualMode = 'frequency'"
        >
          Spectrum
        </button>
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
const visualMode = ref('time');
let animationId = null;

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
    
    // Dark Canvas Background (#090d16) to blend with dashboard app theme
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Subdued Midline Grid Axis
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    if (visualMode.value === 'time') {
      props.analyserNode.getByteTimeDomainData(dataArray);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#10B981'; // Cyber Emerald Green Wave
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        x += sliceWidth;
      }
      ctx.stroke();
    } else {
      props.analyserNode.getByteFrequencyData(dataArray);
      const visibleBins = Math.floor(bufferLength * 0.4);
      const barWidth = canvas.width / visibleBins;
      
      for (let i = 0; i < visibleBins; i++) {
        const percentHeight = dataArray[i] / 255;
        const barHeight = percentHeight * canvas.height;
        
        const red = 50 + (percentHeight * 205);
        const blue = 200 - (percentHeight * 150);
        
        ctx.fillStyle = `rgb(${red},139,${blue})`;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 0.5, barHeight);
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
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

onBeforeUnmount(() => stopDrawingLoop());
</script>

<style scoped>
.scope-wrapper {
  background: #0f172a;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #1e293b;
}

/* Mobile-First Header Column Stack */
.scope-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

h3 {
  color: #94a3b8;
  margin: 0;
  font-family: inherit;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

/* Fluid Flex-Wrap Container for Screen Squeezes */
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}

.btn-group button {
  flex: 1 1 auto; /* Allows buttons to share row or expand evenly */
  min-width: 135px;
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
  padding: 10px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px; /* Uniform rounded styling */
  transition: all 0.15s ease;
  text-align: center;
}

.btn-group button:hover:not(.active) {
  background: #334155;
  color: #f1f5f9;
  border-color: #475569;
}

.btn-group button.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

/* Clean Canvas Presentation Workspace */
.scope-canvas {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  background: #090d16;
  border: 1px solid #1e293b;
}

/* Desktop Breakpoint for Inline Row Alignment */
@media (min-width: 580px) {
  .scope-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .btn-group {
    width: auto;
    background: #090d16;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid #1e293b;
    gap: 4px;
  }

  .btn-group button {
    flex: initial;
    min-width: unset;
    background: transparent;
    border: 1px solid transparent;
    padding: 6px 14px;
    border-radius: 6px;
  }
  
  .btn-group button.active {
    background: #3b82f6;
    border-color: #3b82f6;
  }
}
</style>

