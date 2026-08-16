<script setup>
import { ref } from 'vue'
import axios from 'axios'
import DisasterMap from './components/DisasterMap.vue'

const showReportForm = ref(false)

const selectedType = ref('')
const selectedPriority = ref('Low')
const description = ref('')

const selectedLocation = ref(null)

const errorMessage = ref('')

const openReportForm = () => {
  errorMessage.value = ''
  showReportForm.value = true
}

const closeReportForm = () => {
  showReportForm.value = false
  errorMessage.value = ''
}

const handleLocationSelected = (location) => {
  selectedLocation.value = location

  console.log('Location received by App.vue:', location)
}

const selectHelpType = (type) => {
  selectedType.value = type
  errorMessage.value = ''
}

const submitEmergency = async () => {

  if (!selectedType.value) {
    alert('Please select what kind of help is needed.')
    return
  }

  if (!selectedLocation.value) {
    alert('Please select a location on the map.')
    return
  }

  if (!description.value.trim()) {
    alert('Please describe the situation.')
    return
  }

  const emergency = {
    type: selectedType.value,
    priority: selectedPriority.value,
    description: description.value,
    latitude: selectedLocation.value.latitude,
    longitude: selectedLocation.value.longitude
  }

  console.log('📤 Sending emergency to backend...')
  console.log(emergency)

  try {

    const response = await axios.post(
      'http://localhost:3000/api/emergencies',
      emergency
    )

    console.log('✅ Backend response:')
    console.log(response.data)

    alert('Emergency reported successfully! 🚨')

    // Close form
    closeReportForm()

    // Reset form
    selectedType.value = ''
    selectedPriority.value = 'Low'
    description.value = ''

  } catch (error) {

    console.error('❌ Failed to submit emergency:')

    if (error.response) {
      console.error(error.response.data)
    } else {
      console.error(error.message)
    }

    alert('Failed to submit emergency. Please try again.')
  }
}
const getStatusText = (status) => {

  switch (status) {

    case 'accepted':
      return '🔵 Help is on the way'

    case 'resolved':
      return '✅ Resolved'

    default:
      return '🟡 Waiting for help'
  }
}
const acceptEmergency = async (emergencyId) => {

  try {

    // Temporary volunteer identity
    const volunteerId = 'volunteer-demo-001'

    console.log(
      '🙋 Accepting emergency:',
      emergencyId
    )

    const response = await axios.patch(
      `http://localhost:3000/api/emergencies/${emergencyId}/accept`,
      {
        volunteerId
      }
    )

    console.log(
      '✅ Emergency accepted:',
      response.data
    )

    alert(
      'You are now helping with this emergency! 🙋'
    )

    // Reload markers
    await loadEmergencies()

  } catch (error) {

    console.error(
      '❌ Failed to accept emergency:',
      error
    )

    if (error.response) {

      alert(
        error.response.data.message ||
        'This emergency is no longer available.'
      )

    } else {

      alert(
        'Could not connect to the server.'
      )
    }
  }
}
</script>


<template>

  <div class="app">

    <!-- ==================== HEADER ==================== -->

    <header class="topbar">

      <div class="brand">

        <span class="brand-icon">
          🚨
        </span>

        <div>

          <h1>AidMap</h1>

          <p>
            Disaster response & community aid
          </p>

        </div>

      </div>


      <button
        class="report-button"
        @click="openReportForm"
      >
        + Report Emergency
      </button>

    </header>


    <!-- ==================== MAP ==================== -->

    <main class="map-container">

      <DisasterMap
        @location-selected="handleLocationSelected"
      />

    </main>


    <!-- ==================== EMERGENCY MODAL ==================== -->

    <div
      v-if="showReportForm"
      class="modal-overlay"
      @click.self="closeReportForm"
    >

      <div class="report-modal">


        <!-- ==================== MODAL HEADER ==================== -->

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
            @click="closeReportForm"
          >
            ✕
          </button>

        </div>


        <!-- ==================== HELP TYPE ==================== -->

        <div class="form-section">

          <label>
            What kind of help is needed?
          </label>


          <div class="help-grid">


            <!-- WATER -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Water'
              }"
              @click="selectHelpType('Water')"
            >

              <span>
                💧
              </span>

              Water

            </button>


            <!-- MEDICAL -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Medical'
              }"
              @click="selectHelpType('Medical')"
            >

              <span>
                🏥
              </span>

              Medical

            </button>


            <!-- FOOD -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Food'
              }"
              @click="selectHelpType('Food')"
            >

              <span>
                🍱
              </span>

              Food

            </button>


            <!-- RESCUE -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Rescue'
              }"
              @click="selectHelpType('Rescue')"
            >

              <span>
                🛟
              </span>

              Rescue

            </button>


            <!-- SHELTER -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Shelter'
              }"
              @click="selectHelpType('Shelter')"
            >

              <span>
                🏠
              </span>

              Shelter

            </button>


            <!-- POWER -->

            <button
              class="help-option"
              :class="{
                selected: selectedType === 'Power'
              }"
              @click="selectHelpType('Power')"
            >

              <span>
                ⚡
              </span>

              Power

            </button>

          </div>

        </div>


        <!-- ==================== PRIORITY ==================== -->

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


        <!-- ==================== DESCRIPTION ==================== -->

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


        <!-- ==================== LOCATION ==================== -->

        <div class="location-box">


          <template v-if="selectedLocation">

            📍

            <strong>
              Location selected
            </strong>

            <br>

            <span>

              {{ selectedLocation.latitude.toFixed(5) }},

              {{ selectedLocation.longitude.toFixed(5) }}

            </span>

          </template>


          <template v-else>

            📍 Click on the map to select a location

          </template>


        </div>


        <!-- ==================== ERROR ==================== -->

        <div
          v-if="errorMessage"
          class="error-message"
        >

          ⚠️

          {{ errorMessage }}

        </div>


        <!-- ==================== SUBMIT ==================== -->

        <button
          class="submit-button"
          @click="submitEmergency"
        >

          Submit Emergency

        </button>

      </div>

    </div>

  </div>

