
<template>
  <div class="pin-screen">
    <!-- Header display -->
    <div class="pin-header">
      <h2 class="pin-title">{{ title }}</h2>
      <p v-if="errorMessage" class="pin-error">{{ errorMessage }}</p>
    </div>

    <!-- Visual Dots Display -->
    <div class="pin-dots">
      <span
        v-for="index in length"
        :key="index"
        class="pin-dot"
        :class="{ 'is-active': index <= pin.length }"
      ></span>
    </div>

    <!-- Grid Keypad -->
    <div class="pin-grid">
      <button 
        v-for="num in 9" 
        :key="num" 
        class="grid-btn" 
        @click="pressNum(num)"
      >
        {{ num }}
      </button>
      
      <!-- Clear button -->
      <button class="grid-btn functional-btn" @click="clearAll">C</button>
      
      <!-- Zero key -->
      <button class="grid-btn" @click="pressNum(0)">0</button>
      
      <!-- Backspace key -->
      <button class="grid-btn functional-btn" @click="pressDelete">⌫</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  length: { type: Number, default: 4 },
  title: { type: String, default: 'Enter PIN' },
  errorMessage: { type: String, default: '' }
});

const emit = defineEmits(['submit']);

const pin = ref('');

const pressNum = (num) => {
  if (pin.value.length < props.length) {
    pin.value += num.toString();
  }
  
  if (pin.value.length === props.length) {
    emit('submit', pin.value);
  }
};

const pressDelete = () => {
  pin.value = pin.value.slice(0, -1);
};

const clearAll = () => {
  pin.value = '';
};

// Handle physical physical/external keyboard entry
const handleGlobalKeydown = (event) => {
  // If user hits 0-9 keys
  if (/^\d$/.test(event.key)) {
    pressNum(parseInt(event.key, 10));
  } 
  // If user hits Backspace key
  else if (event.key === 'Backspace') {
    pressDelete();
  } 
  // If user hits Escape or Delete key to clear
  else if (event.key === 'Escape' || event.key === 'Delete') {
    clearAll();
  }
};

// Bind listeners when component mounts, clean up when it unmounts
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

defineExpose({ clearAll });
</script>

<style scoped>
.pin-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.pin-header {
  text-align: center;
  margin-bottom: 40px;
  height: 60px;
}

.pin-title {
  font-size: 22px;
  color: #333;
  margin: 0 0 8px 0;
}

.pin-error {
  color: #e63946;
  font-size: 14px;
  margin: 0;
}

.pin-dots {
  display: flex;
  gap: 20px;
  margin-bottom: 50px;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #ccc;
  transition: all 0.1s ease;
}

.pin-dot.is-active {
  background-color: #333;
  border-color: #333;
  transform: scale(1.1);
}

.pin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
}

.grid-btn {
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: none;
  background-color: #f0f0f0;
  font-size: 26px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.1s ease;
}

.grid-btn:active {
  background-color: #dcdcdc;
}

.functional-btn {
  font-size: 20px;
  background-color: transparent;
}

.functional-btn:active {
  background-color: #f0f0f0;
}
</style>

