<script setup>
import { computed } from 'vue'

const props = defineProps({
  emergencies: {
    type: Array,
    default: () => []
  }
})

const total = computed(() => {
  return props.emergencies.length
})

const pending = computed(() => {
  return props.emergencies.filter(
    emergency => emergency.status === 'pending'
  ).length
})

const accepted = computed(() => {
  return props.emergencies.filter(
    emergency => emergency.status === 'accepted'
  ).length
})

const resolved = computed(() => {
  return props.emergencies.filter(
    emergency => emergency.status === 'resolved'
  ).length
})

const critical = computed(() => {
  return props.emergencies.filter(
    emergency => emergency.priority === 'Critical' &&
    emergency.status !== 'resolved'
  ).length
})
</script>

<template>

  <section class="stats">

    <!-- TOTAL -->

    <div class="stat-card">

      <div class="stat-icon total-icon">
        🚨
      </div>

      <div class="stat-content">

        <span class="stat-label">
          Total
        </span>

        <strong class="stat-value">
          {{ total }}
        </strong>

      </div>

    </div>

    <!-- PENDING -->

    <div class="stat-card">

      <div class="stat-icon pending-icon">
        ⏳
      </div>

      <div class="stat-content">

        <span class="stat-label">
          Pending
        </span>

        <strong class="stat-value">
          {{ pending }}
        </strong>

      </div>

    </div>

    <!-- ACCEPTED -->

    <div class="stat-card">

      <div class="stat-icon accepted-icon">
        🙋
      </div>

      <div class="stat-content">

        <span class="stat-label">
          Accepted
        </span>

        <strong class="stat-value">
          {{ accepted }}
        </strong>

      </div>

    </div>

    <!-- RESOLVED -->

    <div class="stat-card">

      <div class="stat-icon resolved-icon">
        ✅
      </div>

      <div class="stat-content">

        <span class="stat-label">
          Resolved
        </span>

        <strong class="stat-value">
          {{ resolved }}
        </strong>

      </div>

    </div>

    <!-- CRITICAL -->

    <div class="stat-card critical-card">

      <div class="stat-icon critical-icon">
        🔴
      </div>

      <div class="stat-content">

        <span class="stat-label">
          Critical
        </span>

        <strong class="stat-value">
          {{ critical }}
        </strong>

      </div>

    </div>

  </section>

</template>

<style scoped>

.stats {
  position: absolute;

  top: 20px;
  left: 20px;
  right: 20px;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  gap: 12px;

  z-index: 500;

  pointer-events: none;
}

.stat-card {
  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 12px;

  padding: 13px 15px;

  display: flex;

  align-items: center;

  gap: 11px;

  box-shadow:
    0 4px 15px
    rgba(0, 0, 0, 0.08);

  pointer-events: auto;
}

.stat-icon {
  width: 38px;
  height: 38px;

  flex-shrink: 0;

  border-radius: 9px;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 18px;
}

.total-icon {
  background: #fee2e2;
}

.pending-icon {
  background: #fef3c7;
}

.accepted-icon {
  background: #dbeafe;
}

.resolved-icon {
  background: #dcfce7;
}

.critical-icon {
  background: #fee2e2;
}

.stat-content {
  display: flex;

  flex-direction: column;

  gap: 2px;
}

.stat-label {
  font-size: 11px;

  color: #6b7280;

  font-weight: 500;
}

.stat-value {
  font-size: 20px;

  line-height: 1;

  color: #111827;
}

.critical-card {
  border-color: #fecaca;
}

/* ================================= */
/* TABLET */
/* ================================= */

@media (max-width: 1000px) {

  .stats {
    grid-template-columns:
      repeat(3, 1fr);
  }

}

/* ================================= */
/* MOBILE */
/* ================================= */

@media (max-width: 650px) {

  .stats {
    top: 10px;
    left: 10px;
    right: 10px;

    grid-template-columns:
      repeat(2, 1fr);

    gap: 8px;
  }

  .stat-card {
    padding: 10px;
  }

  .stat-icon {
    width: 32px;
    height: 32px;

    font-size: 15px;
  }

  .stat-value {
    font-size: 17px;
  }

}

</style>