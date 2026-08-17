<script setup>

import { ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  acceptEmergency,
  resolveEmergency
} from '../services/api'

const router = useRouter()

const props = defineProps({
  emergency: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'updated',
  'focus-map'
])

const processing = ref(false)

const getIcon = (type) => {

  const icons = {
    Water: '💧',
    Medical: '🏥',
    Food: '🍱',
    Rescue: '🛟',
    Shelter: '🏠',
    Power: '⚡'
  }

  return icons[type] || '🚨'
}

const handleAccept = async () => {

  const volunteerId =
    localStorage.getItem(
      'aidmap_volunteer_id'
    )

  if (!volunteerId) {

    const entered =
      window.prompt(
        'Enter your Volunteer ID:'
      )

    if (!entered?.trim()) {
      return
    }

    localStorage.setItem(
      'aidmap_volunteer_id',
      entered.trim()
    )
  }

  try {

    processing.value = true

    const id =
      localStorage.getItem(
        'aidmap_volunteer_id'
      )

    const response =
      await acceptEmergency(
        props.emergency._id,
        id
      )

    emit(
      'updated',
      response.emergency
    )

  } catch (error) {

    console.error(error)

    alert(
      error.response?.data?.message ||
      'Failed to accept emergency.'
    )

  } finally {

    processing.value = false
  }
}

const handleResolve = async () => {

  if (
    !window.confirm(
      'Mark this emergency as resolved?'
    )
  ) {
    return
  }

  try {

    processing.value = true

    const response =
      await resolveEmergency(
        props.emergency._id
      )

    emit(
      'updated',
      response.emergency
    )

  } catch (error) {

    console.error(error)

    alert(
      error.response?.data?.message ||
      'Failed to resolve emergency.'
    )

  } finally {

    processing.value = false
  }
}

const focusMap = () => {

  emit(
    'focus-map',
    {
      latitude:
        props.emergency.latitude,

      longitude:
        props.emergency.longitude
    }
  )
}

const getRequiredSkill = (type) => {
  const mapping = {
    'Medical': 'Medical',
    'Transport': 'Transport',
    'Food/Supplies': 'Supplies',
    'Food': 'Supplies',
    'Power': 'Supplies',
    'Water': 'Supplies',
    'Shelter': 'Shelter',
    'Rescue': 'Transport'
  }
  return mapping[type] || 'None'
}

const formatDate = (date) => {

  if (!date) {
    return ''
  }

  return new Date(date).toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  )
}

</script>

<template>

  <article
    class="emergency-card"
    :class="{
      critical:
        emergency.priority === 'Critical',

      resolved:
        emergency.status === 'resolved'
    }"
  >

    <div class="card-header">

      <div class="type-section">

        <div class="type-icon">
          {{ getIcon(emergency.type) }}
        </div>

        <div>

          <h3>
            {{ emergency.type }}
          </h3>

          <span class="time">
            {{ formatDate(emergency.createdAt) }}
          </span>

        </div>

      </div>


      <span
        class="priority"
        :class="
          emergency.priority.toLowerCase()
        "
      >
        {{ emergency.priority }}
      </span>

    </div>


    <p class="description">
      {{ emergency.description }}
    </p>


    <button
      class="location"
      @click="focusMap"
    >

      📍

      <span>
        {{
          Number(
            emergency.latitude
          ).toFixed(5)
        }},
        {{
          Number(
            emergency.longitude
          ).toFixed(5)
        }}
        <span v-if="emergency.distance !== undefined && emergency.distance !== null" style="color: #2563eb; font-weight: 700; margin-left: 5px;">
          ({{ emergency.distance.toFixed(2) }} km)
        </span>
      </span>

      <span class="map-link">
        View map →
      </span>

    </button>

    <div class="skill-required" style="margin: 8px 0; font-size: 11px; color: #475569;">
      🛠️ Required Skill: <strong style="color: #0f172a;">{{ getRequiredSkill(emergency.type) }}</strong>
    </div>


    <div class="status-row">

      <span
        class="status"
        :class="emergency.status"
      >

        <span
          v-if="
            emergency.status === 'pending'
          "
        >
          ⏳
        </span>

        <span
          v-else-if="
            emergency.status === 'accepted'
          "
        >
          🙋
        </span>

        <span v-else>
          ✅
        </span>

        {{ emergency.status }}

      </span>


      <span
        v-if="
          emergency.assignedVolunteer || emergency.assignedVolunteerName
        "
        class="volunteer"
      >
        👤
        {{ emergency.assignedVolunteerName || emergency.assignedVolunteer }}
      </span>

    </div>


    <div class="actions">

      <button
        v-if="
          emergency.status === 'pending'
        "
        class="accept"
        @click="router.push('/emergency/' + (emergency.firestoreId || emergency._id))"
      >
        📋 VIEW DETAILS
      </button>


      <button
        v-if="
          emergency.status === 'accepted'
        "
        class="resolve"
        :disabled="processing"
        @click="handleResolve"
      >

        {{
          processing
            ? 'Processing...'
            : '✅ Mark Resolved'
        }}

      </button>


      <div
        v-if="
          emergency.status === 'resolved'
        "
        class="resolved-message"
      >
        ✅ Emergency resolved
      </div>

    </div>

  </article>

