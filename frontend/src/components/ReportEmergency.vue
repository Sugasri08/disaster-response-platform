<script setup>
import { ref } from 'vue'
import { createEmergency } from '../services/api'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const emit = defineEmits([
  'close',
  'created'
])

const selectedType = ref('')

const selectedPriority = ref('Low')

const description = ref('')

const selectedLocation = ref(null)

const submitting = ref(false)

const error = ref('')

// ------------------------------------
// HELP TYPES
// ------------------------------------

const helpTypes = [
  {
    type: 'Water',
    icon: '💧'
  },
  {
    type: 'Medical',
    icon: '🏥'
  },
  {
    type: 'Food',
    icon: '🍱'
  },
  {
    type: 'Rescue',
    icon: '🛟'
  },
  {
    type: 'Shelter',
    icon: '🏠'
  },
  {
    type: 'Power',
    icon: '⚡'
  }
]

// ------------------------------------
// SELECT TYPE
// ------------------------------------

const selectHelpType = (type) => {
  selectedType.value = type
}

// ------------------------------------
// SELECT LOCATION
// ------------------------------------

const selectLocation = () => {

  const latitude = window.prompt(
    'Enter latitude:'
  )

  const longitude = window.prompt(
    'Enter longitude:'
  )

  if (
    latitude === null ||
    longitude === null
  ) {
    return
  }

  const lat = Number(latitude)
  const lng = Number(longitude)

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {

    error.value =
      'Please enter valid latitude and longitude.'

    return
  }

  selectedLocation.value = {
    latitude: lat,
    longitude: lng
  }

  error.value = ''
}

// ------------------------------------
// SUBMIT
// ------------------------------------

