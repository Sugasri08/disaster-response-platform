<script setup>

import {
  onMounted,
  onBeforeUnmount,
  ref,
  computed
} from 'vue'

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'

import {
  getAuth
} from 'firebase/auth'

import { useRouter } from 'vue-router'

import { db } from '../firebase/firebase'

import DisasterMap from '../components/DisasterMap.vue'
import NearbyHelp from '../components/NearbyHelp.vue'


/* =========================================================
   AUTH + ROUTER
========================================================= */

const auth = getAuth()
const router = useRouter()


/* =========================================================
   STATE
========================================================= */

const emergencies = ref([])

/*
  IMPORTANT:
  Do NOT hardcode the user's location here.

  null means:
  "No location selected yet."
*/
const selectedLocation = ref(null)

const loading = ref(true)

const errorMessage = ref('')

const activeFilter = ref('all')

const searchText = ref('')

const updatingEmergency = ref(false)

let unsubscribe = null


/* =========================================================
   VOLUNTEER ID
========================================================= */

const volunteerId = computed(() => {

  return auth.currentUser?.uid || ''

})


/* =========================================================
   REPORT EMERGENCY
========================================================= */

/*
  If the user has clicked a coordinate on the map,
  send that coordinate to the emergency form.

  Example:

  /report-emergency?latitude=12.123&longitude=80.123
*/

const reportEmergency = () => {

  /*
    No location selected yet.
  */
  if (
    !selectedLocation.value ||
    !Number.isFinite(
      Number(selectedLocation.value.latitude)
    ) ||
    !Number.isFinite(
      Number(selectedLocation.value.longitude)
    )
  ) {

    /*
      Still allow the user to open the report page.

      The report page itself can ask for
      live location.
    */

    router.push('/report-emergency')

    return
  }


  /*
    Location exists.
  */

  router.push({
    path: '/report-emergency',

    query: {

      latitude:
        String(
          selectedLocation.value.latitude
        ),

      longitude:
        String(
          selectedLocation.value.longitude
        )

    }

  })

}


/* =========================================================
   STATUS NORMALIZER
========================================================= */

const normalizeStatus = status => {

  return String(
    status || 'pending'
  )
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')

}


/* =========================================================
   ICON
========================================================= */

const getIcon = type => {

  const icons = {

    'Potable Water': '💧',

    'Medical Aid': '🚑',

    'Search & Rescue': '🛟',

    Shelter: '🏠',

    Water: '💧',

    Medical: '🏥',

    Rescue: '🛟',

    Transport: '🚗',

    Food: '🍱',

    Supplies: '📦',

    'Food/Supplies': '📦',

    Power: '⚡'

  }

  return (
    icons[type] ||
    '🚨'
  )

}


/* =========================================================
   COORDINATE FORMATTERS
========================================================= */

const latitudeText = value => {

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number.toFixed(5)
    : '--'

}


const longitudeText = value => {

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number.toFixed(5)
    : '--'

}


/* =========================================================
   FILTERED EMERGENCIES
========================================================= */

const filteredEmergencies = computed(() => {

  let result = [
    ...emergencies.value
  ]


  /* FILTER */

  if (
    activeFilter.value !== 'all'
  ) {

    result =
      result.filter(
        emergency => {

          return normalizeStatus(
            emergency.status
          ) ===
          activeFilter.value

        }
      )

  }


  /* SEARCH */

  const search =
    searchText.value
      .trim()
      .toLowerCase()


  if (search) {

    result =
      result.filter(
        emergency => {

          const type =
            String(
              emergency.type || ''
            ).toLowerCase()


          const description =
            String(
              emergency.description || ''
            ).toLowerCase()


          const priority =
            String(
              emergency.priority ||
              emergency.severity ||
              ''
            ).toLowerCase()


          const status =
            String(
              emergency.status || ''
            ).toLowerCase()


          const address =
            String(
              emergency.address || ''
            ).toLowerCase()


          return (

            type.includes(search) ||

            description.includes(search) ||

            priority.includes(search) ||

            status.includes(search) ||

            address.includes(search)

          )

        }
      )

  }


  return result

})


