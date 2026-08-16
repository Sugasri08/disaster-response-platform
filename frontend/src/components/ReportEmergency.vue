<script setup>
import { ref } from 'vue'
import { createEmergency } from '../services/api'

const props = defineProps({
  location: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'close',
  'submitted'
])

const selectedType = ref('')
const selectedPriority = ref('Low')
const description = ref('')
const submitting = ref(false)

const helpTypes = [
  {
    name: 'Water',
    icon: '💧'
  },
  {
    name: 'Medical',
    icon: '🏥'
  },
  {
    name: 'Food',
    icon: '🍱'
  },
  {
    name: 'Rescue',
    icon: '🛟'
  },
  {
    name: 'Shelter',
    icon: '🏠'
  },
  {
    name: 'Power',
    icon: '⚡'
  }
]

const selectHelpType = (type) => {
  selectedType.value = type
}

const submitEmergency = async () => {

  if (!selectedType.value) {
    alert(
      'Please select the type of help needed.'
    )
    return
  }

  if (!description.value.trim()) {
    alert(
      'Please describe the situation.'
    )
    return
  }

  if (!props.location) {
    alert(
      'Please select a location on the map.'
    )
    return
  }

  const emergency = {
    type: selectedType.value,

    priority: selectedPriority.value,

    description:
      description.value.trim(),

    latitude:
      props.location.latitude,

    longitude:
      props.location.longitude
  }

  try {

    submitting.value = true

    console.log(
      '🚨 Sending emergency:',
      emergency
    )

    const response =
      await createEmergency(emergency)

    console.log(
      '✅ Emergency created:',
      response
    )

    alert(
      'Emergency reported successfully! 🚨'
    )

    // Reset form

    selectedType.value = ''
    selectedPriority.value = 'Low'
    description.value = ''

    emit(
      'submitted',
      response.emergency
    )

    emit('close')

  } catch (error) {

    console.error(
      '❌ Failed to submit emergency:',
      error
    )

    const message =
      error.response?.data?.message ||
      'Failed to submit emergency. Please try again.'

    alert(message)

  } finally {

    submitting.value = false

  }
}
</script>

<template>

  <div
    class="modal-overlay"
    @click.self="$emit('close')"
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
          @click="$emit('close')"
        >
          ✕
        </button>

      </div>

      <!-- HELP TYPE -->

      <div class="form-section">

        <label>
          What kind of help is needed?
        </label>

        <div class="help-grid">

          <button
            v-for="help in helpTypes"
            :key="help.name"
            class="help-option"
            :class="{
              selected:
                selectedType === help.name
            }"
            @click="
              selectHelpType(help.name)
            "
          >

            <span>
              {{ help.icon }}
            </span>

            {{ help.name }}

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
              type="radio"
              name="priority"
              value="Low"
              v-model="selectedPriority"
            >

            Low

          </label>

          <label>

            <input
              type="radio"
              name="priority"
              value="Medium"
              v-model="selectedPriority"
            >

            Medium

          </label>

          <label>

            <input
              type="radio"
              name="priority"
              value="Critical"
              v-model="selectedPriority"
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

      <div class="location-box">

        <template v-if="location">

          📍 Location selected

          <br>

          <small>

            {{
              location.latitude.toFixed(5)
            }},
            {{
              location.longitude.toFixed(5)
            }}

          </small>

        </template>

        <template v-else>

          📍 Click on the map to select
          a location

        </template>

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
    rgba(17, 24, 39, 0.35);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 1000;
}

.report-modal {
  width: 480px;

  max-width:
    calc(100% - 32px);

  max-height: 90vh;

  overflow-y: auto;

  background: white;

  border-radius: 16px;

  padding: 24px;

  box-shadow:
    0 20px 50px
    rgba(0, 0, 0, 0.15);
}

/* HEADER */

.modal-header {
  display: flex;

  justify-content:
    space-between;

  align-items:
    flex-start;

  margin-bottom: 24px;
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

  cursor: pointer;

  font-size: 14px;
}

.close-button:hover {
  background: #e5e7eb;
}

/* FORM */

.form-section {
  margin-bottom: 22px;
}

.form-section > label {
  display: block;

  margin-bottom: 10px;

  font-size: 14px;

  font-weight: 600;

  color: #374151;
}

/* HELP GRID */

.help-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 10px;
}

.help-option {
  border:
    1px solid #e5e7eb;

  background: #fafafa;

  padding: 14px;

  border-radius: 10px;

  display: flex;

  align-items: center;

  gap: 10px;

  font-size: 14px;

  cursor: pointer;

  transition: 0.2s;
}

.help-option span {
  font-size: 20px;
}

.help-option:hover {
  border-color: #ef4444;

  background: #fff5f5;
}

.help-option.selected {
  border-color: #ef4444;

  background: #fff1f2;

  color: #dc2626;

  font-weight: 600;
}

/* PRIORITY */

.priority-options {
  display: flex;

  gap: 20px;
}

.priority-options label {
  font-size: 14px;

  display: flex;

  align-items: center;

  gap: 5px;

  cursor: pointer;
}

/* TEXTAREA */

textarea {
  width: 100%;

  resize: vertical;

  border:
    1px solid #d1d5db;

  border-radius: 9px;

  padding: 12px;

  font-family: inherit;

  font-size: 14px;

  outline: none;
}

textarea:focus {
  border-color: #ef4444;
}

/* LOCATION */

.location-box {
  background: #f9fafb;

  border:
    1px solid #e5e7eb;

  border-radius: 9px;

  padding: 12px;

  font-size: 13px;

  color: #6b7280;

  margin-bottom: 18px;
}

.location-box small {
  color: #374151;
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

  font-weight: 600;

  cursor: pointer;

  transition: 0.2s;
}

.submit-button:hover {
  background: #dc2626;
}

.submit-button:disabled {
  background: #fca5a5;

  cursor: not-allowed;
}

</style>