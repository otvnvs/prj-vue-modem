<template>
  <div class="oscilloscope-container">
    <h3 class="title">Zero-Latency Scope</h3>
    <canvas ref="scopeCanvas" width="256" height="128" class="scope-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, defineProps } from 'vue';

const props = defineProps({
  analyser: { type: Object, default: null }
});

const scopeCanvas = ref(null);
let ctx = null, imgData = null, buf32 = null, dataArray = null, animationId = null;

const WIDTH = 256;
const HEIGHT = 128;
const HALF_HEIGHT = 64;

watch(
  () => [props.analyser, scopeCanvas.value],
  ([newAnalyser, canvasEl]) => {
    if (animationId) cancelAnimationFrame(animationId);

    if (newAnalyser && canvasEl) {
      ctx = canvasEl.getContext('2d', { alpha: false });
      imgData = ctx.createImageData(WIDTH, HEIGHT);
      buf32 = new Uint32Array(imgData.data.buffer);
      dataArray = new Float32Array(newAnalyser.fftSize);
      renderLoop();
    } else {
      if (ctx) ctx.clearRect(0, 0, WIDTH, HEIGHT);
    }
  },
  { immediate: true }
);

const renderLoop = () => {
  if (!props.analyser) return;
  animationId = requestAnimationFrame(renderLoop);

  props.analyser.getFloatTimeDomainData(dataArray);

  buf32.fill(0xFF000000);
  const gridOffset = HALF_HEIGHT * WIDTH;
  for (let x = 0; x < WIDTH; x += 4) { buf32[gridOffset + x] = 0xFF222222; }

  for (let x = 0; x < WIDTH; x++) {
    const sample = dataArray[x];
    const y = Math.floor(HALF_HEIGHT - (sample * HALF_HEIGHT));
    const clampedY = Math.max(0, Math.min(HEIGHT - 1, y));
    buf32[(clampedY << 8) + x] = 0xFF00E676; 

    if (x < WIDTH - 1) {
      const nextSample = dataArray[x + 1];
      const nextY = Math.max(0, Math.min(HEIGHT - 1, Math.floor(HALF_HEIGHT - (nextSample * HALF_HEIGHT))));
      const minY = clampedY < nextY ? clampedY : nextY;
      const maxY = clampedY > nextY ? clampedY : nextY;
      for (let fillY = minY + 1; fillY < maxY; fillY++) {
        buf32[(fillY << 8) + x] = 0xFF00C465;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
};

onBeforeUnmount(() => { if (animationId) cancelAnimationFrame(animationId); });
</script>

<style scoped>
.oscilloscope-container { width: 100%; max-width: 400px; margin: 0 auto; text-align: center; color: #ffffff; background-color: #121212; padding: 15px; border-radius: 8px; border: 1px solid #222222; box-sizing: border-box; }
.title { margin-top: 0; font-size: 14px; margin-bottom: 12px; color: #888888; text-transform: uppercase; }
.scope-canvas { width: 100%; height: 140px; background-color: #000000; border: 1px solid #333333; border-radius: 4px; image-rendering: pixelated; }
</style>
