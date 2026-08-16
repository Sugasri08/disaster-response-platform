<script setup>

import EmergencyCard from './EmergencyCard.vue'

defineProps({
  emergencies: {
    type: Array,
    default: () => []
  },

  loading: {
    type: Boolean,
    default: false
  },

  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'updated',
  'focus-map',
  'refresh'
])

</script>

<template>

  <section class="emergency-list">

    <div
      v-if="loading"
      class="state"
    >

      <div class="spinner"></div>

      Loading emergencies...

    </div>


    <div
      v-else-if="error"
      class="state error"
    >

      ⚠️

      <p>
        {{ error }}
      </p>

      <button
        @click="emit('refresh')"
      >
        Try Again
      </button>

    </div>


    <div
      v-else-if="emergencies.length === 0"
      class="state"
    >

      <div class="empty-icon">
        🎉
      </div>

      <strong>
        No emergency requests
      </strong>

      <p>
        No requests match your filters.
      </p>

    </div>


    <div
      v-else
      class="cards"
    >

      <EmergencyCard
        v-for="emergency in emergencies"
        :key="emergency._id"
        :emergency="emergency"

        @updated="
          emit('updated', $event)
        "

        @focus-map="
          emit('focus-map', $event)
        "
      />

    </div>

  </section>

</template>

<style scoped>

.emergency-list {
  width: 100%;
}

.cards {
  display: flex;

  flex-direction: column;

  gap: 12px;
}

.state {
  min-height: 200px;

  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 13px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 8px;

  color: #6b7280;

  font-size: 13px;

  text-align: center;

  padding: 25px;
}

.state strong {
  color: #374151;
}

.state p {
  margin: 0;

  font-size: 12px;
}

.state button {
  border: none;

  background: #ef4444;

  color: white;

  padding: 8px 13px;

  border-radius: 7px;

  font-size: 11px;

  font-weight: 600;
}

.empty-icon {
  font-size: 30px;
}

.error {
  color: #dc2626;
}

.spinner {
  width: 28px;

  height: 28px;

  border:
    3px solid #e5e7eb;

  border-top-color: #ef4444;

  border-radius: 50%;

  animation: spin 0.8s linear infinite;
}

@keyframes spin {

  to {
    transform: rotate(360deg);
  }

}

</style>