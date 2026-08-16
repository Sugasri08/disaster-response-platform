<script setup>

import {
  onMounted,
  onBeforeUnmount,
  ref
} from 'vue'

import L from 'leaflet'
import axios from 'axios'

import 'leaflet/dist/leaflet.css'

// ------------------------------------
// EMIT
// ------------------------------------

const emit = defineEmits([
  'location-selected'
])

// ------------------------------------
// REFS
// ------------------------------------

const mapContainer = ref(null)

// ------------------------------------
// MAP VARIABLES
// ------------------------------------

let map = null
let selectedMarker = null
let emergencyLayer = null
let refreshInterval = null

// ------------------------------------
// VOLUNTEER ID
// ------------------------------------

const getVolunteerId = () => {

  let volunteerId =
    localStorage.getItem('aidmap_volunteer_id')

  if (!volunteerId) {

    volunteerId =
      'VOL-' +
      Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()

    localStorage.setItem(
      'aidmap_volunteer_id',
      volunteerId
    )
  }

  return volunteerId
}

const volunteerId = getVolunteerId()

console.log(
  '🙋 Your volunteer ID:',
  volunteerId
)

// ------------------------------------
// INITIALIZE MAP
// ------------------------------------

onMounted(() => {
  initializeMap()

  // Make functions available
  // to Leaflet popup buttons.
  window.acceptEmergency =
    acceptEmergency

  window.resolveEmergency =
    resolveEmergency
})

// ------------------------------------
// INITIALIZE MAP
// ------------------------------------

const initializeMap = () => {

  map = L.map(
    mapContainer.value
  ).setView(
    [12.8260, 80.2333],
    12
  )

  // OpenStreetMap
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(map)

  // Emergency marker layer
  emergencyLayer =
    L.layerGroup().addTo(map)

  // Map click
  map.on(
    'click',
    handleMapClick
  )

  // Load emergencies
  loadEmergencies()

  // Refresh every 5 seconds
  refreshInterval =
    setInterval(() => {
      loadEmergencies()
    }, 5000)
}

// ------------------------------------
// MAP CLICK
// ------------------------------------

const handleMapClick = (event) => {

  const latitude =
    event.latlng.lat

  const longitude =
    event.latlng.lng

  console.log(
    'Selected location:'
  )

  console.log(
    'Latitude:',
    latitude
  )

  console.log(
    'Longitude:',
    longitude
  )

  // Remove previous marker
  if (selectedMarker) {

    map.removeLayer(
      selectedMarker
    )
  }

  // Add new marker
  selectedMarker =
    L.marker([
      latitude,
      longitude
    ]).addTo(map)

  selectedMarker
    .bindPopup(
      `
        <strong>
          Selected Location
        </strong>
        <br>
        Latitude:
        ${latitude.toFixed(6)}
        <br>
        Longitude:
        ${longitude.toFixed(6)}
      `
    )
    .openPopup()

  // Send location to App.vue
  emit(
    'location-selected',
    {
      latitude,
      longitude
    }
  )
}

// ------------------------------------
// LOAD EMERGENCIES
// ------------------------------------

const loadEmergencies =
  async () => {

    try {

      const response =
        await axios.get(
          'http://localhost:3000/api/emergencies'
        )

      const emergencies =
        response.data.emergencies || []

      console.log(
        `📍 Loaded ${emergencies.length} emergencies`
      )

      displayEmergencies(
        emergencies
      )

    } catch (error) {

      console.error(
        '❌ Failed to load emergencies:',
        error.message
      )
    }
  }

// ------------------------------------
// DISPLAY EMERGENCIES
// ------------------------------------

