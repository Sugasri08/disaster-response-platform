<script setup>
import {
  onMounted,
  onBeforeUnmount,
  ref,
  watch
} from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'

import { db } from '../firebase/firebase'

import NearbyHelp from '../components/NearbyHelp.vue'
/* =========================================================
   LEAFLET ICON FIX
========================================================= */

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

/* =========================================================
   PROPS
========================================================= */

const props = defineProps({
  focusLocation: {
    type: Object,
    default: null
  },

  volunteerId: {
    type: String,
    default: ''
  }
})

/* =========================================================
   EVENTS
========================================================= */

const emit = defineEmits([
  'location-selected',
  'emergencies-updated',
  'accept-emergency'
])

/* =========================================================
   MAP
========================================================= */

const mapContainer = ref(null)

let map = null
let selectedMarker = null
let emergencyLayer = null
let unsubscribeEmergencies = null

/* =========================================================
   STATE
========================================================= */

const emergencyData = ref([])

const selectedLocation = ref(
  props.focusLocation || {
    latitude: 12.8260,
    longitude: 80.2333
  }
)

const activeFilter = ref('all')

const searchText = ref('')

const loadingEmergencies = ref(true)

const updatingEmergency = ref(false)

/* =========================================================
   COMPUTED-LIKE FILTERING
========================================================= */

const filteredEmergencies = () => {
  let result = [...emergencyData.value]

  if (activeFilter.value !== 'all') {
    result = result.filter(
      emergency =>
        String(
          emergency.status || 'pending'
        ).toLowerCase() ===
        activeFilter.value
    )
  }

  if (searchText.value.trim()) {
    const search =
      searchText.value
        .trim()
        .toLowerCase()

    result = result.filter(
      emergency =>
        String(
          emergency.type || ''
        )
          .toLowerCase()
          .includes(search) ||

        String(
          emergency.description || ''
        )
          .toLowerCase()
          .includes(search) ||

        String(
          emergency.priority || ''
        )
          .toLowerCase()
          .includes(search)
    )
  }

  return result
}

/* =========================================================
   STATS
========================================================= */

const totalEmergencies = () =>
  emergencyData.value.length

const pendingEmergencies = () =>
  emergencyData.value.filter(
    emergency =>
      String(
        emergency.status || 'pending'
      ).toLowerCase() === 'pending'
  ).length

const activeEmergencies = () =>
  emergencyData.value.filter(
    emergency => {
      const status =
        String(
          emergency.status || ''
        ).toLowerCase()

      return (
        status === 'accepted' ||
        status === 'in progress' ||
        status === 'in_progress'
      )
    }
  ).length

const resolvedEmergencies = () =>
  emergencyData.value.filter(
    emergency =>
      String(
        emergency.status || ''
      ).toLowerCase() === 'resolved'
  ).length

/* =========================================================
   INITIALIZE MAP
========================================================= */

const initializeMap = () => {
  if (!mapContainer.value) return

  map = L.map(
    mapContainer.value
  ).setView(
    [12.8260, 80.2333],
    12
  )

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,

      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(map)

  emergencyLayer =
    L.layerGroup().addTo(map)

  map.on(
    'click',
    handleMapClick
  )

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 300)

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 1000)
}

/* =========================================================
   FIRESTORE REAL-TIME LISTENER
========================================================= */

const subscribeToEmergencies = () => {
  unsubscribeEmergencies =
    onSnapshot(
      collection(
        db,
        'emergencies'
      ),

      snapshot => {
        const emergencies = []

        snapshot.forEach(
          docSnap => {
            emergencies.push({
              _id: docSnap.id,

              firestoreId:
                docSnap.id,

              ...docSnap.data()
            })
          }
        )

        emergencyData.value =
          emergencies

        loadingEmergencies.value =
          false

        displayEmergencies(
          emergencies
        )

        emit(
          'emergencies-updated',
          emergencies
        )

        console.log(
          '🔥 Live emergencies updated:',
          emergencies
        )
      },

      error => {
        console.error(
          '❌ Firestore emergency listener failed:',
          error
        )

        loadingEmergencies.value =
          false
      }
    )
}

/* =========================================================
   LOCATION FROM PARENT
========================================================= */

