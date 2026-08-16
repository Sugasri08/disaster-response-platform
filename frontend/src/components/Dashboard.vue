<script setup>

import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref
} from 'vue'

import {
  getEmergencies
} from '../services/api'

import DashboardStats from './DashboardStats.vue'
import FilterBar from './FilterBar.vue'
import EmergencyList from './EmergencyList.vue'
import DisasterMap from './DisasterMap.vue'

const emit = defineEmits([
  'report-emergency'
])

const emergencies = ref([])

const loading = ref(true)

const error = ref('')

const statusFilter = ref('all')

const priorityFilter = ref('all')

const typeFilter = ref('all')

const mapLocation = ref(null)

let refreshInterval = null


// ------------------------------------
// LOAD
// ------------------------------------

const loadEmergencies = async () => {

  try {

    error.value = ''

    const response =
      await getEmergencies()

    emergencies.value =
      response.emergencies || []

  } catch (err) {

    console.error(err)

    error.value =
      'Unable to load emergencies.'

  } finally {

    loading.value = false

  }

}


// ------------------------------------
// FILTER
// ------------------------------------

const filteredEmergencies =
  computed(() => {

    return emergencies.value.filter(
      emergency => {

        const statusMatches =
          statusFilter.value === 'all' ||
          emergency.status ===
            statusFilter.value

        const priorityMatches =
          priorityFilter.value === 'all' ||
          emergency.priority ===
            priorityFilter.value

        const typeMatches =
          typeFilter.value === 'all' ||
          emergency.type ===
            typeFilter.value

        return (
          statusMatches &&
          priorityMatches &&
          typeMatches
        )

      }
    )

  })


// ------------------------------------
// UPDATED
// ------------------------------------

const handleUpdated = (
  emergency
) => {

  const index =
    emergencies.value.findIndex(
      item =>
        item._id ===
        emergency._id
    )

  if (index !== -1) {

    emergencies.value[index] =
      emergency

  }

}


// ------------------------------------
// MAP
// ------------------------------------

const focusMap = (
  location
) => {

  mapLocation.value = {
    latitude:
      location.latitude,

    longitude:
      location.longitude
  }

}


// ------------------------------------
// RESET
// ------------------------------------

const resetFilters = () => {

  statusFilter.value = 'all'

  priorityFilter.value = 'all'

  typeFilter.value = 'all'

}


// ------------------------------------
// REPORT
// ------------------------------------

const openReport = () => {

  emit(
    'report-emergency'
  )

}


// ------------------------------------
// START
// ------------------------------------

onMounted(() => {

  loadEmergencies()

  refreshInterval =
    setInterval(
      loadEmergencies,
      5000
    )

})


// ------------------------------------
// CLEANUP
// ------------------------------------

onBeforeUnmount(() => {

  if (refreshInterval) {

    clearInterval(
      refreshInterval
    )

  }

})

</script>

<template>

  <div class="dashboard">

    <!-- HEADER -->

    <header class="dashboard-header">

      <div>

        <h1>
          AidMap
        </h1>

        <p>
          Disaster response & community aid
        </p>

      </div>

      <button
        class="report-button"
        @click="openReport"
      >
        🚨 Report Emergency
      </button>

    </header>


    <!-- STATS -->

    <DashboardStats
      :emergencies="emergencies"
    />


    <!-- MAIN -->

    <main class="dashboard-content">

      <!-- MAP -->

      <section class="map-section">

        <div class="section-title">

          <div>

            <h2>
              Live Emergency Map
            </h2>

            <p>
              Click the map to select a location
            </p>

          </div>

        </div>

        <div class="map-wrapper">

          <DisasterMap
            :focus-location="mapLocation"

            @location-selected="
              mapLocation = $event
            "
          />

        </div>

      </section>


      <!-- REQUESTS -->

      <section class="requests-section">

        <FilterBar
          :status="statusFilter"
          :priority="priorityFilter"
          :type="typeFilter"

          @update:status="
            statusFilter = $event
          "

          @update:priority="
            priorityFilter = $event
          "

          @update:type="
            typeFilter = $event
          "

          @reset="resetFilters"
        />


        <div class="result-count">

          Showing

          <strong>
            {{ filteredEmergencies.length }}
          </strong>

          {{
            filteredEmergencies.length === 1
              ? 'emergency'
              : 'emergencies'
          }}

        </div>


        <EmergencyList
          :emergencies="
            filteredEmergencies
          "

          :loading="loading"

          :error="error"

          @updated="
            handleUpdated
          "

          @focus-map="
            focusMap
          "

          @refresh="
            loadEmergencies
          "
        />

      </section>

    </main>

  </div>

</template>

<style scoped>

.dashboard {
  width: 100%;

  min-height: 100vh;

  background: #f7f8fa;

  padding: 20px 24px;
}

.dashboard-header {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  margin-bottom: 18px;
}

.dashboard-header h1 {
  margin: 0;

  font-size: 24px;

  color: #111827;
}

.dashboard-header p {
  margin: 4px 0 0;

  color: #6b7280;

  font-size: 12px;
}

.report-button {
  border: none;

  background: #ef4444;

  color: white;

  padding: 11px 17px;

  border-radius: 9px;

  font-size: 13px;

  font-weight: 700;
}

.report-button:hover {
  background: #dc2626;
}

.dashboard-content {
  display: grid;

  grid-template-columns:
    minmax(0, 1.5fr)
    minmax(350px, 0.8fr);

  gap: 18px;

  align-items: start;
}

.map-section {
  background: white;

  border:
    1px solid #e5e7eb;

  border-radius: 14px;

  overflow: hidden;
}

.section-title {
  padding: 14px 17px;

  border-bottom:
    1px solid #e5e7eb;
}

.section-title h2 {
  margin: 0;

  font-size: 16px;

  color: #111827;
}

.section-title p {
  margin: 4px 0 0;

  color: #6b7280;

  font-size: 11px;
}

.map-wrapper {
  height: 620px;
}

.requests-section {
  min-width: 0;

  max-height: 720px;

  overflow-y: auto;
}

.result-count {
  margin-bottom: 10px;

  color: #6b7280;

  font-size: 12px;
}

.result-count strong {
  color: #111827;
}

@media (max-width: 1100px) {

  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .map-wrapper {
    height: 500px;
  }

  .requests-section {
    max-height: none;
  }

}

@media (max-width: 600px) {

  .dashboard {
    padding: 12px;
  }

  .dashboard-header {
    align-items: flex-start;

    flex-direction: column;

    gap: 12px;
  }

  .report-button {
    width: 100%;
  }

  .map-wrapper {
    height: 420px;
  }

}

</style>