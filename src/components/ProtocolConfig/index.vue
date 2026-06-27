<!-- components/ProtocolConfig.vue -->
<template>
  <div class="protocol-config-subpanel">
    <div class="form-grid">
      <!-- Dynamic Form Engine Iterates over fields array directly -->
      <div v-for="field in fields" :key="field.key" class="input-group">
        <label>{{ field.label }}</label>
        
        <!-- Render Option: Select Field Dropdowns -->
        <select 
          v-if="field.type === 'select'" 
          :value="modelValue[field.key]" 
          @input="updateField(field.key, Number($event.target.value))"
        >
          <option v-for="opt in field.options" :key="opt.v" :value="opt.v">
            {{ opt.l }}
          </option>
        </select>

        <!-- Render Option: Alphanumeric Number Inputs -->
        <div v-else-if="field.type === 'number'" class="input-with-unit">
          <input 
            type="number" 
            :value="modelValue[field.key]" 
            @input="updateField(field.key, Number($event.target.value))"
            :min="field.min" :max="field.max" :step="field.step"
          />
          <span v-if="field.unit" class="unit">{{ field.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
const props=defineProps({
  fields: { type: Array, required: true },
  modelValue: { type: Object, required: true }
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
.protocol-config-subpanel { background: #0f172a; border-radius: 6px; padding: 14px; border: 1px solid #1e293b; }
.form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.input-group { display: flex; flex-direction: column; position: relative; }
label { font-size: 0.75rem; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
input, select { background: #1e293b; color: #f1f5f9; border: 1px solid #334155; padding: 8px 12px; border-radius: 4px; font-family: inherit; font-size: 0.9rem; outline: none; width: 100%; box-sizing: border-box; }
input:focus, select:focus { border-color: #3b82f6; }
.input-with-unit { position: relative; width: 100%; }
.unit { position: absolute; right: 12px; bottom: 8px; font-size: 0.8rem; color: #475569; }
</style>