/* =========================================================
   STATS
========================================================= */

const totalEmergencies =
  computed(() =>
    emergencies.value.length
  )


const pendingEmergencies =
  computed(() =>

    emergencies.value.filter(
      emergency =>

        normalizeStatus(
          emergency.status
        ) === 'pending'

    ).length

  )


const activeEmergencies =
  computed(() =>

    emergencies.value.filter(
      emergency => {

        const status =
          normalizeStatus(
            emergency.status
          )

        return (

          status === 'accepted' ||

          status === 'in_progress'

        )

      }
    ).length

  )


const resolvedEmergencies =
  computed(() =>

    emergencies.value.filter(
      emergency =>

        normalizeStatus(
          emergency.status
        ) === 'resolved'

    ).length

  )


/* =========================================================
   FIRESTORE REAL-TIME LISTENER
========================================================= */

const subscribeToEmergencies = () => {

  loading.value = true

  errorMessage.value = ''


  unsubscribe =
    onSnapshot(

      collection(
        db,
        'emergencies'
      ),

      snapshot => {

        emergencies.value =
          snapshot.docs.map(
            docSnap => ({

              _id:
                docSnap.id,

              firestoreId:
                docSnap.id,

              ...docSnap.data()

            })
          )


        loading.value = false

      },

      error => {

        console.error(
          'Firestore emergency listener error:',
          error
        )


        loading.value = false


        errorMessage.value =
          'Unable to load live emergencies.'

      }

    )

}


/* =========================================================
   MAP LOCATION SELECTED
========================================================= */

const handleLocationSelected = location => {

  if (!location) {
    return
  }


  const latitude =
    Number(
      location.latitude
    )


  const longitude =
    Number(
      location.longitude
    )


  if (

    !Number.isFinite(
      latitude
    ) ||

    !Number.isFinite(
      longitude
    )

  ) {

    return

  }


  /*
    Save the exact coordinate
    clicked by the user.
  */

  selectedLocation.value = {

    latitude,

    longitude

  }


  console.log(
    '📍 Selected map location:',
    selectedLocation.value
  )

}


/* =========================================================
   ACCEPT EMERGENCY
========================================================= */

const acceptEmergency =
  async emergencyId => {

    if (!volunteerId.value) {

      alert(
        'Please login as a volunteer first.'
      )

      return

    }


    if (
      updatingEmergency.value
    ) {

      return

    }


    try {

      updatingEmergency.value =
        true


      const emergencyRef =
        doc(
          db,
          'emergencies',
          emergencyId
        )


      await updateDoc(

        emergencyRef,

        {

          status:
            'accepted',

          assignedVolunteerId:
            volunteerId.value,

          assignedVolunteer:
            volunteerId.value,

          acceptedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }

      )

    }

    catch (error) {

      console.error(
        'Accept emergency failed:',
        error
      )


      alert(
        'Unable to accept this emergency.'
      )

    }

    finally {

      updatingEmergency.value =
        false

    }

  }


/* =========================================================
   NEARBY HELP LOCATION
========================================================= */

const handleNearbyLocation =
  location => {

    handleLocationSelected(
      location
    )

  }


/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {

  subscribeToEmergencies()

})


onBeforeUnmount(() => {

  if (unsubscribe) {

    unsubscribe()

    unsubscribe = null

  }

})

</script>


