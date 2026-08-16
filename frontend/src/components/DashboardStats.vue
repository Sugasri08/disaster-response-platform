<script setup>
import { computed } from 'vue'

const props = defineProps({
  emergencies: {
    type: Array,
    default: () => []
  }
})

const total = computed(() =>
  props.emergencies.length
)

const pending = computed(() =>
  props.emergencies.filter(
    emergency =>
      emergency.status === 'pending'
  ).length
)

const accepted = computed(() =>
  props.emergencies.filter(
    emergency =>
      emergency.status === 'accepted'
  ).length
)

const resolved = computed(() =>
  props.emergencies.filter(
    emergency =>
      emergency.status === 'resolved'
  ).length
)

const critical = computed(() =>
  props.emergencies.filter(
    emergency =>
      emergency.priority === 'Critical' &&
      emergency.status !== 'resolved'
  ).length
)
</script>

<template>

  <section class="stats">

    <div class="stat-card">

      <div class="stat-icon total">
        🚨
      </div>

      <div>
        <span>Total</span>
        <strong>{{ total }}</strong>
      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon pending">
        ⏳
      </div>

      <div>
        <span>Pending</span>
        <strong>{{ pending }}</strong>
      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon accepted">
        🙋
      </div>

      <div>
        <span>Accepted</span>
        <strong>{{ accepted }}</strong>
      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon resolved">
        ✅
      </div>

      <div>
        <span>Resolved</span>
        <strong>{{ resolved }}</strong>
      </div>

    </div>


    <div class="stat-card">

      <div class="stat-icon critical">
        🔴
      </div>

      <div>
        <span>Critical</span>
        <strong>{{ critical }}</strong>
      </div>

    </div>

  </section>

</template>

<style scoped>

.stats {
  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  gap: 12px;

  margin-bottom: 18px;
}

.stat-card {
  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 12px;

  padding: 13px;

  display: flex;

  align-items: center;

  gap: 11px;

  box-shadow:
    0 2px 8px
    rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 38px;

  height: 38px;

  border-radius: 9px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 18px;
}

.stat-icon.total {
  background: #fee2e2;
}

.stat-icon.pending {
  background: #fef3c7;
}

.stat-icon.accepted {
  background: #dbeafe;
}

.stat-icon.resolved {
  background: #dcfce7;
}

.stat-icon.critical {
  background: #fee2e2;
}

.stat-card span {
  display: block;

  font-size: 11px;

  color: #6b7280;
}

.stat-card strong {
  display: block;

  margin-top: 2px;

  font-size: 20px;

  color: #111827;
}

@media (max-width: 900px) {

  .stats {
    grid-template-columns:
      repeat(3, 1fr);
  }

}

@media (max-width: 600px) {

  .stats {
    grid-template-columns:
      repeat(2, 1fr);
  }

}

</style>