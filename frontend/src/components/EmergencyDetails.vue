<script setup>

import { computed } from 'vue'

import {
  acceptEmergency,
  resolveEmergency
} from '../services/api'


// ====================================
// PROPS
// ====================================

const props = defineProps({

  emergency: {
    type: Object,
    default: null
  },

  volunteerId: {
    type: String,
    default: ''
  }

})


// ====================================
// EVENTS
// ====================================

const emit = defineEmits([
  'accepted',
  'resolved',
  'close'
])


// ====================================
// BUTTON STATE
// ====================================

const isAccepting = computed(() => {

  return (
    props.emergency &&
    props.emergency.status === 'pending'
  )

})


const isMyTask = computed(() => {

  return (
    props.emergency &&
    props.emergency.status === 'accepted' &&
    props.emergency.assignedVolunteer ===
      props.volunteerId
  )

})


// ====================================
// PRIORITY CLASS
// ====================================

const priorityClass = computed(() => {

  if (!props.emergency) {
    return ''
  }

  return props.emergency.priority
    .toLowerCase()

})


// ====================================
// ACCEPT EMERGENCY
// ====================================

const handleAccept = async () => {

  if (!props.emergency) {
    return
  }

  if (!props.volunteerId) {

    alert(
      'Volunteer ID is missing.'
    )

    return
  }

  try {

    console.log(
      '🙋 Accepting emergency:',
      props.emergency._id
    )

    console.log(
      '👤 Volunteer:',
      props.volunteerId
    )


    const response =
      await acceptEmergency(

        props.emergency._id,

        props.volunteerId

      )


    console.log(
      '✅ Emergency accepted:',
      response.emergency
    )


    emit(
      'accepted',
      response.emergency
    )

  } catch (error) {

    console.error(
      '❌ Failed to accept emergency:',
      error
    )


    const message =
      error.response?.data?.message ||
      'Could not accept this emergency.'


    alert(message)

  }

}


// ====================================
// RESOLVE EMERGENCY
// ====================================

const handleResolve = async () => {

  if (!props.emergency) {
    return
  }

  try {

    console.log(
      '✅ Resolving emergency:',
      props.emergency._id
    )


    const response =
      await resolveEmergency(
        props.emergency._id
      )


    console.log(
      '✅ Emergency resolved:',
      response.emergency
    )


    emit(
      'resolved',
      response.emergency
    )

  } catch (error) {

    console.error(
      '❌ Failed to resolve emergency:',
      error
    )


    const message =
      error.response?.data?.message ||
      'Could not resolve this emergency.'


    alert(message)

  }

}


// ====================================
// CLOSE
// ====================================

const closeDetails = () => {

  emit('close')

}

</script>


<template>

  <div
    v-if="emergency"
    class="emergency-details"
  >

    <!-- ================================= -->
    <!-- HEADER -->
    <!-- ================================= -->

    <div class="details-header">

      <div class="type-area">

        <div class="type-icon">

          {{ emergency.type === 'Medical Aid'
            ? '🚑'
            : emergency.type === 'Potable Water'
              ? '💧'
              : emergency.type === 'Search & Rescue'
                ? '🛟'
                : emergency.type === 'Shelter'
                  ? '🏠'
                  : '🚨'
          }}

        </div>

        <div>

          <div class="crisis-label">
            🚨 CRISIS REQUEST
          </div>

          <h2>
            {{ emergency.type }}
          </h2>

        </div>

      </div>


      <button
        class="close-button"
        @click="closeDetails"
      >
        ✕
      </button>

    </div>


    <!-- ================================= -->
    <!-- PRIORITY + STATUS -->
    <!-- ================================= -->

    <div class="status-row">

      <span
        class="priority"
        :class="priorityClass"
      >
        {{ emergency.priority }}
      </span>


      <span
        class="status"
        :class="emergency.status"
      >

        {{
          emergency.status === 'pending'
            ? '⏳ Waiting for help'
            : emergency.status === 'accepted'
              ? '🙋 Help is on the way'
              : '✅ Resolved'
        }}

      </span>

    </div>


    <!-- ================================= -->
    <!-- DESCRIPTION -->
    <!-- ================================= -->

    <div class="section">

      <div class="section-title">
        What happened?
      </div>

      <p class="description">
        {{ emergency.description }}
      </p>

    </div>


    <!-- ================================= -->
    <!-- LOCATION -->
    <!-- ================================= -->

    <div class="info-row">

      <span>
        📍 Location
      </span>

      <strong>

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

      </strong>

    </div>


    <!-- ================================= -->
    <!-- TIME -->
    <!-- ================================= -->

    <div
      v-if="emergency.createdAt"
      class="info-row"
    >

      <span>
        🕒 Reported
      </span>

      <strong>

        {{
          new Date(
            emergency.createdAt
          ).toLocaleString()
        }}

      </strong>

    </div>


    <!-- ================================= -->
    <!-- ASSIGNED VOLUNTEER -->
    <!-- ================================= -->

    <div
      v-if="emergency.assignedVolunteer"
      class="volunteer-info"
    >

      🙋 Volunteer assigned

      <strong>
        {{ emergency.assignedVolunteer }}
      </strong>

    </div>


    <!-- ================================= -->
    <!-- ACTIONS -->
    <!-- ================================= -->

    <div class="actions">


      <!-- ACCEPT -->

      <button
        v-if="isAccepting"
        class="accept-button"
        @click="handleAccept"
      >

        🙋 I Can Help

      </button>


      <!-- ALREADY MY TASK -->

      <button
        v-if="isMyTask"
        class="resolve-button"
        @click="handleResolve"
      >

        ✅ Mark as Resolved

      </button>


      <!-- OTHER VOLUNTEER -->

      <div
        v-if="
          emergency.status === 'accepted' &&
          !isMyTask
        "
        class="already-accepted"
      >

        🙋 Another volunteer is
        already helping.

      </div>


      <!-- RESOLVED -->

      <div
        v-if="
          emergency.status === 'resolved'
        "
        class="resolved-message"
      >

        ✅ This emergency has been
        resolved.

      </div>

    </div>

  </div>