watch(
  () => props.focusLocation,

  location => {
    if (!location) return

    const latitude =
      Number(location.latitude)

    const longitude =
      Number(location.longitude)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return
    }

    selectedLocation.value = {
      latitude,
      longitude
    }

    if (!map) return

    map.flyTo(
      [
        latitude,
        longitude
      ],
      15,
      {
        duration: 1
      }
    )

    if (selectedMarker) {
      map.removeLayer(
        selectedMarker
      )
    }

    selectedMarker =
      L.marker([
        latitude,
        longitude
      ]).addTo(map)

    selectedMarker
      .bindPopup(`
        <strong>📍 Selected Location</strong>

        <br><br>

        Latitude:
        ${latitude.toFixed(6)}

        <br>

        Longitude:
        ${longitude.toFixed(6)}
      `)
      .openPopup()
  },

  {
    deep: true
  }
)

/* =========================================================
   MAP CLICK
========================================================= */

const handleMapClick = event => {
  const latitude =
    event.latlng.lat

  const longitude =
    event.latlng.lng

  if (selectedMarker) {
    map.removeLayer(
      selectedMarker
    )
  }

  selectedMarker =
    L.marker([
      latitude,
      longitude
    ]).addTo(map)

  selectedMarker
    .bindPopup(`
      <strong>📍 Selected Location</strong>

      <br><br>

      Latitude:
      ${latitude.toFixed(6)}

      <br>

      Longitude:
      ${longitude.toFixed(6)}
    `)
    .openPopup()

  selectedLocation.value = {
    latitude,
    longitude
  }

  emit(
    'location-selected',
    {
      latitude,
      longitude
    }
  )
}

/* =========================================================
   DISPLAY EMERGENCIES
========================================================= */

