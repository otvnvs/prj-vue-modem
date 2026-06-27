<!-- src/components/TerminalBox/index.vue -->
<template>
  <div class="terminal-card">
    <div class="terminal-header">
      <h3>{{ title }}</h3>
      <span class="mode-tag" :class="mode">{{ mode.toUpperCase() }}</span>
    </div>

    <!-- Output Mode View: Read-only live history logs (Unchanged) -->
    <div v-if="mode === 'rx'" class="terminal-display" ref="displayRef">
      <div v-if="!streamData" class="placeholder-text">Awaiting remote acoustic transmission signals...</div>
      <div v-else class="stream-content">{{ streamData }}</div>
    </div>

    <!-- Input Mode View: Replicated Token-Spanned Highlight Textarea Area -->
    <div v-else class="terminal-input-wrapper">
      <div class="editor-container">
        <!-- LAYER A: Backdrop layer replicates characters into style-trapped span sets -->
        <div class="highlights-backdrop" ref="backdropRef">
          <span 
            v-for="(char, idx) in inputText" 
            :key="idx"
            :class="{ 
              'sent-history': currentTxIndex !== undefined && currentTxIndex !== -1 && idx < currentTxIndex,
              'active-now': currentTxIndex !== undefined && currentTxIndex !== -1 && idx === currentTxIndex 
            }"
          >{{ char }}</span>
        </div>

        <!-- LAYER B: Interactive layer maps input value models and captures native scrolls -->
        <textarea 
          v-model="inputText" 
          placeholder="Type text characters here to convert into acoustic audio waves..."
          @scroll="syncEditorScroll"
          @keydown.enter.prevent="triggerSendAction"
        ></textarea>
      </div>

      <div class="action-row">
        <span class="char-count">{{ inputText.length }} chars</span>
        <button :disabled="!inputText.trim()" @click="triggerSendAction" class="send-btn">
          Transmit Audio
        </button>
      </div>
    </div>

  </div>
    <!-- Incoming Message Stream History -->
    <TerminalBox 
      title="Incoming Message Stream" 
      mode="rx" 
      :streamData="rxStreamData" 
    />

</template>

<script setup>
import { ref, watch, nextTick, defineProps, defineEmits } from 'vue';
import TerminalBox from '../TerminalBox/index.vue';

// 🌟 FIX: Assigned defineProps to 'const props' so JavaScript logic loops can safely access properties!
const props = defineProps({
  rxStreamData: {
    type: String,
    default: ''
  },

  title: { type: String, required: true },
  mode: { 
    type: String, 
    required: true, 
    default: 'tx', 
    validator: (v) => ['tx', 'rx'].includes(v) 
  },
  streamData: { type: String, default: '' },
  currentTxIndex: { type: Number, default: -1 }
});
const emit = defineEmits(['send']);

const inputText = ref('');
const displayRef = ref(null);
const backdropRef = ref(null);

// Inbound logs auto-scroller
watch(() => props.streamData, () => {
  if (props.mode === 'rx' && displayRef.value) {
    nextTick(() => {
      displayRef.value.scrollTop = displayRef.value.scrollHeight;
    });
  }
});

// Syncs scroll parameters perfectly between input layers and highlighting layers
const syncEditorScroll = (event) => {
  if (backdropRef.value) {
    backdropRef.value.scrollTop = event.target.scrollTop;
    backdropRef.value.scrollLeft = event.target.scrollLeft;
  }
};

const triggerSendAction = () => {
  if (!inputText.value.trim()) return;
  emit('send-message', inputText.value);
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

.editor-container {
  position: relative;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

/* 🌟 CRITICAL SHIELD: Locks both layers into 100% matching typography geometry layout bounds */
textarea, .highlights-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap; /* Mandates clean multi-line wrapping */
  word-break: break-all;
  overflow-y: auto;
  margin: 0;
  border: none;
  outline: none;
}

/* Base styling for our background code parser layer strings */
.highlights-backdrop {
  color: #64748b; /* Soft gray color for text that hasn't been modulated yet */
  background: transparent;
  pointer-events: none; /* Safely clicks straight through to the interaction textarea */
  user-select: none;
}

/* Letter span properties to match individual block sizing constraints */
.highlights-backdrop span {
  display: inline;
  border-radius: 2px;
  padding: 0 0.5px;
  transition: background 0.1s ease, color 0.15s ease;
}

/* 📥 1. PROCESSED DATA TRAIL HIGHLIGHTS: Clean white text blocks */
.highlights-backdrop span.sent-history {
  color: #f1f5f9 !important;
  background: rgba(51, 65, 85, 0.4);
}

/* ⚡ 2. ACTIVE MODULATOR POINT LOCATION INDICATOR: Glowing neon blue cursor block */
.highlights-backdrop span.active-now {
  background: #3b82f6 !important;
  color: #ffffff !important;
  font-weight: bold;
  box-shadow: 0 0 10px #3b82f6;
  transform: scale(1.05);
}

/* Active front-layer editing zone controls */
textarea {
  background: transparent;
  color: transparent; /* 🌟 FIX: Turns native typing letters invisible so they don't smear over highlights */
  resize: none;
  caret-color: #3b82f6; /* Keeps the standard blue vertical insertion text cursor blinking */
  z-index: 2;
}

/* Hide scrollbars on backdrop container to keep display totally clean */
.highlights-backdrop::-webkit-scrollbar {
  display: none;
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