</template>


<style>

/* ==================== GLOBAL ==================== */

* {
  box-sizing: border-box;
}


body {
  margin: 0;

  font-family:
    Inter,
    Arial,
    sans-serif;

  background: #f7f8fa;

  color: #1f2937;
}


button {
  font-family: inherit;
}


/* ==================== APP ==================== */

.app {
  width: 100%;

  height: 100vh;

  display: flex;

  flex-direction: column;

  overflow: hidden;
}


/* ==================== HEADER ==================== */

.topbar {
  height: 72px;

  background: white;

  border-bottom: 1px solid #e5e7eb;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 0 28px;

  z-index: 10;
}


.brand {
  display: flex;

  align-items: center;

  gap: 12px;
}


.brand-icon {
  font-size: 25px;
}


.brand h1 {
  margin: 0;

  font-size: 20px;

  font-weight: 700;

  color: #111827;
}


.brand p {
  margin: 2px 0 0;

  font-size: 12px;

  color: #6b7280;
}


/* ==================== REPORT BUTTON ==================== */

.report-button {
  border: none;

  background: #ef4444;

  color: white;

  padding: 11px 18px;

  border-radius: 9px;

  font-size: 14px;

  font-weight: 600;

  cursor: pointer;

  transition: 0.2s;
}


.report-button:hover {
  background: #dc2626;
}


/* ==================== MAP ==================== */

.map-container {
  flex: 1;

  position: relative;
}


/* ==================== MODAL OVERLAY ==================== */

.modal-overlay {
  position: fixed;

  inset: 0;

  background: rgba(17, 24, 39, 0.35);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 1000;
}


/* ==================== MODAL ==================== */

.report-modal {
  width: 480px;

  max-width: calc(100% - 32px);

  max-height: 90vh;

  overflow-y: auto;

  background: white;

  border-radius: 16px;

  padding: 24px;

  box-shadow:
    0 20px 50px
    rgba(0, 0, 0, 0.15);
}


/* ==================== MODAL HEADER ==================== */

.modal-header {
  display: flex;

  justify-content: space-between;

  align-items: flex-start;

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


/* ==================== FORM ==================== */

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


/* ==================== HELP GRID ==================== */

.help-grid {
  display: grid;

  grid-template-columns: repeat(2, 1fr);

  gap: 10px;
}


.help-option {
  border: 1px solid #e5e7eb;

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

  box-shadow:
    0 0 0 1px #ef4444;
}


/* ==================== PRIORITY ==================== */

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


.priority-options input {
  accent-color: #ef4444;
}


/* ==================== TEXTAREA ==================== */

textarea {
  width: 100%;

  resize: vertical;

  border: 1px solid #d1d5db;

  border-radius: 9px;

  padding: 12px;

  font-family: inherit;

  font-size: 14px;

  outline: none;
}


textarea:focus {
  border-color: #ef4444;

  box-shadow:
    0 0 0 2px
    rgba(239, 68, 68, 0.1);
}


/* ==================== LOCATION ==================== */

.location-box {
  background: #f9fafb;

  border: 1px solid #e5e7eb;

  border-radius: 9px;

  padding: 12px;

  font-size: 13px;

  color: #6b7280;

  margin-bottom: 12px;
}


.location-box strong {
  color: #374151;
}


.location-box span {
  margin-left: 20px;

  color: #6b7280;
}


/* ==================== ERROR ==================== */

.error-message {
  background: #fff1f2;

  border: 1px solid #fecdd3;

  color: #be123c;

  border-radius: 9px;

  padding: 11px 12px;

  margin-bottom: 12px;

  font-size: 13px;

  line-height: 1.4;
}


/* ==================== SUBMIT ==================== */

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


/* ==================== MOBILE ==================== */

@media (max-width: 600px) {

  .topbar {
    height: 64px;

    padding: 0 16px;
  }


  .brand p {
    display: none;
  }


  .brand h1 {
    font-size: 18px;
  }


  .report-button {
    padding: 9px 12px;

    font-size: 12px;
  }


  .report-modal {
    width: 100%;

    max-width: calc(100% - 20px);

    padding: 20px;
  }


  .help-grid {
    grid-template-columns: 1fr 1fr;
  }


  .priority-options {
    gap: 12px;

    flex-wrap: wrap;
  }

}

</style>