const displayEmergencies =
  (emergencies) => {

    // Clear old markers
    emergencyLayer.clearLayers()

    emergencies.forEach(
      (emergency) => {

        // Ignore invalid locations
        if (
          emergency.latitude == null ||
          emergency.longitude == null
        ) {
          return
        }

        const color =
          getPriorityColor(
            emergency.priority
          )

        // --------------------------------
        // MARKER
        // --------------------------------

        const marker =
          L.circleMarker(
            [
              emergency.latitude,
              emergency.longitude
            ],
            {
              radius: 10,

              fillColor: color,

              color: '#ffffff',

              weight: 3,

              opacity: 1,

              fillOpacity: 0.9
            }
          )

        // --------------------------------
        // STATUS
        // --------------------------------

        const statusText =
          getStatusText(
            emergency.status
          )

        const statusColor =
          getStatusColor(
            emergency.status
          )

        // --------------------------------
        // BUTTON
        // --------------------------------

        let actionButton = ''

        if (
          emergency.status === 'pending'
        ) {

          actionButton = `
            <button
              onclick="
                window.acceptEmergency(
                  '${emergency._id}'
                )
              "
              style="
                width: 100%;
                border: none;
                background: #22c55e;
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
              "
            >
              🙋 I CAN HELP
            </button>
          `

        } else if (
          emergency.status === 'accepted'
        ) {

          actionButton = `
            <button
              onclick="
                window.resolveEmergency(
                  '${emergency._id}'
                )
              "
              style="
                width: 100%;
                border: none;
                background: #2563eb;
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
              "
            >
              ✅ MARK AS RESOLVED
            </button>
          `

        } else {

          actionButton = `
            <div
              style="
                background: #f0fdf4;
                color: #16a34a;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-weight: 600;
              "
            >
              ✅ Resolved
            </div>
          `
        }

        // --------------------------------
        // POPUP
        // --------------------------------

        marker.bindPopup(
          `
          <div
            style="
              min-width: 220px;
              font-family: Arial, sans-serif;
            "
          >

            <h3
              style="
                margin: 0 0 8px;
                font-size: 17px;
              "
            >
              🚨
              ${escapeHtml(
                emergency.type
              )}
            </h3>

            <div
              style="
                margin-bottom: 7px;
                font-weight: 600;
              "
            >
              Priority:

              <span
                style="
                  color: ${color};
                "
              >
                ${escapeHtml(
                  emergency.priority
                )}
              </span>
            </div>

            <div
              style="
                margin-bottom: 8px;
                font-size: 13px;
              "
            >
              Status:

              <strong
                style="
                  color: ${statusColor};
                "
              >
                ${statusText}
              </strong>
            </div>

            <p
              style="
                margin: 8px 0;
                color: #374151;
                line-height: 1.4;
              "
            >
              ${escapeHtml(
                emergency.description
              )}
            </p>

            <div
              style="
                font-size: 11px;
                color: #6b7280;
                margin-bottom: 12px;
              "
            >
              📍
              ${Number(
                emergency.latitude
              ).toFixed(5)},

              ${Number(
                emergency.longitude
              ).toFixed(5)}
            </div>

            ${actionButton}

          </div>
          `
        )

        marker.addTo(
          emergencyLayer
        )
      }
    )
  }

// ------------------------------------
// ACCEPT EMERGENCY
// ------------------------------------

const acceptEmergency =
  async (id) => {

    try {

      console.log(
        '🙋 Accepting emergency:',
        id
      )

      const response =
        await axios.patch(
          `http://localhost:3000/api/emergencies/${id}/accept`,
          {
            volunteerId
          }
        )

      console.log(
        '✅ Emergency accepted:',
        response.data
      )

      // Refresh map
      await loadEmergencies()

    } catch (error) {

      console.error(
        '❌ Failed to accept emergency:',
        error.response?.data ||
        error.message
      )

      alert(
        error.response?.data?.message ||
        'Could not accept this emergency.'
      )

      // Refresh in case another
      // volunteer accepted it
      await loadEmergencies()
    }
  }

// ------------------------------------
// RESOLVE EMERGENCY
// ------------------------------------

const resolveEmergency =
  async (id) => {

    const confirmed =
      window.confirm(
        'Have you successfully helped this person?'
      )

    if (!confirmed) {
      return
    }

    try {

      console.log(
        '✅ Resolving emergency:',
        id
      )

      const response =
        await axios.patch(
          `http://localhost:3000/api/emergencies/${id}/resolve`
        )

      console.log(
        '✅ Emergency resolved:',
        response.data
      )

      // Refresh map
      await loadEmergencies()

    } catch (error) {

      console.error(
        '❌ Failed to resolve emergency:',
        error.response?.data ||
        error.message
      )

      alert(
        error.response?.data?.message ||
        'Could not resolve this emergency.'
      )

      await loadEmergencies()
    }
  }

// ------------------------------------
// PRIORITY COLORS
// ------------------------------------

const getPriorityColor =
  (priority) => {

    switch (priority) {

      case 'Critical':
        return '#ef4444'

      case 'Medium':
        return '#f59e0b'

      case 'Low':
        return '#22c55e'

      default:
        return '#6b7280'
    }
  }

// ------------------------------------
// STATUS TEXT
// ------------------------------------

const getStatusText =
  (status) => {

    switch (status) {

      case 'pending':
        return '🟡 Waiting for help'

      case 'accepted':
        return '🔵 Help is on the way'

      case 'resolved':
        return '🟢 Resolved'

      default:
        return 'Unknown'
    }
  }

// ------------------------------------
// STATUS COLOR
// ------------------------------------

const getStatusColor =
  (status) => {

    switch (status) {

      case 'pending':
        return '#f59e0b'

      case 'accepted':
        return '#2563eb'

      case 'resolved':
        return '#16a34a'

      default:
        return '#6b7280'
    }
  }

// ------------------------------------
// HTML ESCAPING
// ------------------------------------

const escapeHtml =
  (value) => {

    if (!value) {
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

// ------------------------------------
// CLEANUP
// ------------------------------------

onBeforeUnmount(() => {

  if (refreshInterval) {

    clearInterval(
      refreshInterval
    )
  }

  // Remove global functions
  delete window.acceptEmergency
  delete window.resolveEmergency

  if (map) {
    map.remove()
  }
})

</script>

<template>

  <div
    ref="mapContainer"
    class="disaster-map"
  ></div>

</template>

<style scoped>

.disaster-map {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

</style>