<template>

  <div class="crisis-dashboard">


    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="dashboard-header">

      <div class="header-content">

        <h1>
          🚨 Crisis Response Center
        </h1>

        <p>
          Monitor emergencies, coordinate volunteers
          and find nearby emergency services.
        </p>

      </div>


      <!-- REPORT EMERGENCY -->

      <button
        type="button"
        class="report-emergency-button"
        @click="reportEmergency"
      >

        <span class="report-icon">
          🚨
        </span>

        <span class="report-text">

          <strong>
            Report an Emergency
          </strong>

          <small
            v-if="selectedLocation"
          >
            📍 Use selected map location
          </small>

          <small
            v-else
          >
            Need immediate help?
          </small>

        </span>

      </button>


      <div class="live-indicator">

        <span class="live-dot"></span>

        LIVE

      </div>

    </header>


    <!-- ===================================================
         SELECTED LOCATION INFO
    ==================================================== -->

    <div
      v-if="selectedLocation"
      class="selected-location-banner"
    >

      <span>
        📍 Selected emergency location:
      </span>

      <strong>

        {{
          latitudeText(
            selectedLocation.latitude
          )
        }},

        {{
          longitudeText(
            selectedLocation.longitude
          )
        }}

      </strong>

      <button
        type="button"
        @click="reportEmergency"
      >
        🚨 Report here
      </button>

    </div>


    <!-- ===================================================
         ERROR
    ==================================================== -->

    <div
      v-if="errorMessage"
      class="error-banner"
    >

      ⚠️ {{ errorMessage }}

    </div>


    <!-- ===================================================
         STATS
    ==================================================== -->

    <section class="stats-grid">


      <div class="stat-card">

        <div class="stat-icon">
          🚨
        </div>

        <div>

          <span>
            Total Emergencies
          </span>

          <strong>
            {{ totalEmergencies }}
          </strong>

        </div>

      </div>


      <div class="stat-card pending">

        <div class="stat-icon">
          ⏳
        </div>

        <div>

          <span>
            Waiting
          </span>

          <strong>
            {{ pendingEmergencies }}
          </strong>

        </div>

      </div>


      <div class="stat-card active">

        <div class="stat-icon">
          🚑
        </div>

        <div>

          <span>
            Active Response
          </span>

          <strong>
            {{ activeEmergencies }}
          </strong>

        </div>

      </div>


      <div class="stat-card resolved">

        <div class="stat-icon">
          ✅
        </div>

        <div>

          <span>
            Resolved
          </span>

          <strong>
            {{ resolvedEmergencies }}
          </strong>

        </div>

      </div>


    </section>


    <!-- ===================================================
         LIVE MAP
    ==================================================== -->

    <section class="dashboard-card">


      <div class="card-header">

        <div>

          <h2>
            🗺️ Live Emergency Map
          </h2>

          <p>
            Click anywhere on the map to select
            an emergency location.
          </p>

        </div>


        <span class="map-status">
          🟢 Real-time
        </span>

      </div>


      <div class="map-wrapper">

        <DisasterMap
          :emergencies="emergencies"
          :focus-location="selectedLocation"
          :volunteer-id="volunteerId"

          @location-selected="
            handleLocationSelected
          "

          @accept-emergency="
            acceptEmergency
          "
        />

      </div>


      <!-- MAP LOCATION ACTION -->

      <div class="map-action-area">

        <div
          v-if="selectedLocation"
          class="map-selected-info"
        >

          <div>

            <strong>
              📍 Location Selected
            </strong>

            <span>

              Latitude:
              {{
                latitudeText(
                  selectedLocation.latitude
                )
              }}

              &nbsp; | &nbsp;

              Longitude:
              {{
                longitudeText(
                  selectedLocation.longitude
                )
              }}

            </span>

          </div>


          <button
            type="button"
            class="map-report-button"
            @click="reportEmergency"
          >

            🚨 Report Emergency Here

          </button>

        </div>


        <div
          v-else
          class="map-no-location"
        >

          📍 Click anywhere on the map to
          choose where help is needed.

        </div>

      </div>

    </section>


    <!-- ===================================================
         EMERGENCY REQUESTS
    ==================================================== -->

    <section class="dashboard-card">


      <div class="card-header">

        <div>

          <h2>
            📋 Emergency Requests
          </h2>

          <p>
            Live emergency requests from the community.
          </p>

        </div>

      </div>


      <!-- FILTERS -->

      <div class="filters">


        <input
          v-model="searchText"
          type="text"
          placeholder="🔍 Search emergencies..."
        />


        <button
          :class="{
            active:
              activeFilter === 'all'
          }"
          @click="
            activeFilter = 'all'
          "
        >
          All
        </button>


        <button
          :class="{
            active:
              activeFilter === 'pending'
          }"
          @click="
            activeFilter = 'pending'
          "
        >
          ⏳ Pending
        </button>


        <button
          :class="{
            active:
              activeFilter === 'accepted'
          }"
          @click="
            activeFilter = 'accepted'
          "
        >
          🙋 Accepted
        </button>


        <button
          :class="{
            active:
              activeFilter === 'in_progress'
          }"
          @click="
            activeFilter = 'in_progress'
          "
        >
          🚑 In Progress
        </button>


        <button
          :class="{
            active:
              activeFilter === 'resolved'
          }"
          @click="
            activeFilter = 'resolved'
          "
        >
          ✅ Resolved
        </button>


      </div>


      <!-- LOADING -->

      <div
        v-if="loading"
        class="empty-state"
      >

        🔄 Loading emergencies...

      </div>


      <!-- EMPTY -->

      <div
        v-else-if="
          filteredEmergencies.length === 0
        "
        class="empty-state"
      >

        <div>
          📭
        </div>

        <strong>
          No emergencies found
        </strong>

        <p>
          There are no emergency requests
          matching your filter.
        </p>

      </div>


      <!-- LIST -->

      <div
        v-else
        class="emergency-list"
      >


        <article
          v-for="
            emergency in filteredEmergencies
          "
          :key="
            emergency.firestoreId ||
            emergency._id
          "
          class="emergency-card"
        >


          <div class="emergency-icon">

            {{
              getIcon(
                emergency.type
              )
            }}

          </div>


          <div class="emergency-content">


            <div class="emergency-title">


              <div>

                <h3>

                  {{
                    emergency.type ||
                    'Emergency'
                  }}

                </h3>


                <span>

                  {{
                    emergency.priority ||
                    emergency.severity ||
                    'Low'
                  }}

                </span>

              </div>


              <strong
                class="status-badge"
                :class="
                  normalizeStatus(
                    emergency.status
                  )
                "
              >

                {{
                  emergency.status ||
                  'Pending'
                }}

              </strong>


            </div>


            <p>

              {{
                emergency.description ||
                'No description provided.'
              }}

            </p>


            <div class="emergency-meta">


              <span>

                📍

                {{
                  latitudeText(
                    emergency.latitude
                  )
                }},

                {{
                  longitudeText(
                    emergency.longitude
                  )
                }}

              </span>


              <span
                v-if="
                  emergency.address
                "
              >

                🏠

                {{
                  emergency.address
                }}

              </span>


              <span
                v-if="
                  emergency.contact ||
                  emergency.phone
                "
              >

                📞

                {{
                  emergency.contact ||
                  emergency.phone
                }}

              </span>


            </div>


          </div>


        </article>


      </div>


    </section>


    <!-- ===================================================
         NEARBY HELP
    ==================================================== -->

    <NearbyHelp
      :location="selectedLocation"

      @location-selected="
        handleNearbyLocation
      "
    />


  </div>

