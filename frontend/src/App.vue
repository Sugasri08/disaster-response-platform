<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import axios from 'axios'
import DisasterMap from './components/DisasterMap.vue'

const showReportForm = ref(false)

const selectedType = ref('')
const selectedPriority = ref('Low')
const description = ref('')
const selectedLocation = ref(null)

const emergencies = ref([])

let refreshInterval = null

// ------------------------------------
// REPORT FORM
// ------------------------------------

const openReportForm = () => {
  showReportForm.value = true
}

const closeReportForm = () => {
  showReportForm.value = false
}

const selectHelpType = (type) => {
  selectedType.value = type
}

// ------------------------------------
// MAP LOCATION
// ------------------------------------

const handleLocationSelected = (location) => {
  selectedLocation.value = location

  console.log(
    '📍 Location received:',
    location
  )
}

// ------------------------------------
// EMERGENCIES FROM MAP
// ------------------------------------

const handleEmergenciesUpdated = (data) => {
  emergencies.value = data
}

// ------------------------------------
// DASHBOARD COUNTS
// ------------------------------------

const totalEmergencies = computed(() => {
  return emergencies.value.length
})

const pendingEmergencies = computed(() => {
  return emergencies.value.filter(
    emergency =>
      emergency.status === 'pending'
  ).length
})

const acceptedEmergencies = computed(() => {
  return emergencies.value.filter(
    emergency =>
      emergency.status === 'accepted'
  ).length
})

const resolvedEmergencies = computed(() => {
  return emergencies.value.filter(
    emergency =>
      emergency.status === 'resolved'
  ).length
})

const criticalEmergencies = computed(() => {
  return emergencies.value.filter(
    emergency =>
      emergency.priority === 'Critical' &&
      emergency.status !== 'resolved'
  ).length
})

const activeVolunteers = computed(() => {

  const volunteers =
    emergencies.value
      .filter(
        emergency =>
          emergency.status === 'accepted' &&
          emergency.assignedVolunteer
      )
      .map(
        emergency =>
          emergency.assignedVolunteer
      )

  return new Set(volunteers).size
})

// ------------------------------------
// SUBMIT EMERGENCY
// ------------------------------------

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

  if (!selectedLocation.value) {
    alert(
      'Please select a location on the map.'
    )
    return
  }

  const emergency = {
    type: selectedType.value,
    priority: selectedPriority.value,
    description: description.value.trim(),
    latitude:
      selectedLocation.value.latitude,
    longitude:
      selectedLocation.value.longitude
  }

  try {

    console.log(
      '🚨 Sending emergency:',
      emergency
    )

    const response =
      await axios.post(
        'http://localhost:3000/api/emergencies',
        emergency
      )

    console.log(
      '✅ Emergency created:',
      response.data
    )

    alert(
      'Emergency reported successfully! 🚨'
    )

    // Reset form

    selectedType.value = ''
    selectedPriority.value = 'Low'
    description.value = ''
    selectedLocation.value = null

    closeReportForm()

  } catch (error) {

    console.error(
      '❌ Failed to submit emergency:',
      error
    )

    alert(
      'Failed to submit emergency. Please try again.'
    )
  }
}

// ------------------------------------
// CLEANUP
// ------------------------------------

onBeforeUnmount(() => {

  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

})

</script>

