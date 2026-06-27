<!-- src/components/ProtocolConfig/index.vue -->
<template>
  <div class="protocol-config-subpanel">
    <div class="form-grid">
      <!-- Dynamic Form Engine Iterates over fields array directly -->
      <div v-for="field in fields" :key="field.key" class="input-group">
        <div class="field-header">
          <label>{{ field.label }}</label>
          <!-- 🌟 NEW: Live reactive value badge indicator printout -->
          <span v-if="field.type === 'number'" class="live-value-badge">
            {{ modelValue[field.key] }}<span class="inline-unit">{{ field.unit || '' }}</span>
          </span>
        </div>

        <!-- Render Option A: Select Field Dropdowns (Unchanged) -->
        <select 
          v-if="field.type === 'select'"
          :value="modelValue[field.key]"
          @input="updateField(field.key, Number($event.target.value))"
        >
          <option v-for="opt in field.options" :key="opt.v" :value="opt.v">
            {{ opt.l }}
          </option>
        </select>

        <!-- Render Option B: Dynamic Range Sliders -->
        <div v-else-if="field.type === 'number'" class="slider-track-container">
          <input 
            type="range"
            :value="modelValue[field.key]"
            @input="updateField(field.key, Number($event.target.value))"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            class="sandbox-slider"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  fields: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const updateField = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
};
</script>

<style scoped>
.protocol-config-subpanel {
  background: #0f172a; 
  border-radius: 6px; 
  padding: 14px; 
  border: 1px solid #1e293b; 
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px; /* Expanded slightly for thumb grip breathing room */
}

.input-group {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Flex aligned header text tracking labels and indicators */
.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

label {
  font-size: 0.7rem;
  color: #64748b; 
  text-transform: uppercase; 
  font-weight: bold;
  letter-spacing: 0.025em;
}

/* Glowing numerical value indicator readout */
.live-value-badge {
  font-size: 0.75rem;
  font-weight: bold;
  color: #38bdf8; /* Digital telemetry cyan */
  background: #090d16;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #1e293b;
}

.inline-unit {
  font-size: 0.65rem;
  color: #475569;
  margin-left: 2px;
}

select {
  background: #1e293b; 
  color: #f1f5f9; 
  border: 1px solid #334155; 
  padding: 10px 12px; 
  border-radius: 6px; 
  font-family: inherit; 
  font-size: 0.85rem; 
  outline: none; 
  width: 100%; 
  box-sizing: border-box; 
  cursor: pointer;
}
select:focus {
  border-color: #3b82f6; 
}

.slider-track-container {
  width: 100%;
  display: flex;
  align-items: center;
}

/* 🌟 CUSTOM DESIGNED HIGH-CONTRAST SLIDER RAIL ELEMENT */
.sandbox-slider {
  appearance: none;
  width: 100%;
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  outline: none;
  margin: 8px 0;
  cursor: pointer;
  border: 1px solid #334155;
}

/* Slider Blue Grabber Thumb Handles - Webkit Engine (Chrome, Safari, Edge) */
.sandbox-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #ffffff;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  transition: transform 0.1s ease, background-color 0.1s ease;
}
.sandbox-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #2563eb;
}
.sandbox-slider::-webkit-slider-thumb:active {
  transform: scale(1.1);
  background: #1d4ed8;
}

/* Slider Handles - Gecko Engine (Firefox Support) */
.sandbox-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #ffffff;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  transition: transform 0.1s ease;
  cursor: pointer;
}
.sandbox-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}
</style>