</template>


<style scoped>

/* =========================================================
   MAIN
========================================================= */

.crisis-dashboard {

  width: 100%;

  min-height: 100vh;

  padding: 20px;

  box-sizing: border-box;

  background: #f8fafc;

}


/* =========================================================
   HEADER
========================================================= */

.dashboard-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 14px;

  margin-bottom: 20px;

  flex-wrap: wrap;

}

.header-content {

  flex: 1;

  min-width: 240px;

}

.dashboard-header h1 {

  margin: 0;

  color: #0f172a;

  font-size: 25px;

}

.dashboard-header p {

  margin: 6px 0 0;

  color: #64748b;

  font-size: 13px;

}


/* =========================================================
   REPORT BUTTON
========================================================= */

.report-emergency-button {

  display: flex;

  align-items: center;

  gap: 10px;

  border: none;

  border-radius: 12px;

  padding: 10px 16px;

  background: #dc2626;

  color: white;

  cursor: pointer;

  box-shadow:
    0 5px 14px
    rgba(220, 38, 38, 0.25);

  transition:
    transform .2s,
    background .2s,
    box-shadow .2s;

}

.report-emergency-button:hover {

  background: #b91c1c;

  transform: translateY(-2px);

}

.report-icon {

  display: flex;

  align-items: center;

  justify-content: center;

  width: 34px;

  height: 34px;

  border-radius: 9px;

  background:
    rgba(255,255,255,.18);

  font-size: 18px;

}

