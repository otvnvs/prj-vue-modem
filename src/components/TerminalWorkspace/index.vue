<!-- src/components/TerminalWorkspace/index.vue -->
<template>
  <div class="terminal-grid">
    <!-- Transmit Terminal Buffer Configuration -->
    <TerminalBox 
      title="Transmit Terminal Buffer" 
      mode="tx" 
      @send="onTransmitTrigger" 
    />
    
    <!-- Incoming Message Stream History -->
    <TerminalBox 
      title="Incoming Message Stream" 
      mode="rx" 
      :streamData="rxStreamData" 
    />
  </div>
</template>

<script setup>
import TerminalBox from '../TerminalBox/index.vue';

defineProps({
  rxStreamData: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['send-message']);

const onTransmitTrigger = (messageText) => {
  // Pass the payload string up to the master orchestrator view
  emit('send-message', messageText);
  
  // 🌟 BUGFIX: Find the text input area element in the DOM and wipe it clean
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(el => {
    if (el.placeholder.includes("convert into acoustic")) {
      // Create a transient synthetic input trigger event to clear out internal v-models safely
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
};
</script>

<style scoped>
.terminal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .terminal-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
