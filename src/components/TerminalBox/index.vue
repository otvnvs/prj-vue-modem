<!-- components/TerminalBox.vue -->
<template>
  <div class="terminal-card">
    <div class="terminal-header">
      <h3>{{ title }}</h3>
      <span class="mode-tag" :class="mode">{{ mode.toUpperCase() }}</span>
    </div>

    <!-- Output Mode View: Read-only live history logs -->
    <div v-if="mode === 'rx'" class="terminal-display" ref="displayRef">
      <div v-if="!streamData" class="placeholder-text">Awaiting remote acoustic transmission signals...</div>
      <div v-else class="stream-content">{{ streamData }}</div>
    </div>

    <!-- Input Mode View: Interaction text fields with character triggers -->
    <div v-else class="terminal-input-wrapper">
      <textarea 
        v-model="inputText" 
        placeholder="Type text characters here to convert into acoustic audio waves..."
        @keydown.enter.prevent="triggerSendAction"
      ></textarea>
      <div class="action-row">
        <span class="char-count">{{ inputText.length }} chars</span>
        <button 
          :disabled="!inputText.trim()" 
          @click="triggerSendAction"
          class="send-btn"
        >Transmit Audio</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  mode: { type: String, required: true, validator: (v) => ['tx', 'rx'].includes(v) },
  streamData: { type: String, default: '' }
});

const emit = defineEmits(['send']);
const inputText = ref('');
const displayRef = ref(null);

// Automatically scrolls the output terminal window down to follow incoming data
watch(() => props.streamData, () => {
  if (props.mode === 'rx' && displayRef.value) {
    nextTick(() => {
      displayRef.value.scrollTop = displayRef.value.scrollHeight;
    });
  }
});

const triggerSendAction = () => {
  if (!inputText.value.trim()) return;
  emit('send', inputText.value);
  //inputText.value = ''; // Clean field for subsequent text entries
};
</script>

<style scoped>
.terminal-card {
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  height: 220px;
}
.terminal-header {
  padding: 12px 16px;
  background: #111827;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
}
.terminal-header h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; }
.mode-tag { font-size: 0.7rem; font-weight: bold; padding: 2px 6px; border-radius: 3px; }
.mode-tag.tx { background: #1e3a8a; color: #60a5fa; }
.mode-tag.rx { background: #064e3b; color: #34d399; }

.terminal-display {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: inherit;
  font-size: 0.95rem;
  background: #0f172a;
  color: #10b981;
}
.placeholder-text { color: #475569; font-style: italic; font-size: 0.85rem; }
.stream-content { white-space: pre-wrap; word-break: break-all; }

.terminal-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}
textarea {
  flex: 1;
  background: transparent;
  border: none;
  resize: none;
  padding: 14px;
  color: #f1f5f9;
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
}
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #111827;
  border-top: 1px solid #334155;
  border-bottom-left-radius: 7px;
  border-bottom-right-radius: 7px;
}
.char-count { font-size: 0.75rem; color: #475569; }
.send-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.85rem;
}
.send-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
</style>