.report-text {

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  gap: 2px;

}

.report-text strong {

  font-size: 13px;

}

.report-text small {

  font-size: 10px;

  opacity: .85;

}


/* =========================================================
   LIVE
========================================================= */

.live-indicator {

  display: flex;

  align-items: center;

  gap: 7px;

  padding: 7px 12px;

  border-radius: 20px;

  background: #dcfce7;

  color: #15803d;

  font-size: 11px;

  font-weight: 800;

}

.live-dot {

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: #22c55e;

  animation: pulse 1.5s infinite;

}

@keyframes pulse {

  0% {
    opacity: 1;
  }

  50% {
    opacity: .3;
  }

  100% {
    opacity: 1;
  }

}


/* =========================================================
   SELECTED LOCATION
========================================================= */

.selected-location-banner {

  display: flex;

  align-items: center;

  gap: 10px;

  flex-wrap: wrap;

  margin-bottom: 18px;

  padding: 12px 14px;

  border:
    1px solid #bfdbfe;

  border-radius: 10px;

  background: #eff6ff;

  color: #1e40af;

  font-size: 12px;

}

.selected-location-banner strong {

  color: #1d4ed8;

}

.selected-location-banner button {

  margin-left: auto;

  border: none;

  border-radius: 7px;

  padding: 7px 11px;

  background: #dc2626;

  color: white;

  font-size: 11px;

  font-weight: 700;

  cursor: pointer;

}


/* =========================================================
   ERROR
========================================================= */

.error-banner {

  margin-bottom: 15px;

  padding: 12px;

  border-radius: 8px;

  background: #fee2e2;

  color: #b91c1c;

  font-size: 13px;

}


/* =========================================================
   STATS
========================================================= */

.stats-grid {

  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 12px;

  margin-bottom: 20px;

}

.stat-card {

  display: flex;

  align-items: center;

  gap: 12px;

  padding: 15px;

  background: white;

  border:
    1px solid #e2e8f0;

  border-radius: 12px;

}

.stat-icon {

  width: 42px;

  height: 42px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 10px;

  background: #eff6ff;

  font-size: 20px;

}

.stat-card span {

  display: block;

  color: #64748b;

  font-size: 11px;

}

.stat-card strong {

  display: block;

  margin-top: 3px;

  color: #0f172a;

  font-size: 22px;

}


/* =========================================================
   CARDS
========================================================= */

.dashboard-card {

  margin-bottom: 20px;

  background: white;

  border:
    1px solid #e2e8f0;

  border-radius: 14px;

  overflow: hidden;

}

.card-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 15px 18px;

  border-bottom:
    1px solid #e2e8f0;

}

.card-header h2 {

  margin: 0;

  color: #0f172a;

  font-size: 16px;

}

.card-header p {

  margin: 4px 0 0;

  color: #64748b;

  font-size: 11px;

}

.map-status {

  color: #16a34a;

  font-size: 11px;

  font-weight: 700;

}


/* =========================================================
   MAP
========================================================= */

.map-wrapper {

  width: 100%;

  height: 500px;

}


/* =========================================================
   MAP ACTION
========================================================= */

.map-action-area {

  padding: 12px 18px;

  border-top:
    1px solid #e2e8f0;

}

.map-selected-info {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 15px;

  flex-wrap: wrap;

}

.map-selected-info div {

  display: flex;

  flex-direction: column;

  gap: 4px;

}

.map-selected-info strong {

  color: #1d4ed8;

  font-size: 12px;

}

.map-selected-info span {

  color: #64748b;

  font-size: 10px;

}