</template>

<style scoped>

.emergency-card {
  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 13px;

  padding: 15px;

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.04);
}

.emergency-card.critical {
  border-left:
    4px solid #ef4444;
}

.emergency-card.resolved {
  opacity: 0.75;
}

.card-header {
  display: flex;

  justify-content:
    space-between;

  gap: 10px;
}

.type-section {
  display: flex;

  align-items: center;

  gap: 10px;
}

.type-icon {
  width: 40px;

  height: 40px;

  background: #f3f4f6;

  border-radius: 9px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 20px;
}

.type-section h3 {
  margin: 0;

  font-size: 15px;

  color: #111827;
}

.time {
  display: block;

  margin-top: 3px;

  color: #9ca3af;

  font-size: 10px;
}

.priority {
  height: fit-content;

  padding: 5px 9px;

  border-radius: 20px;

  font-size: 10px;

  font-weight: 700;
}

.priority.critical {
  background: #fee2e2;

  color: #dc2626;
}

.priority.medium {
  background: #fef3c7;

  color: #d97706;
}

.priority.low {
  background: #dcfce7;

  color: #16a34a;
}

.description {
  margin: 13px 0;

  color: #374151;

  font-size: 13px;

  line-height: 1.5;
}

.location {
  width: 100%;

  border: none;

  background: #f9fafb;

  border-radius: 8px;

  padding: 9px;

  display: flex;

  align-items: center;

  gap: 6px;

  color: #6b7280;

  font-size: 11px;

  text-align: left;
}

.location:hover {
  background: #f3f4f6;
}

.map-link {
  margin-left: auto;

  color: #2563eb;

  font-weight: 600;
}

.status-row {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  margin-top: 11px;
}

.status {
  padding: 5px 9px;

  border-radius: 20px;

  font-size: 10px;

  font-weight: 600;

  text-transform: capitalize;
}

.status.pending {
  background: #fef3c7;

  color: #b45309;
}

.status.accepted {
  background: #dbeafe;

  color: #2563eb;
}

.status.resolved {
  background: #dcfce7;

  color: #16a34a;
}

.volunteer {
  color: #6b7280;

  font-size: 10px;
}

.actions {
  margin-top: 11px;
}

.accept,
.resolve {
  width: 100%;

  border: none;

  padding: 10px;

  border-radius: 8px;

  color: white;

  font-size: 12px;

  font-weight: 700;
}

.accept {
  background: #22c55e;
}

.accept:hover {
  background: #16a34a;
}

.resolve {
  background: #2563eb;
}

.resolve:hover {
  background: #1d4ed8;
}

.accept:disabled,
.resolve:disabled {
  opacity: 0.6;

  cursor: not-allowed;
}

.resolved-message {
  padding: 9px;

  border-radius: 8px;

  text-align: center;

  background: #f0fdf4;

  color: #16a34a;

  font-size: 11px;

  font-weight: 600;
}

</style>