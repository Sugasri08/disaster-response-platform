<script setup>
import { ref } from 'vue'

const props = defineProps({
  active: {
    type: Boolean,
    default: true
  },

  crisisName: {
    type: String,
    default: 'Active Emergency Response'
  },

  location: {
    type: String,
    default: 'Your area'
  }
})

const emit = defineEmits(['close'])

const visible = ref(true)

const closeBanner = () => {
  visible.value = false
  emit('close')
}
</script>

<template>

  <div
    v-if="active && visible"
    class="crisis-banner"
  >

    <!-- LEFT -->
    <div class="crisis-left">

      <div class="crisis-icon">
        🚨
      </div>

      <div class="crisis-content">

        <div class="crisis-label">
          ACTIVE CRISIS
        </div>

        <div class="crisis-name">
          {{ crisisName }}
        </div>

        <div class="crisis-location">
          📍 {{ location }}
        </div>

      </div>

    </div>

    <!-- RIGHT -->
    <div class="crisis-right">

      <div class="status">
        <span class="status-dot"></span>
        Response Mode Active
      </div>

      <button
        class="close-button"
        @click="closeBanner"
        aria-label="Close crisis banner"
      >
        ×
      </button>

    </div>

  </div>

</template>

<style scoped>

.crisis-banner {
  position: absolute;

  top: 15px;
  left: 50%;

  transform: translateX(-50%);

  width: min(720px, calc(100% - 40px));

  min-height: 72px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 12px 16px;

  background:
    linear-gradient(
      135deg,
      #7f1d1d,
      #b91c1c
    );

  color: white;

  border-radius: 14px;

  box-shadow:
    0 8px 25px rgba(127, 29, 29, 0.35);

  z-index: 1000;

  box-sizing: border-box;
}

/* LEFT SIDE */

.crisis-left {
  display: flex;
  align-items: center;
  gap: 12px;

  min-width: 0;
}

.crisis-icon {
  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(255, 255, 255, 0.15);

  border-radius: 12px;

  font-size: 24px;

  flex-shrink: 0;
}

.crisis-content {
  min-width: 0;
}

.crisis-label {
  font-size: 10px;

  font-weight: 800;

  letter-spacing: 1.2px;

  opacity: 0.8;

  margin-bottom: 2px;
}

.crisis-name {
  font-size: 17px;

  font-weight: 800;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.crisis-location {
  margin-top: 2px;

  font-size: 12px;

  opacity: 0.9;
}

/* RIGHT SIDE */

.crisis-right {
  display: flex;
  align-items: center;

  gap: 14px;

  margin-left: 15px;
}

.status {
  display: flex;
  align-items: center;

  gap: 6px;

  font-size: 12px;

  font-weight: 700;

  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;

  background: #facc15;

  border-radius: 50%;

  box-shadow:
    0 0 0 4px rgba(250, 204, 21, 0.2);

  animation: pulse 1.5s infinite;
}

.close-button {
  width: 30px;
  height: 30px;

  border: none;

  border-radius: 8px;

  background: rgba(255, 255, 255, 0.12);

  color: white;

  font-size: 23px;

  line-height: 1;

  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.25);

  transform: scale(1.05);
}

/* PULSE */

@keyframes pulse {

  0% {
    opacity: 1;

    transform: scale(1);
  }

  50% {
    opacity: 0.45;

    transform: scale(0.8);
  }

  100% {
    opacity: 1;

    transform: scale(1);
  }

}

/* MOBILE */

@media (max-width: 650px) {

  .crisis-banner {
    top: 10px;

    width: calc(100% - 20px);

    padding: 10px 12px;
  }

  .crisis-icon {
    width: 38px;
    height: 38px;

    font-size: 20px;
  }

  .crisis-name {
    font-size: 14px;
  }

  .crisis-location {
    font-size: 11px;
  }

  .status {
    display: none;
  }

  .crisis-right {
    margin-left: 8px;
  }

}

</style>