.map-report-button {

  border: none;

  border-radius: 8px;

  padding: 10px 14px;

  background: #dc2626;

  color: white;

  font-size: 12px;

  font-weight: 700;

  cursor: pointer;

}

.map-report-button:hover {

  background: #b91c1c;

}

.map-no-location {

  padding: 8px;

  color: #64748b;

  font-size: 11px;

  text-align: center;

}


/* =========================================================
   FILTERS
========================================================= */

.filters {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  padding: 14px 18px;

  border-bottom:
    1px solid #e2e8f0;

}

.filters input {

  flex: 1;

  min-width: 180px;

  padding: 9px 11px;

  border:
    1px solid #cbd5e1;

  border-radius: 7px;

  outline: none;

  font-size: 11px;

}

.filters button {

  border:
    1px solid #e2e8f0;

  background: #f8fafc;

  color: #475569;

  padding: 8px 11px;

  border-radius: 7px;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;

}

.filters button.active {

  background: #eff6ff;

  border-color: #2563eb;

  color: #1d4ed8;

}


/* =========================================================
   EMERGENCY LIST
========================================================= */

.emergency-list {

  display: flex;

  flex-direction: column;

  gap: 10px;

  padding: 15px 18px;

}

.emergency-card {

  display: flex;

  gap: 12px;

  padding: 12px;

  border:
    1px solid #e2e8f0;

  border-radius: 10px;

  transition: .2s;

}

.emergency-card:hover {

  border-color: #93c5fd;

  transform: translateY(-1px);

}

.emergency-icon {

  width: 42px;

  height: 42px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 10px;

  background: #fef2f2;

  font-size: 20px;

  flex-shrink: 0;

}

.emergency-content {

  flex: 1;

  min-width: 0;

}

.emergency-title {

  display: flex;

  justify-content: space-between;

  gap: 10px;

}

.emergency-title h3 {

  margin: 0;

  color: #0f172a;

  font-size: 13px;

}

.emergency-title span {

  display: inline-block;

  margin-top: 3px;

  color: #64748b;

  font-size: 10px;

}

.emergency-content p {

  margin: 7px 0;

  color: #475569;

  font-size: 11px;

}

.status-badge {

  align-self: flex-start;

  padding: 4px 7px;

  border-radius: 10px;

  background: #fef3c7;

  color: #b45309;

  font-size: 9px;

  text-transform: uppercase;

  white-space: nowrap;

}

.status-badge.accepted {

  background: #dbeafe;

  color: #2563eb;

}

.status-badge.in_progress {

  background: #ede9fe;

  color: #7c3aed;

}

.status-badge.resolved {

  background: #dcfce7;

  color: #16a34a;

}

.emergency-meta {

  display: flex;

  flex-wrap: wrap;

  gap: 12px;

  color: #64748b;

  font-size: 10px;

}


/* =========================================================
   EMPTY
========================================================= */

.empty-state {

  padding: 35px;

  text-align: center;

  color: #64748b;

  font-size: 12px;

}

.empty-state div {

  font-size: 28px;

  margin-bottom: 8px;

}

.empty-state strong {

  display: block;

  color: #334155;

}

.empty-state p {

  margin-top: 5px;

}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 900px) {

  .stats-grid {

    grid-template-columns:
      repeat(2, 1fr);

  }

}

@media (max-width: 600px) {

  .crisis-dashboard {

    padding: 10px;

  }

  .dashboard-header {

    align-items: stretch;

    flex-direction: column;

  }

  .report-emergency-button {

    width: 100%;

    justify-content: center;

  }

  .live-indicator {

    align-self: flex-start;

  }

  .stats-grid {

    grid-template-columns: 1fr;

  }

  .map-wrapper {

    height: 430px;

  }

  .card-header {

    align-items: flex-start;

    gap: 10px;

  }

  .emergency-title {

    flex-direction: column;

  }

  .selected-location-banner {

    align-items: flex-start;

    flex-direction: column;

  }

  .selected-location-banner button {

    margin-left: 0;

  }

  .map-selected-info {

    align-items: stretch;

    flex-direction: column;

  }

}

</style>