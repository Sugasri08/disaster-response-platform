<script setup>
import { ref } from 'vue'
import DisasterMap from './components/DisasterMap.vue'
import ReportEmergency from './components/ReportEmergency.vue'

const showReportForm = ref(false)

const selectedLocation = ref(null)

// ------------------------------------
// OPEN REPORT FORM
// ------------------------------------

const openReportForm = () => {
  showReportForm.value = true
}

// ------------------------------------
// CLOSE REPORT FORM
// ------------------------------------

const closeReportForm = () => {
  showReportForm.value = false
}

// ------------------------------------
// MAP LOCATION SELECTED
// ------------------------------------

const handleLocationSelected = (location) => {
  selectedLocation.value = location

  console.log(
    '📍 Location received by App.vue:',
    location
  )
}

// ------------------------------------
// EMERGENCY SUBMITTED
// ------------------------------------

const handleEmergencySubmitted = (emergency) => {

  console.log(
    '🚨 Emergency submitted:',
    emergency
  )

  // The map will automatically pick up
  // the new emergency during its refresh.
}
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
    <!-- MAP -->
    <!-- ================================= -->

    <main class="map-container">

      <DisasterMap
        @location-selected="
          handleLocationSelected
        "
      />

    </main>

    <!-- ================================= -->
    <!-- REPORT EMERGENCY -->
    <!-- ================================= -->

    <ReportEmergency
      v-if="showReportForm"

      :location="selectedLocation"

      @close="closeReportForm"

      @submitted="
        handleEmergencySubmitted
      "
    />

  </div>

</template>

<style>

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
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

/* ================================= */
/* APP */
/* ================================= */

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

  flex-shrink: 0;

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

/* ================================= */
/* REPORT BUTTON */
/* ================================= */

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

  transform: translateY(-1px);
}

.report-button:active {
  transform: translateY(0);
}

/* ================================= */
/* MAP */
/* ================================= */

.map-container {
  flex: 1;

  min-height: 0;

  position: relative;
}

/* ================================= */
/* MOBILE */
/* ================================= */

@media (max-width: 600px) {

  .topbar {
    padding: 0 15px;
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

}

</style>