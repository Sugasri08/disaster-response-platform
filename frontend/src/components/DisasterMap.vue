<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

// ------------------------------------
// PROPS
// ------------------------------------

const props = defineProps({
  volunteerId: {
    type: String,
    default: ''
  }
})

// ------------------------------------
// EVENTS
// ------------------------------------

const emit = defineEmits([
  'location-selected',
  'emergencies-updated'
])

// ------------------------------------
// MAP
// ------------------------------------

const mapContainer = ref(null)

let map = null
let selectedMarker = null
let emergencyLayer = null
let refreshInterval = null

// ------------------------------------
// INITIALIZE
// ------------------------------------

onMounted(() => {
  initializeMap()

  // Make functions available to
  // Leaflet popup buttons
  window.acceptEmergency = acceptEmergency
  window.resolveEmergency = resolveEmergency
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

  // ------------------------------------
  // OPEN STREET MAP
  // ------------------------------------

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(map)

  // ------------------------------------
  // EMERGENCY LAYER
  // ------------------------------------

  emergencyLayer =
    L.layerGroup().addTo(map)

  // ------------------------------------
  // MAP CLICK
  // ------------------------------------

  map.on(
    'click',
    handleMapClick
  )

  // ------------------------------------
  // INITIAL LOAD
  // ------------------------------------

  loadEmergencies()

  // ------------------------------------
  // AUTO REFRESH
  // ------------------------------------

  refreshInterval =
    setInterval(
      loadEmergencies,
      5000
    )
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
    '📍 Selected location:'
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

      // Update map

      displayEmergencies(
        emergencies
      )

      // Send latest data to App.vue

      emit(
        'emergencies-updated',
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

    if (!emergencyLayer) {
      return
    }

    // Remove old markers

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
              Number(
                emergency.latitude
              ),

              Number(
                emergency.longitude
              )
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
        // CHECK CURRENT VOLUNTEER
        // --------------------------------

        let currentVolunteerId =
          props.volunteerId

        if (!currentVolunteerId) {

          currentVolunteerId =
            localStorage.getItem(
              'aidmap-volunteer-id'
            )
        }

        const isMyEmergency =
          emergency.status === 'accepted' &&
          emergency.assignedVolunteer ===
            currentVolunteerId

        // --------------------------------
        // ACTION BUTTON
        // --------------------------------

        let actionButton = ''

        // Pending emergency

        if (
          emergency.status ===
          'pending'
        ) {

          actionButton = `
            <button
              onclick="
                window.acceptEmergency(
                  '${emergency._id}'
                )
              "
              style="
                width:100%;
                border:none;
                background:#22c55e;
                color:white;
                padding:11px;
                border-radius:8px;
                font-weight:700;
                cursor:pointer;
                margin-top:5px;
              "
            >
              🙋 I CAN HELP
            </button>
          `
        }

        // Accepted by current volunteer

        else if (isMyEmergency) {

          actionButton = `
            <button
              onclick="
                window.resolveEmergency(
                  '${emergency._id}'
                )
              "
              style="
                width:100%;
                border:none;
                background:#2563eb;
                color:white;
                padding:11px;
                border-radius:8px;
                font-weight:700;
                cursor:pointer;
                margin-top:5px;
              "
            >
              ✅ MARK AS RESOLVED
            </button>
          `
        }

        // Accepted by another volunteer

        else if (
          emergency.status ===
          'accepted'
        ) {

          actionButton = `
            <div
              style="
                background:#eff6ff;
                color:#2563eb;
                padding:10px;
                border-radius:8px;
                text-align:center;
                font-weight:600;
              "
            >
              🙋 Help is on the way
            </div>
          `
        }

        // Resolved

        else if (
          emergency.status ===
          'resolved'
        ) {

          actionButton = `
            <div
              style="
                background:#f0fdf4;
                color:#16a34a;
                padding:10px;
                border-radius:8px;
                text-align:center;
                font-weight:600;
              "
            >
              ✅ Resolved
            </div>
          `
        }

        // --------------------------------
        // POPUP
        // --------------------------------

        marker.bindPopup(`

          <div
            style="
              min-width:230px;
              font-family:Arial,sans-serif;
            "
          >

            <!-- TYPE -->

            <h3
              style="
                margin:0 0 10px;
                font-size:17px;
                color:#111827;
              "
            >
              🚨
              ${escapeHtml(
                emergency.type
              )}
            </h3>

            <!-- PRIORITY -->

            <div
              style="
                margin-bottom:7px;
                font-weight:600;
              "
            >

              Priority:

              <span
                style="
                  color:${color};
                "
              >
                ${escapeHtml(
                  emergency.priority
                )}
              </span>

            </div>

            <!-- STATUS -->

            <div
              style="
                margin-bottom:9px;
                font-size:13px;
              "
            >

              Status:

              <strong>
                ${getStatusText(
                  emergency.status
                )}
              </strong>

            </div>

            <!-- DESCRIPTION -->

            <p
              style="
                margin:8px 0;
                color:#374151;
                font-size:13px;
              "
            >
              ${escapeHtml(
                emergency.description
              )}
            </p>

            <!-- LOCATION -->

            <div
              style="
                font-size:11px;
                color:#6b7280;
                margin-bottom:12px;
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

            <!-- VOLUNTEER -->

            ${
              emergency.status ===
              'accepted'
                ? `
                  <div
                    style="
                      font-size:12px;
                      color:#6b7280;
                      margin-bottom:10px;
                    "
                  >
                    🙋 Volunteer assigned
                  </div>
                `
                : ''
            }

            <!-- ACTION -->

            ${actionButton}

          </div>

        `)

        // Add marker

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
  async (emergencyId) => {

    try {

      // --------------------------------
      // GET VOLUNTEER ID
      // --------------------------------

      let currentVolunteerId =
        props.volunteerId

      if (!currentVolunteerId) {

        currentVolunteerId =
          localStorage.getItem(
            'aidmap-volunteer-id'
          )
      }

      // --------------------------------
      // SAFETY CHECK
      // --------------------------------

      if (!currentVolunteerId) {

        alert(
          'Volunteer ID is not available. Please refresh the page.'
        )

        return
      }

      console.log(
        '🙋 Accept request received'
      )

      console.log(
        'Emergency ID:',
        emergencyId
      )

      console.log(
        'Volunteer ID:',
        currentVolunteerId
      )

      // --------------------------------
      // SEND TO BACKEND
      // --------------------------------

      const response =
        await axios.patch(
          `http://localhost:3000/api/emergencies/${emergencyId}/accept`,
          {
            volunteerId:
              currentVolunteerId
          }
        )

      console.log(
        '✅ Emergency accepted:',
        response.data
      )

      alert(
        'You are now helping with this emergency! 🙋'
      )

      // Refresh

      await loadEmergencies()

    } catch (error) {

      console.error(
        '❌ Failed to accept emergency:',
        error
      )

      if (error.response) {

        console.error(
          'Backend response:',
          error.response.data
        )

        alert(
          error.response.data.message ||
          'Failed to accept emergency.'
        )

      } else {

        alert(
          'Could not connect to the server.'
        )
      }
    }
  }

// ------------------------------------
// RESOLVE EMERGENCY
// ------------------------------------

const resolveEmergency =
  async (emergencyId) => {

    try {

      console.log(
        '✅ Resolve request received'
      )

      console.log(
        'Emergency ID:',
        emergencyId
      )

      // --------------------------------
      // SEND TO BACKEND
      // --------------------------------

      const response =
        await axios.patch(
          `http://localhost:3000/api/emergencies/${emergencyId}/resolve`
        )

      console.log(
        '✅ Emergency resolved:',
        response.data
      )

      alert(
        'Emergency marked as resolved! ✅'
      )

      // Refresh markers

      await loadEmergencies()

    } catch (error) {

      console.error(
        '❌ Failed to resolve emergency:',
        error
      )

      if (error.response) {

        console.error(
          'Backend response:',
          error.response.data
        )

        alert(
          error.response.data.message ||
          'Failed to resolve emergency.'
        )

      } else {

        alert(
          'Could not connect to the server.'
        )
      }
    }
  }

// ------------------------------------
// STATUS TEXT
// ------------------------------------

const getStatusText =
  (status) => {

    switch (status) {

      case 'accepted':
        return '🔵 Help is on the way'

      case 'resolved':
        return '✅ Resolved'

      default:
        return '🟡 Waiting for help'
    }
  }

// ------------------------------------
// PRIORITY COLOR
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
// ESCAPE HTML
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

  if (map) {

    map.remove()
  }

  // Remove global functions

  delete window.acceptEmergency
  delete window.resolveEmergency
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