</template>


<style scoped>

/* ================================= */
/* PANEL */
/* ================================= */

.emergency-details {

  width: 370px;

  max-width:
    calc(100vw - 30px);

  background: white;

  border-radius: 16px;

  padding: 18px;

  box-shadow:
    0 15px 40px
    rgba(0, 0, 0, 0.2);

}


/* ================================= */
/* HEADER */
/* ================================= */

.details-header {

  display: flex;

  align-items: flex-start;

  justify-content:
    space-between;

  margin-bottom: 15px;

}

.type-area {

  display: flex;

  align-items: center;

  gap: 11px;

}

.type-icon {

  width: 43px;

  height: 43px;

  border-radius: 12px;

  background: #fff1f2;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 23px;

}

.crisis-label {

  color: #dc2626;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: .5px;

  margin-bottom: 2px;

}

.details-header h2 {

  margin: 0;

  font-size: 18px;

  color: #111827;

}

.close-button {

  border: none;

  width: 30px;

  height: 30px;

  border-radius: 50%;

  background: #f3f4f6;

  cursor: pointer;

  color: #6b7280;

}

.close-button:hover {

  background: #e5e7eb;

}


/* ================================= */
/* STATUS */
/* ================================= */

.status-row {

  display: flex;

  gap: 8px;

  flex-wrap: wrap;

  margin-bottom: 17px;

}

.priority,
.status {

  padding:
    5px 9px;

  border-radius: 7px;

  font-size: 11px;

  font-weight: 700;

}

.priority.low {

  background: #dcfce7;

  color: #15803d;

}

.priority.medium {

  background: #fef3c7;

  color: #b45309;

}

.priority.critical {

  background: #fee2e2;

  color: #dc2626;

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

  color: #15803d;

}


/* ================================= */
/* SECTION */
/* ================================= */

.section {

  margin-bottom: 15px;

}

.section-title {

  font-size: 12px;

  font-weight: 700;

  color: #6b7280;

  margin-bottom: 5px;

}

.description {

  margin: 0;

  color: #374151;

  font-size: 13px;

  line-height: 1.5;

}


/* ================================= */
/* INFO */
/* ================================= */

.info-row {

  display: flex;

  justify-content:
    space-between;

  gap: 10px;

  padding:
    9px 0;

  border-top:
    1px solid #f3f4f6;

  font-size: 11px;

}

.info-row span {

  color: #6b7280;

}

.info-row strong {

  color: #374151;

  text-align: right;

  max-width: 210px;

}


/* ================================= */
/* VOLUNTEER */
/* ================================= */

.volunteer-info {

  margin-top: 9px;

  padding: 10px;

  border-radius: 9px;

  background: #eff6ff;

  color: #2563eb;

  font-size: 12px;

  display: flex;

  flex-direction: column;

  gap: 3px;

}

.volunteer-info strong {

  color: #1d4ed8;

}


/* ================================= */
/* ACTIONS */
/* ================================= */

.actions {

  margin-top: 17px;

}


.accept-button,
.resolve-button {

  width: 100%;

  border: none;

  padding: 13px;

  border-radius: 10px;

  color: white;

  font-size: 14px;

  font-weight: 750;

  cursor: pointer;

  transition:
    .2s ease;

}

.accept-button {

  background: #16a34a;

  box-shadow:
    0 5px 14px
    rgba(22, 163, 74, .25);

}

.accept-button:hover {

  background: #15803d;

  transform:
    translateY(-1px);

}

.resolve-button {

  background: #2563eb;

  box-shadow:
    0 5px 14px
    rgba(37, 99, 235, .25);

}

.resolve-button:hover {

  background: #1d4ed8;

  transform:
    translateY(-1px);

}


/* ================================= */
/* MESSAGES */
/* ================================= */

.already-accepted,
.resolved-message {

  padding: 11px;

  border-radius: 9px;

  text-align: center;

  font-size: 12px;

  font-weight: 650;

}

.already-accepted {

  background: #eff6ff;

  color: #2563eb;

}

.resolved-message {

  background: #dcfce7;

  color: #15803d;

}


/* ================================= */
/* MOBILE */
/* ================================= */

@media (max-width: 600px) {

  .emergency-details {

    width: auto;

  }

}

</style>