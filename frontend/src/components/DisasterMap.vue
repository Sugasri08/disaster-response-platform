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
  getEmergencies
} from '../services/api'

// Fix Leaflet marker icons
delete L.Icon.Default.prototype
  ._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

const props = defineProps({
  focusLocation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'location-selected'
])

const mapContainer = ref(null)

let map = null

let selectedMarker = null

let emergencyLayer = null

let refreshInterval = null

// ------------------------------------
// INITIALIZE
// ------------------------------------

onMounted(() => {

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

  loadEmergencies()

  refreshInterval =
    setInterval(
      loadEmergencies,
      5000
    )

})


// ------------------------------------
// WATCH MAP FOCUS
// ------------------------------------

watch(
  () => props.focusLocation,
  (location) => {

    if (
      !location ||
      !map
    ) {
      return
    }

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

    map.flyTo(
      [latitude, longitude],
      15,
      {
        duration: 1
      }
    )

  },
  {
    deep: true
  }
)


// ------------------------------------
// MAP CLICK
// ------------------------------------

const handleMapClick = (event) => {

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
      <strong>Selected Location</strong>
      <br>
      Latitude:
      ${latitude.toFixed(6)}
      <br>
      Longitude:
      ${longitude.toFixed(6)}
    `)
    .openPopup()

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

const loadEmergencies = async () => {

  try {

    const response =
      await getEmergencies()

    const emergencies =
      response.emergencies || []

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
// DISPLAY
// ------------------------------------

const displayEmergencies = (
  emergencies
) => {

  if (!emergencyLayer) {
    return
  }

  emergencyLayer.clearLayers()

  emergencies.forEach(
    emergency => {

      if (
        emergency.latitude == null ||
        emergency.longitude == null
      ) {
        return
      }

      const latitude =
        Number(emergency.latitude)

      const longitude =
        Number(emergency.longitude)

      const color =
        getPriorityColor(
          emergency.priority
        )

      const marker =
        L.circleMarker(
          [
            latitude,
            longitude
          ],
          {
            radius:
              emergency.status ===
              'resolved'
                ? 7
                : 10,

            fillColor: color,

            color: '#ffffff',

            weight: 3,

            opacity: 1,

            fillOpacity:
              emergency.status ===
              'resolved'
                ? 0.55
                : 0.9
          }
        )

      marker.bindPopup(
        createPopup(
          emergency,
          color
        )
      )

      marker.addTo(
        emergencyLayer
      )

    }
  )

}


// ------------------------------------
// POPUP
// ------------------------------------

const createPopup = (
  emergency,
  color
) => {

  const volunteer =
    emergency.assignedVolunteer
      ? `
        <div style="
          margin-top: 8px;
          color: #6b7280;
          font-size: 12px;
        ">
          👤 Volunteer:
          <strong>
            ${escapeHtml(
              emergency.assignedVolunteer
            )}
          </strong>
        </div>
      `
      : ''

  let statusContent = ''

  if (
    emergency.status ===
    'pending'
  ) {

    statusContent = `
      <div style="
        margin-top: 10px;
        padding: 8px;
        border-radius: 7px;
        background: #fef3c7;
        color: #b45309;
        text-align: center;
        font-weight: 600;
        font-size: 12px;
      ">
        ⏳ Waiting for a volunteer
      </div>
    `

  } else if (
    emergency.status ===
    'accepted'
  ) {

    statusContent = `
      <div style="
        margin-top: 10px;
        padding: 8px;
        border-radius: 7px;
        background: #dbeafe;
        color: #2563eb;
        text-align: center;
        font-weight: 600;
        font-size: 12px;
      ">
        🙋 Help is on the way
      </div>
    `

  } else {

    statusContent = `
      <div style="
        margin-top: 10px;
        padding: 8px;
        border-radius: 7px;
        background: #dcfce7;
        color: #16a34a;
        text-align: center;
        font-weight: 600;
        font-size: 12px;
      ">
        ✅ Resolved
      </div>
    `

  }

  return `
    <div style="
      min-width: 220px;
    ">

      <h3 style="
        margin: 0 0 8px;
        font-size: 16px;
      ">
        ${getIcon(emergency.type)}
        ${escapeHtml(
          emergency.type
        )}
      </h3>

      <div style="
        margin-bottom: 6px;
        font-weight: 600;
      ">

        Priority:

        <span style="
          color: ${color};
        ">
          ${escapeHtml(
            emergency.priority
          )}
        </span>

      </div>

      <div style="
        margin-bottom: 8px;
        font-size: 12px;
      ">

        Status:
        <strong>
          ${escapeHtml(
            emergency.status
          )}
        </strong>

      </div>

      <p style="
        margin: 8px 0;
        color: #374151;
        font-size: 13px;
      ">

        ${escapeHtml(
          emergency.description
        )}

      </p>

      <div style="
        font-size: 11px;
        color: #6b7280;
      ">

        📍
        ${latitudeText(
          emergency.latitude
        )},
        ${longitudeText(
          emergency.longitude
        )}

      </div>

      ${volunteer}

      ${statusContent}

    </div>
  `
}


// ------------------------------------
// ICON
// ------------------------------------

const getIcon = (type) => {

  const icons = {
    Water: '💧',
    Medical: '🏥',
    Food: '🍱',
    Rescue: '🛟',
    Shelter: '🏠',
    Power: '⚡'
  }

  return icons[type] || '🚨'
}


// ------------------------------------
// PRIORITY COLOR
// ------------------------------------

const getPriorityColor = (
  priority
) => {

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
// FORMAT COORDINATES
// ------------------------------------

const latitudeText = (
  value
) => {

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number.toFixed(5)
    : '--'

}

const longitudeText = (
  value
) => {

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number.toFixed(5)
    : '--'

}


// ------------------------------------
// ESCAPE HTML
// ------------------------------------

const escapeHtml = (
  value
) => {

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

  min-height: 400px;
}

</style>