const displayEmergencies =
  emergencies => {
    if (!emergencyLayer) return

    emergencyLayer.clearLayers()

    emergencies.forEach(
      emergency => {
        if (
          emergency.latitude ==
            null ||
          emergency.longitude ==
            null
        ) {
          return
        }

        const latitude =
          Number(
            emergency.latitude
          )

        const longitude =
          Number(
            emergency.longitude
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

        const priority =
          emergency.priority ||
          emergency.severity ||
          'Low'

        const status =
          String(
            emergency.status ||
              'pending'
          ).toLowerCase()

        const color =
          getPriorityColor(
            priority,
            status
          )

        const marker =
          L.circleMarker(
            [
              latitude,
              longitude
            ],
            {
              radius:
                status ===
                'resolved'
                  ? 7
                  : 11,

              fillColor:
                color,

              color:
                '#ffffff',

              weight: 3,

              opacity: 1,

              fillOpacity:
                status ===
                'resolved'
                  ? 0.5
                  : 0.9
            }
          )

        marker.bindPopup(
          createPopup(
            emergency,
            color
          )
        )

        emergencyLayer.addLayer(
          marker
        )
      }
    )
  }

/* =========================================================
   POPUP
========================================================= */

const createPopup = (
  emergency,
  color
) => {
  const status =
    String(
      emergency.status ||
        'pending'
    ).toLowerCase()

  const volunteer =
    emergency.assignedVolunteer ||
    emergency.assignedVolunteerName

  let statusContent = ''

  if (
    status === 'pending'
  ) {
    statusContent = `
      <div style="
        margin-top:10px;
        padding:8px;
        border-radius:7px;
        background:#fef3c7;
        color:#b45309;
        text-align:center;
        font-weight:600;
        font-size:12px;
      ">
        ⏳ Waiting for a volunteer
      </div>
    `

    if (props.volunteerId) {
      statusContent += `
        <button
          class="aidmap-accept-button"
          data-emergency-id="${escapeHtml(
            emergency.firestoreId ||
            emergency._id ||
            emergency.id
          )}"

          style="
            width:100%;
            margin-top:10px;
            padding:10px;
            border:none;
            border-radius:8px;
            background:#16a34a;
            color:white;
            font-weight:700;
            cursor:pointer;
            font-size:13px;
          "
        >
          🙋 I Can Help
        </button>
      `
    }
  }

  else if (
    status === 'accepted'
  ) {
    statusContent = `
      <div style="
        margin-top:10px;
        padding:8px;
        border-radius:7px;
        background:#dbeafe;
        color:#2563eb;
        text-align:center;
        font-weight:600;
        font-size:12px;
      ">
        🙋 Help is on the way
      </div>
    `
  }

  else if (
    status === 'in progress' ||
    status === 'in_progress'
  ) {
    statusContent = `
      <div style="
        margin-top:10px;
        padding:8px;
        border-radius:7px;
        background:#ede9fe;
        color:#7c3aed;
        text-align:center;
        font-weight:600;
        font-size:12px;
      ">
        🚑 Volunteer is responding
      </div>
    `
  }

  else if (
    status === 'resolved'
  ) {
    statusContent = `
      <div style="
        margin-top:10px;
        padding:8px;
        border-radius:7px;
        background:#dcfce7;
        color:#16a34a;
        text-align:center;
        font-weight:600;
        font-size:12px;
      ">
        ✅ Resolved
      </div>
    `
  }

  return `
    <div style="min-width:220px;">

      <h3 style="
        margin:0 0 8px;
        font-size:16px;
      ">
        ${getIcon(
          emergency.type
        )}

        ${escapeHtml(
          emergency.type ||
            'Emergency'
        )}
      </h3>

      <div style="
        margin-bottom:6px;
        font-weight:600;
      ">
        Priority:

        <span style="
          color:${color};
        ">
          ${escapeHtml(
            emergency.priority ||
              emergency.severity ||
              'Unknown'
          )}
        </span>
      </div>

      <div style="
        margin-bottom:8px;
        font-size:12px;
      ">
        Status:

        <strong>
          ${escapeHtml(
            emergency.status ||
              'pending'
          )}
        </strong>
      </div>

      <p style="
        margin:8px 0;
        color:#374151;
        font-size:13px;
      ">
        ${escapeHtml(
          emergency.description ||
            'No description provided.'
        )}
      </p>

      <div style="
        font-size:11px;
        color:#6b7280;
      ">
        📍
        ${latitudeText(
          emergency.latitude
        )},
        ${longitudeText(
          emergency.longitude
        )}
      </div>

      ${
        volunteer
          ? `
            <div style="
              margin-top:8px;
              color:#6b7280;
              font-size:12px;
            ">
              👤 Volunteer:

              <strong>
                ${escapeHtml(
                  volunteer
                )}
              </strong>
            </div>
          `
          : ''
      }

      ${statusContent}

    </div>
  `
}

/* =========================================================
   ACCEPT EMERGENCY
========================================================= */

const handlePopupClick =
  event => {
    const button =
      event.target.closest(
        '.aidmap-accept-button'
      )

    if (!button) return

    const emergencyId =
      button.dataset.emergencyId

    if (!emergencyId) return

    emit(
      'accept-emergency',
      emergencyId
    )

    acceptEmergency(
      emergencyId
    )
  }

const acceptEmergency =
  async emergencyId => {
    if (!props.volunteerId) {
      alert(
        'Please login as a volunteer first.'
      )

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

          assignedVolunteer:
            props.volunteerId,

          assignedVolunteerId:
            props.volunteerId,

          acceptedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      )

      console.log(
        '✅ Emergency accepted'
      )
    }

    catch (error) {
      console.error(
        '❌ Accept emergency failed:',
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
   HELPERS
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
    Power: '⚡'
  }

  return (
    icons[type] ||
    '🚨'
  )
}

const getPriorityColor =
  (
    priority,
    status
  ) => {
    if (
      status ===
      'resolved'
    ) {
      return '#22c55e'
    }

    switch (
      String(
        priority || ''
      ).toLowerCase()
    ) {
      case 'critical':
        return '#dc2626'

      case 'high':
        return '#ef4444'

      case 'medium':
        return '#f59e0b'

      case 'low':
        return '#22c55e'

      default:
        return '#64748b'
    }
  }

const latitudeText =
  value => {
    const number =
      Number(value)

    return Number.isFinite(
      number
    )
      ? number.toFixed(5)
      : '--'
  }

const longitudeText =
  value => {
    const number =
      Number(value)

    return Number.isFinite(
      number
    )
      ? number.toFixed(5)
      : '--'
  }

const escapeHtml =
  value => {
    if (
      value === null ||
      value === undefined
    ) {
      return ''
    }

    return String(value)
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      )
  }

/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {
  initializeMap()

  subscribeToEmergencies()

  /*
   * Listen for popup button clicks.
   */
  if (map) {
    map.on(
      'popupopen',
      event => {
        const popupElement =
          event.popup.getElement()

        if (!popupElement) return

        popupElement.addEventListener(
          'click',
          handlePopupClick
        )
      }
    )
  }
})

onBeforeUnmount(() => {
  if (
    unsubscribeEmergencies
  ) {
    unsubscribeEmergencies()

    unsubscribeEmergencies =
      null
  }

  if (map) {
    map.remove()

    map = null
  }
})
</script>

