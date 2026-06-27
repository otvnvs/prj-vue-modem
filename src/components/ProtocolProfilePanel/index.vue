<!-- src/components/ProtocolProfilePanel/index.vue -->
<template>
  <section class="card protocol-selection-panel">
    <h2>Protocol Profile</h2>
    
    <div class="input-group select-group">
      <label>Selected Architecture</label>
      <div class="select-wrapper">
        <select 
          :value="selectedProtocol" 
          @change="onProtocolDropdownChange"
        >
          <option 
            v-for="proto in availableProtocols" 
            :key="proto.id" 
            :value="proto.id"
          >
            {{ proto.displayName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Nested Config Field Injection Grid -->
    <ProtocolConfig 
      :fields="activeFields" 
      :modelValue="protocolConfig"
      @update:modelValue="onConfigFieldUpdate"
    />
  </section>
</template>

<script setup>
import ProtocolConfig from '../ProtocolConfig/index.vue';

const props = defineProps({
  availableProtocols: Array,
  selectedProtocol: String,
  protocolConfig: Object,
  activeFields: Array,
  isTransmitting: Boolean
});

const emit = defineEmits([
  'update:selectedProtocol', 
  'update:protocolConfig', 
  'change-protocol'
]);

const onProtocolDropdownChange = (event) => {
  const newProtocolId = event.target.value;
  emit('update:selectedProtocol', newProtocolId);
  emit('change-protocol', newProtocolId);
};

const onConfigFieldUpdate = (updatedConfigPayload) => {
  emit('update:protocolConfig', updatedConfigPayload);
};
</script>

<style scoped>
.card {
  background: #0f172a;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #1e293b;
}

.card h2 {
  font-size: 0.8rem;
  margin-top: 0;
  margin-bottom: 16px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
}

.select-group label {
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: bold;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper select {
  width: 100%;
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  padding: 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.select-wrapper select:focus {
  border-color: #3b82f6;
}

.select-wrapper::after {
  content: "▼";
  font-size: 0.65rem;
  color: #64748b;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>

