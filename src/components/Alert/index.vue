<template>
  <!-- Global keydown listener captures Enter anywhere on the document while active -->
  <div 
    class="dialog-overlay" 
    @click.self="props.onConfirm"
    @keydown.enter.prevent="props.onConfirm"
  >
    <div class="dialog-box">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      <div class="dialog-actions">
        <!-- FIXED: Added ref anchor to programmatically focus the OK button -->
        <button 
          ref="confirmButton"
          class="dialog-btn primary" 
          @click="props.onConfirm"
        >
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  title: String,
  message: String,
  onConfirm: Function
});

const confirmButton = ref(null);

// Trigger element layout focus loop straight away
onMounted(() => {
  confirmButton.value?.focus();
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex; justify-content: center; align-items: center;
  z-index: 9999;
}
.dialog-box {
  background: white; padding: 24px; border-radius: 12px;
  width: 90%; max-width: 320px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.dialog-title { margin: 0 0 12px 0; font-size: 18px; color: #222; }
.dialog-message { margin: 0 0 20px 0; font-size: 15px; color: #555; line-height: 1.4; }
.dialog-actions { display: flex; justify-content: flex-end; }
.dialog-btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
.dialog-btn.primary { background-color: #007aff; color: white; }
/* Added styling anchor point for accessible keyboard tab targeting visibility markers */
.dialog-btn:focus {
  outline: 3px solid #007aff;
  outline-offset: 2px;
}
</style>