<template>
  <div class="crisis-dashboard">

    <!-- =====================================================
         HEADER
    ====================================================== -->

    <header class="dashboard-header">

      <div>
        <h1>
          🚨 Crisis Response Center
        </h1>

        <p>
          Monitor emergencies, coordinate volunteers
          and find nearby emergency services.
        </p>
      </div>

      <div class="live-indicator">
        <span class="live-dot"></span>
        LIVE
      </div>

    </header>


    <!-- =====================================================
         STATS
    ====================================================== -->

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
            {{ totalEmergencies() }}
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
            {{ pendingEmergencies() }}
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
            {{ activeEmergencies() }}
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
            {{ resolvedEmergencies() }}
          </strong>
        </div>
      </div>

    </section>


    <!-- =====================================================
         MAP
    ====================================================== -->

    <section class="dashboard-card">

      <div class="card-header">

        <div>
          <h2>
            🗺️ Live Emergency Map
          </h2>

          <p>
            Click anywhere on the map to select a location.
          </p>
        </div>

        <span class="map-status">
          🟢 Real-time
        </span>

      </div>

      <div class="map-wrapper">

        <div
          ref="mapContainer"
          class="disaster-map"
        ></div>

      </div>

    </section>


    <!-- =====================================================
         EMERGENCY LIST
    ====================================================== -->

    <section class="dashboard-card emergency-section">

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
          :class="{ active: activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          All
        </button>

        <button
          :class="{ active: activeFilter === 'pending' }"
          @click="activeFilter = 'pending'"
        >
          ⏳ Pending
        </button>

        <button
          :class="{ active: activeFilter === 'accepted' }"
          @click="activeFilter = 'accepted'"
        >
          🙋 Accepted
        </button>

        <button
          :class="{ active: activeFilter === 'resolved' }"
          @click="activeFilter = 'resolved'"
        >
          ✅ Resolved
        </button>

      </div>


      <!-- LOADING -->

      <div
        v-if="loadingEmergencies"
        class="empty-state"
      >
        🔄 Loading emergencies...
      </div>


      <!-- EMPTY -->

      <div
        v-else-if="filteredEmergencies().length === 0"
        class="empty-state"
      >
        <div>
          📭
        </div>

        <strong>
          No emergencies found
        </strong>

        <p>
          There are no emergency requests matching your filter.
        </p>
      </div>


      <!-- LIST -->

      <div
        v-else
        class="emergency-list"
      >

        <article
          v-for="emergency in filteredEmergencies()"
          :key="emergency.firestoreId || emergency._id"
          class="emergency-card"
        >

          <div
            class="emergency-icon"
            :class="String(emergency.priority || 'low').toLowerCase()"
          >
            {{ getIcon(emergency.type) }}
          </div>

          <div class="emergency-content">

            <div class="emergency-title">

              <div>
                <h3>
                  {{ emergency.type || 'Emergency' }}
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
                :class="String(emergency.status || 'pending')
                  .toLowerCase()
                  .replace(' ', '-')"
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
                  emergency.assignedVolunteer ||
                  emergency.assignedVolunteerName
                "
              >
                👤
                {{
                  emergency.assignedVolunteer ||
                  emergency.assignedVolunteerName
                }}
              </span>

            </div>

          </div>

        </article>

      </div>

    </section>


    <!-- =====================================================
         NEARBY HELP
    ====================================================== -->

    <NearbyHelp
      :location="selectedLocation"
      @location-selected="handleNearbyLocation"
    />

  </div>
</template>

<script>
export default {
  methods: {
    handleNearbyLocation(location) {
      this.$emit(
        'location-selected',
        location
      )
    }
  }
}
</script>

<style scoped>

/* =========================================================
   PAGE
========================================================= */

.crisis-dashboard {
  width: 100%;
  min-height: 100vh;

  padding: 20px;

  box-sizing: border-box;

  background: #f8fafc;

  overflow-y: auto;
}


/* =========================================================
   HEADER
========================================================= */

.dashboard-header {
  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 20px;

  margin-bottom: 20px;
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
    opacity: 0.3;
  }

  100% {
    opacity: 1;
  }
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

  border: 1px solid #e2e8f0;

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

  border: 1px solid #e2e8f0;

  border-radius: 14px;

  overflow: hidden;
}

.card-header {
  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 15px 18px;

  border-bottom: 1px solid #e2e8f0;
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

.disaster-map {
  width: 100%;

  height: 100%;

  min-height: 400px;
}


/* =========================================================
   FILTERS
========================================================= */

.filters {
  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  padding: 14px 18px;

  border-bottom: 1px solid #e2e8f0;
}

.filters input {
  flex: 1;

  min-width: 180px;

  padding: 9px 11px;

  border: 1px solid #cbd5e1;

  border-radius: 7px;

  outline: none;

  font-size: 11px;
}

.filters button {
  border: 1px solid #e2e8f0;

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

  border: 1px solid #e2e8f0;

  border-radius: 10px;

  transition: 0.2s;
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

.status-badge.in-progress {
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
    align-items: flex-start;

    flex-direction: column;
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

}

</style>