const submitEmergency = async () => {

  error.value = ''

  if (!selectedType.value) {

    error.value =
      'Please select the type of help needed.'

    return
  }

  if (!description.value.trim()) {

    error.value =
      'Please describe the situation.'

    return
  }

  if (!selectedLocation.value) {

    error.value =
      'Please select a location.'

    return
  }

  try {

    submitting.value = true

    let docRef = null
    const user = auth.currentUser
    if (user) {
      const severityMap = {
        Low: 'Low',
        Medium: 'Medium',
        Critical: 'High'
      }
      docRef = await addDoc(collection(db, 'emergencies'), {
        requesterId: user.uid,
        requesterName: user.displayName || 'Help Seeker',
        crisisId: 'default',
        type: selectedType.value,
        severity: severityMap[selectedPriority.value] || 'Low',
        description: description.value.trim(),
        address: null,
        contact: null,
        additionalInfo: null,
        latitude: selectedLocation.value.latitude,
        longitude: selectedLocation.value.longitude,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    const emergency = {
      type: selectedType.value,

      priority: selectedPriority.value,

      description:
        description.value.trim(),

      latitude:
        selectedLocation.value.latitude,

      longitude:
        selectedLocation.value.longitude,

      firestoreId: docRef ? docRef.id : null
    }

    const response =
      await createEmergency(emergency)

    console.log(
      '🚨 Emergency created:',
      response
    )

    emit(
      'created',
      response.emergency
    )

    emit('close')

  } catch (err) {

    console.error(
      '❌ Failed to create emergency:',
      err
    )

    error.value =
      err.response?.data?.message ||
      'Failed to submit emergency.'

  } finally {

    submitting.value = false

  }
}

// ------------------------------------
// CLOSE
// ------------------------------------

const close = () => {

  if (submitting.value) {
    return
  }

  emit('close')
}

</script>

<template>

  <div
    class="modal-overlay"
    @click.self="close"
  >

    <div class="report-modal">

      <!-- HEADER -->

      <div class="modal-header">

        <div>

          <h2>
            Report an Emergency
          </h2>

          <p>
            Tell us what help is needed.
          </p>

        </div>

        <button
          class="close-button"
          @click="close"
        >
          ✕
        </button>

      </div>


      <!-- ERROR -->

      <div
        v-if="error"
        class="error-box"
      >
        ⚠️ {{ error }}
      </div>


      <!-- HELP TYPE -->

      <div class="form-section">

        <label>
          What kind of help is needed?
        </label>

        <div class="help-grid">

          <button
            v-for="item in helpTypes"
            :key="item.type"
            class="help-option"
            :class="{
              selected:
                selectedType === item.type
            }"
            @click="
              selectHelpType(item.type)
            "
          >

            <span>
              {{ item.icon }}
            </span>

            {{ item.type }}

          </button>

        </div>

      </div>


      <!-- PRIORITY -->

      <div class="form-section">

        <label>
          Priority
        </label>

        <div class="priority-options">

          <label>

            <input
              v-model="selectedPriority"
              type="radio"
              value="Low"
              name="priority"
            >

            Low

          </label>

          <label>

            <input
              v-model="selectedPriority"
              type="radio"
              value="Medium"
              name="priority"
            >

            Medium

          </label>

          <label>

            <input
              v-model="selectedPriority"
              type="radio"
              value="Critical"
              name="priority"
            >

            Critical

          </label>

        </div>

      </div>


      <!-- DESCRIPTION -->

      <div class="form-section">

        <label for="description">
          Describe the situation
        </label>

        <textarea
          id="description"
          v-model="description"
          placeholder="Tell us what is happening..."
          rows="4"
        ></textarea>

      </div>


      <!-- LOCATION -->

      <div class="form-section">

        <label>
          Location
        </label>

        <button
          class="location-selector"
          @click="selectLocation"
        >

          <span>
            📍
          </span>

          <span
            v-if="selectedLocation"
          >

            {{
              selectedLocation.latitude.toFixed(5)
            }},
            {{
              selectedLocation.longitude.toFixed(5)
            }}

          </span>

          <span v-else>
            Select location
          </span>

        </button>

        <p class="location-hint">
          For now, enter the coordinates of the
          emergency location.
        </p>

      </div>


      <!-- SUBMIT -->

      <button
        class="submit-button"
        :disabled="submitting"
        @click="submitEmergency"
      >

        <span v-if="submitting">
          Submitting...
        </span>

        <span v-else>
          🚨 Submit Emergency
        </span>

      </button>

    </div>

  </div>

</template>

<style scoped>

.modal-overlay {
  position: fixed;

  inset: 0;

  background:
    rgba(17, 24, 39, 0.45);

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 16px;

  z-index: 5000;
}

.report-modal {
  width: 480px;

  max-width: 100%;

  max-height: 90vh;

  overflow-y: auto;

  background: white;

  border-radius: 16px;

  padding: 24px;

  box-shadow:
    0 20px 50px
    rgba(0, 0, 0, 0.2);
}


/* HEADER */

.modal-header {
  display: flex;

  justify-content:
    space-between;

  align-items:
    flex-start;

  margin-bottom: 22px;
}

.modal-header h2 {
  margin: 0;

  font-size: 21px;

  color: #111827;
}

.modal-header p {
  margin: 5px 0 0;

  font-size: 13px;

  color: #6b7280;
}

.close-button {
  border: none;

  background: #f3f4f6;

  width: 32px;

  height: 32px;

  border-radius: 50%;

  font-size: 14px;
}


/* ERROR */

.error-box {
  margin-bottom: 18px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #fef2f2;

  border: 1px solid #fecaca;

  color: #dc2626;

  font-size: 12px;

  font-weight: 600;
}


/* FORM */

.form-section {
  margin-bottom: 20px;
}

.form-section > label {
  display: block;

  margin-bottom: 9px;

  font-size: 14px;

  font-weight: 600;

  color: #374151;
}


/* HELP */

.help-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 9px;
}

.help-option {
  border: 1px solid #e5e7eb;

  background: #fafafa;

  padding: 13px;

  border-radius: 9px;

  display: flex;

  align-items: center;

  gap: 9px;

  font-size: 13px;

  color: #374151;

  transition: 0.2s;
}

.help-option span {
  font-size: 19px;
}

.help-option:hover {
  border-color: #ef4444;

  background: #fff5f5;
}

.help-option.selected {
  border-color: #ef4444;

  background: #fff1f2;

  color: #dc2626;

  font-weight: 700;
}


/* PRIORITY */

.priority-options {
  display: flex;

  gap: 18px;

  flex-wrap: wrap;
}

.priority-options label {
  display: flex;

  align-items: center;

  gap: 5px;

  font-size: 13px;

  cursor: pointer;
}


/* DESCRIPTION */

textarea {
  width: 100%;

  resize: vertical;

  border:
    1px solid #d1d5db;

  border-radius: 9px;

  padding: 11px;

  font-size: 13px;

  outline: none;
}

textarea:focus {
  border-color: #ef4444;
}


/* LOCATION */

.location-selector {
  width: 100%;

  border:
    1px solid #d1d5db;

  background: #f9fafb;

  padding: 11px;

  border-radius: 9px;

  display: flex;

  align-items: center;

  gap: 8px;

  text-align: left;

  color: #374151;

  font-size: 13px;
}

.location-selector:hover {
  background: #f3f4f6;
}

.location-hint {
  margin: 6px 0 0;

  font-size: 10px;

  color: #9ca3af;
}


/* SUBMIT */

.submit-button {
  width: 100%;

  border: none;

  background: #ef4444;

  color: white;

  padding: 13px;

  border-radius: 9px;

  font-size: 14px;

  font-weight: 700;

  transition: 0.2s;
}

.submit-button:hover {
  background: #dc2626;
}

.submit-button:disabled {
  opacity: 0.6;

  cursor: not-allowed;
}


/* MOBILE */

@media (max-width: 500px) {

  .report-modal {
    padding: 18px;
  }

  .help-grid {
    grid-template-columns: 1fr;
  }

}

</style>