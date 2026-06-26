<template>
  <!-- Floating Action Button for Page Reload -->
  <button 
    class="floating-refresh-btn" 
    @click="handleRefresh" 
    aria-label="Refresh telemetry engine"
  >
    <!-- Optimised Inline SVG for rendering performance -->
    <svg 
      xmlns="http://w3.org" 
      viewBox="0 0 24 24" 
      class="refresh-icon"
    >
      <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  </button>
</template>

<script setup>
/**
 * Hard triggers a complete browser navigation reload, clearing out 
 * hardware audio channels and resetting memory configurations.
 */
const handleRefresh = () => {
  window.location.reload();
};
</script>

<style scoped>
.floating-refresh-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #1a1a1a;
  border: 2px solid #333333;
  color: #00e676; /* Neon green accents matching the telescope UI color scheme */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 4px rgba(0, 230, 118, 0.2);
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease;
  z-index: 9999; /* Keeps button rendering layered safely on top of all telemetry readouts */
  
  /* Mobile Interaction Optimization */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* Fluid hardware accelerated interactions for responsive mobile taps */
.floating-refresh-btn:active {
  transform: scale(0.9);
  background-color: #222222;
  border-color: #00e676;
}

.refresh-icon {
  width: 24px;
  height: 24px;
  fill: currentColor; /* Inherits the neon green color context from parent button */
}
</style>
