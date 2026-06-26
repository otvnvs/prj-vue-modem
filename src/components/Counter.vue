<template>
  <div class="metrics-card">
    <div class="card-icon-wrapper">
      <span class="card-icon">⚡</span>
    </div>
    
    <h2 class="card-label">Performance Metrics</h2>
    
    <div class="counter-display">
      <span class="counter-value">{{ count }}</span>
      <span class="counter-unit">actions tracked</span>
    </div>
    
    <div class="card-actions">
      <button class="btn-primary" @click="count++">
        Increment Value
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>

<style scoped>
.metrics-card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem 1.5rem;
  width: 100%;
  max-width: 380px; /* Constraints extreme scaling on large monitors */
  box-sizing: border-box;
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 
              0 8px 10px -6px rgba(0, 0, 0, 0.3);
}

.card-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.card-icon {
  font-size: 1.25rem;
}

.card-label {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
}

.counter-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 2rem;
}

.counter-value {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
  color: var(--text-main);
  letter-spacing: -0.05em;
}

.counter-unit {
  font-size: 0.85rem;
  color: var(--accent-color);
  font-weight: 500;
}

.card-actions {
  width: 100%;
}

.btn-primary {
  width: 100%; /* Spans full card bounds on mobile layouts for effortless tapping */
  background-color: var(--accent-color);
  color: #0b0b0c; /* Deep contrast tone inside the bright button face */
  border: none;
  padding: 0.875rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s ease, opacity 0.1s ease;
}

/* Tactile mobile tap physics simulation */
.btn-primary:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* Tablet and Desktop Button adjustments */
@media (min-width: 480px) {
  .btn-primary {
    width: auto; /* Shrinks button structure gracefully on larger screen sizes */
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
</style>
