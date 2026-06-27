<template>
  <div class="dialog-overlay" @click.self="props.onCancel">
    <div class="dialog-box">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-message">{{ message }}</p>
      
      <input 
        v-model="inputValue" 
        type="text" 
        :placeholder="placeholder" 
        class="dialog-input"
        @keydown.enter="submit"
        @keydown.esc="props.onCancel"
        ref="inputField"
      />

      <div class="dialog-actions">
        <button class="dialog-btn secondary" @click="props.onCancel">Cancel</button>
        <button class="dialog-btn primary" @click="submit">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  title: String,
  message: String,
  placeholder: String,
  onConfirm: Function,
  onCancel: Function
});

const inputValue = ref('');
const inputField = ref(null);

onMounted(() => {
  inputField.value?.focus();
});

const submit = () => {
  props.onConfirm(inputValue.value);
};
</script>

<style scoped>
/* Shares layout stylings with Alert */
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
.dialog-message { margin: 0 0 16px 0; font-size: 15px; color: #555; }

.dialog-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
}
.dialog-input:focus {
  border-color: #007aff;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.dialog-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.dialog-btn.primary { background-color: #007aff; color: white; }
.dialog-btn.secondary { background-color: #f0f0f2; color: #333; }
</style>