<template>

  <div class="app">

    <!-- ================================= -->
    <!-- HEADER -->
    <!-- ================================= -->

    <header class="topbar">

      <div class="brand">

        <span class="brand-icon">
          🚨
        </span>

        <div>

          <h1>
            AidMap
          </h1>

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

    <!-- ================================= -->
    <!-- DASHBOARD -->
    <!-- ================================= -->

    <section class="dashboard">

      <!-- TOTAL -->

      <div class="stat-card">

        <div class="stat-icon total">
          🚨
        </div>

        <div>

          <p>
            Total Emergencies
          </p>

          <h2>
            {{ totalEmergencies }}
          </h2>

        </div>

      </div>

      <!-- PENDING -->

      <div class="stat-card">

        <div class="stat-icon pending">
          🟡
        </div>

        <div>

          <p>
            Waiting for Help
          </p>

          <h2>
            {{ pendingEmergencies }}
          </h2>

        </div>

      </div>

      <!-- ACCEPTED -->

      <div class="stat-card">

        <div class="stat-icon accepted">
          🙋
        </div>

        <div>

          <p>
            Being Helped
          </p>

          <h2>
            {{ acceptedEmergencies }}
          </h2>

        </div>

      </div>

      <!-- RESOLVED -->

      <div class="stat-card">

        <div class="stat-icon resolved">
          ✅
        </div>

        <div>

          <p>
            Resolved
          </p>

          <h2>
            {{ resolvedEmergencies }}
          </h2>

        </div>

      </div>

      <!-- CRITICAL -->

      <div class="stat-card critical-card">

        <div class="stat-icon critical">
          🔴
        </div>

        <div>

          <p>
            Critical Active
          </p>

          <h2>
            {{ criticalEmergencies }}
          </h2>

        </div>

      </div>

      <!-- VOLUNTEERS -->

      <div class="stat-card">

        <div class="stat-icon volunteer">
          🤝
        </div>

        <div>

          <p>
            Active Volunteers
          </p>

          <h2>
            {{ activeVolunteers }}
          </h2>

        </div>

      </div>

    </section>

    <!-- ================================= -->
    <!-- MAP -->
    <!-- ================================= -->

    <main class="map-container">

      <DisasterMap
        @location-selected="handleLocationSelected"
        @emergencies-updated="handleEmergenciesUpdated"
      />

    </main>

    <!-- ================================= -->
    <!-- REPORT MODAL -->
    <!-- ================================= -->

    <div
      v-if="showReportForm"
      class="modal-overlay"
      @click.self="closeReportForm"
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
            @click="closeReportForm"
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
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Water'
              }"
              @click="
                selectHelpType('Water')
              "
            >
              <span>💧</span>
              Water
            </button>

            <button
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Medical'
              }"
              @click="
                selectHelpType('Medical')
              "
            >
              <span>🏥</span>
              Medical
            </button>

            <button
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Food'
              }"
              @click="
                selectHelpType('Food')
              "
            >
              <span>🍱</span>
              Food
            </button>

            <button
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Rescue'
              }"
              @click="
                selectHelpType('Rescue')
              "
            >
              <span>🛟</span>
              Rescue
            </button>

            <button
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Shelter'
              }"
              @click="
                selectHelpType('Shelter')
              "
            >
              <span>🏠</span>
              Shelter
            </button>

            <button
              class="help-option"
              :class="{
                selected:
                  selectedType === 'Power'
              }"
              @click="
                selectHelpType('Power')
              "
            >
              <span>⚡</span>
              Power
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

          <template
            v-if="selectedLocation"
          >

            📍 Location selected

            <br>

            <small>

              {{
                selectedLocation.latitude.toFixed(5)
              }},
              {{
                selectedLocation.longitude.toFixed(5)
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
          @click="submitEmergency"
        >
          🚨 Submit Emergency
        </button>

      </div>

    </div>

  </div>

</template>

<style>

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

.app {
  width: 100%;
  height: 100vh;

  display: flex;
  flex-direction: column;

  overflow: hidden;
}

/* ================================= */
/* HEADER */
/* ================================= */

.topbar {
  height: 72px;

  background: white;

  border-bottom:
    1px solid #e5e7eb;

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

/* ================================= */
/* DASHBOARD */
/* ================================= */

.dashboard {
  background: #f8fafc;

  padding: 12px 20px;

  display: grid;

  grid-template-columns:
    repeat(6, 1fr);

  gap: 12px;

  border-bottom:
    1px solid #e5e7eb;

  z-index: 5;
}

.stat-card {
  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 12px;

  padding: 12px;

  display: flex;

  align-items: center;

  gap: 10px;

  min-width: 0;
}

.stat-icon {
  width: 38px;

  height: 38px;

  flex-shrink: 0;

  border-radius: 10px;

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

.stat-icon.volunteer {
  background: #ede9fe;
}

.stat-card p {
  margin: 0;

  font-size: 11px;

  color: #6b7280;

  white-space: nowrap;
}

.stat-card h2 {
  margin: 2px 0 0;

  font-size: 20px;

  color: #111827;
}

.critical-card {
  border-color: #fecaca;
}

/* ================================= */
/* MAP */
/* ================================= */

.map-container {
  flex: 1;

  position: relative;

  min-height: 0;
}

/* ================================= */
/* MODAL */
/* ================================= */

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

/* ================================= */
/* MODAL HEADER */
/* ================================= */

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
}

/* ================================= */
/* FORM */
/* ================================= */

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

/* ================================= */
/* HELP GRID */
/* ================================= */

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

/* ================================= */
/* PRIORITY */
/* ================================= */

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

/* ================================= */
/* TEXTAREA */
/* ================================= */

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

/* ================================= */
/* LOCATION */
/* ================================= */

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

/* ================================= */
/* SUBMIT */
/* ================================= */

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

/* ================================= */
/* RESPONSIVE */
/* ================================= */

@media (max-width: 1000px) {

  .dashboard {
    grid-template-columns:
      repeat(3, 1fr);
  }

}

@media (max-width: 600px) {

  .topbar {
    padding: 0 15px;
  }

  .brand p {
    display: none;
  }

  .report-button {
    padding: 9px 12px;

    font-size: 12px;
  }

  .dashboard {
    grid-template-columns:
      repeat(2, 1fr);

    padding: 10px;
  }

  .stat-card {
    padding: 10px;
  }

  .stat-card p {
    font-size: 10px;
  }

}

</style>