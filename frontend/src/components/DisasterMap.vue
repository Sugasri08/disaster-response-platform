<script setup>
import {
  onMounted,
  onBeforeUnmount,
  ref,
  watch
} from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* =========================
   LEAFLET DEFAULT ICON FIX
========================= */

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

/* =========================
   PROPS
========================= */

const props = defineProps({
  emergencies: {
    type: Array,
    default: () => []
  },

  focusLocation: {
    type: Object,
    default: null
  },

  volunteerId: {
    type: String,
    default: ''
  }
})

/* =========================
   EVENTS
========================= */

const emit = defineEmits([
  'location-selected',
  'emergencies-updated',
  'accept-emergency'
])

/* =========================
   MAP STATE
========================= */

const mapContainer = ref(null)

let map = null
let selectedMarker = null
let emergencyLayer = null

/* =========================
   MOUNT
========================= */

onMounted(() => {
  initializeMap()

  /*
   * If emergencies are already
   * available when component loads.
   */
  displayEmergencies(props.emergencies)
})

/* =========================
   INITIALIZE MAP
========================= */

const initializeMap = () => {
  if (!mapContainer.value) {
    return
  }

  map = L.map(mapContainer.value).setView(
    [12.8260, 80.2333],
    12
  )

  /* OpenStreetMap */

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,

      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(map)

  /* Emergency marker layer */

  emergencyLayer =
    L.layerGroup().addTo(map)

  /* User map click */

  map.on(
    'click',
    handleMapClick
  )

  /*
   * IMPORTANT:
   * Leaflet popups contain HTML generated
   * outside Vue's template system.
   *
   * Therefore we listen for popupopen
   * directly on the map.
   */

  map.on(
    'popupopen',
    handlePopupOpen
  )

  /*
   * Leaflet sometimes calculates its
   * dimensions before the parent layout
   * has completely rendered.
   */

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 300)
}

/* =========================
   EMERGENCIES WATCHER
========================= */

watch(
  () => props.emergencies,

  (emergencies) => {
    if (!map || !emergencyLayer) {
      return
    }

    displayEmergencies(
      emergencies || []
    )
  },

  {
    deep: true,
    immediate: true
  }
)

/* =========================
   FOCUS LOCATION WATCHER
========================= */

watch(
  () => props.focusLocation,

  (location) => {
    if (!location || !map) {
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

    /*
     * Replace selected marker
     */

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
        <div style="min-width:180px;">
          <strong>
            📍 Selected Location
          </strong>

          <br><br>

          Latitude:
          ${latitude.toFixed(6)}

          <br>

          Longitude:
          ${longitude.toFixed(6)}
        </div>
      `)
      .openPopup()
  },

  {
    deep: true
  }
)

/* =========================
   MAP CLICK
========================= */

const handleMapClick = (event) => {
  if (!map) {
    return
  }

  const latitude =
    event.latlng.lat

  const longitude =
    event.latlng.lng

  /*
   * Remove previous selected marker
   */

  if (selectedMarker) {
    map.removeLayer(
      selectedMarker
    )
  }

  /*
   * Create new selected marker
   */

  selectedMarker =
    L.marker([
      latitude,
      longitude
    ]).addTo(map)

  selectedMarker
    .bindPopup(`
      <div style="min-width:180px;">
        <strong>
          📍 Selected Location
        </strong>

        <br><br>

        Latitude:
        ${latitude.toFixed(6)}

        <br>

        Longitude:
        ${longitude.toFixed(6)}
      </div>
    `)
    .openPopup()

  /*
   * Tell parent component
   */

  emit(
    'location-selected',
    {
      latitude,
      longitude
    }
  )
}

/* =========================
   DISPLAY EMERGENCIES
========================= */

const displayEmergencies = (
  emergencies
) => {
  if (!emergencyLayer) {
    return
  }

  /*
   * Remove old markers
   */

  emergencyLayer.clearLayers()

  emergencies.forEach(
    (emergency) => {

      /*
       * Validate coordinates
       */

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

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return
      }

      /*
       * Normalize status
       */

      const status =
        normalizeStatus(
          emergency.status
        )

      /*
       * Priority
       */

      const priority =
        emergency.priority ||
        emergency.severity ||
        'Low'

      /*
       * Marker color
       */

      const color =
        getPriorityColor(
          priority,
          status
        )

      /*
       * Resolved emergencies
       * get a smaller marker.
       */

      const isResolved =
        status === 'RESOLVED'

      const marker =
        L.circleMarker(
          [
            latitude,
            longitude
          ],
          {
            radius:
              isResolved
                ? 7
                : 11,

            fillColor:
              color,

            color:
              '#ffffff',

            weight:
              3,

            opacity:
              1,

            fillOpacity:
              isResolved
                ? 0.55
                : 0.9
          }
        )

      /*
       * Popup
       */

      marker.bindPopup(
        createPopup(
          emergency,
          color
        )
      )

      /*
       * Add marker
       */

      marker.addTo(
        emergencyLayer
      )
    }
  )
}

/* =========================
   CREATE POPUP
========================= */

const createPopup = (
  emergency,
  color
) => {

  const status =
    normalizeStatus(
      emergency.status
    )

  const priority =
    priorityText(
      emergency
    )

  const volunteerName =
    emergency.assignedVolunteerName ||
    emergency.assignedVolunteer

  const emergencyId =
    emergency.firestoreId ||
    emergency._id ||
    emergency.id ||
    ''

  /*
   * Location
   */

  const latitude =
    Number(emergency.latitude)

  const longitude =
    Number(emergency.longitude)

  /*
   * Google Maps directions
   */

  const mapsUrl =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`

      : '#'

  /*
   * Status content
   */

  let statusContent = ''

  if (status === 'PENDING') {

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

    /*
     * Volunteer can accept
     */

    if (
      props.volunteerId &&
      emergencyId
    ) {

      statusContent += `
        <button
          class="aidmap-accept-button"
          data-emergency-id="${escapeHtml(emergencyId)}"
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

  } else if (
    status === 'ACCEPTED'
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

  } else if (
    status === 'IN_PROGRESS'
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
        🚑 Response in progress
      </div>
    `

  } else if (
    status === 'RESOLVED'
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

  } else {

    statusContent = `
      <div style="
        margin-top:10px;
        padding:8px;
        border-radius:7px;
        background:#f1f5f9;
        color:#475569;
        text-align:center;
        font-weight:600;
        font-size:12px;
      ">
        ${escapeHtml(status)}
      </div>
    `
  }

  /*
   * Volunteer information
   */

  const volunteerContent =
    volunteerName
      ? `
        <div style="
          margin-top:8px;
          color:#6b7280;
          font-size:12px;
        ">
          👤 Volunteer:
          <strong>
            ${escapeHtml(
              volunteerName
            )}
          </strong>
        </div>
      `
      : ''

  /*
   * Additional contact
   */

  const contact =
    emergency.contact ||
    emergency.phone ||
    emergency.contactNumber ||
    ''

  const contactContent =
    contact
      ? `
        <div style="
          margin-top:6px;
          font-size:12px;
          color:#475569;
        ">
          📞
          ${escapeHtml(
            contact
          )}
        </div>
      `
      : ''

  /*
   * Address
   */

  const address =
    emergency.address ||
    emergency.locationAddress ||
    ''

  const addressContent =
    address
      ? `
        <div style="
          margin-top:6px;
          font-size:12px;
          color:#475569;
        ">
          🏠
          ${escapeHtml(
            address
          )}
        </div>
      `
      : ''

  return `
    <div
      style="
        min-width:230px;
        max-width:280px;
      "
    >

      <!-- TITLE -->

      <h3 style="
        margin:0 0 10px;
        font-size:16px;
        color:#0f172a;
      ">
        ${getIcon(
          emergency.type
        )}

        ${escapeHtml(
          emergency.type ||
          'Emergency'
        )}
      </h3>

      <!-- PRIORITY -->

      <div style="
        margin-bottom:6px;
        font-weight:600;
        font-size:12px;
      ">

        Priority:

        <span style="
          color:${color};
          font-weight:800;
        ">
          ${escapeHtml(
            priority
          )}
        </span>

      </div>

      <!-- STATUS -->

      <div style="
        margin-bottom:8px;
        font-size:12px;
      ">

        Status:

        <strong>
          ${escapeHtml(
            status
          )}
        </strong>

      </div>

      <!-- DESCRIPTION -->

      <p style="
        margin:8px 0;
        color:#374151;
        font-size:13px;
        line-height:1.4;
      ">
        ${escapeHtml(
          emergency.description ||
          'No description provided.'
        )}
      </p>

      <!-- ADDRESS -->

      ${addressContent}

      <!-- CONTACT -->

      ${contactContent}

      <!-- COORDINATES -->

      <div style="
        margin-top:8px;
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

      <!-- VOLUNTEER -->

      ${volunteerContent}

      <!-- DIRECTIONS -->

      ${
        Number.isFinite(
          latitude
        ) &&
        Number.isFinite(
          longitude
        )
          ? `
            <a
              href="${mapsUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:block;
                margin-top:10px;
                padding:8px;
                border-radius:7px;
                background:#eff6ff;
                color:#1d4ed8;
                text-decoration:none;
                text-align:center;
                font-weight:700;
                font-size:12px;
              "
            >
              🗺️ Get Directions
            </a>
          `
          : ''
      }

      <!-- STATUS ACTION -->

      ${statusContent}

    </div>
  `
}

/* =========================
   POPUP OPEN
========================= */

const handlePopupOpen = (
  event
) => {

  const popupElement =
    event.popup.getElement()

  if (!popupElement) {
    return
  }

  /*
   * Avoid adding duplicate listeners
   */

  popupElement.addEventListener(
    'click',
    handlePopupClick
  )
}

/* =========================
   POPUP BUTTON CLICK
========================= */

const handlePopupClick = (
  event
) => {

  const target =
    event.target

  if (
    !(target instanceof Element)
  ) {
    return
  }

  const button =
    target.closest(
      '.aidmap-accept-button'
    )

  if (!button) {
    return
  }

  const emergencyId =
    button.dataset.emergencyId

  if (!emergencyId) {
    return
  }

  /*
   * Disable button immediately
   * to prevent double clicking.
   */

  button.disabled = true

  button.textContent =
    '⏳ Accepting...'

  button.style.opacity =
    '0.7'

  emit(
    'accept-emergency',
    emergencyId
  )
}

/* =========================
   NORMALIZE STATUS
========================= */

const normalizeStatus = (
  status
) => {

  return String(
    status || 'PENDING'
  )
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
}

/* =========================
   PRIORITY TEXT
========================= */

const priorityText = (
  emergency
) => {

  return (
    emergency.priority ||
    emergency.severity ||
    'Low'
  )
}

/* =========================
   ICONS
========================= */

const getIcon = (
  type
) => {

  const icons = {

    'Potable Water':
      '💧',

    'Medical Aid':
      '🚑',

    'Search & Rescue':
      '🛟',

    Shelter:
      '🏠',

    Water:
      '💧',

    Medical:
      '🏥',

    Rescue:
      '🛟',

    Transport:
      '🚗',

    'Food/Supplies':
      '📦',

    Food:
      '🍱',

    Supplies:
      '📦',

    Power:
      '⚡'
  }

  return (
    icons[type] ||
    '🚨'
  )
}

/* =========================
   PRIORITY COLOR
========================= */

const getPriorityColor = (
  priority,
  status
) => {

  if (
    normalizeStatus(status) ===
    'RESOLVED'
  ) {
    return '#22c55e'
  }

  switch (
    String(priority)
      .toLowerCase()
      .trim()
  ) {

    case 'critical':
      return '#dc2626'

    case 'high':
      return '#f97316'

    case 'medium':
      return '#f59e0b'

    case 'low':
      return '#22c55e'

    default:
      return '#6b7280'
  }
}

/* =========================
   LATITUDE
========================= */

const latitudeText = (
  value
) => {

  const number =
    Number(value)

  return Number.isFinite(
    number
  )
    ? number.toFixed(5)
    : '--'
}

/* =========================
   LONGITUDE
========================= */

const longitudeText = (
  value
) => {

  const number =
    Number(value)

  return Number.isFinite(
    number
  )
    ? number.toFixed(5)
    : '--'
}

/* =========================
   HTML ESCAPE
========================= */

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

/* =========================
   CLEANUP
========================= */

onBeforeUnmount(() => {

  if (map) {

    map.off(
      'click',
      handleMapClick
    )

    map.off(
      'popupopen',
      handlePopupOpen
    )

    map.remove()

    map = null
  }

  selectedMarker = null
  emergencyLayer = null
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

/*
 * Leaflet itself needs a real height.
 */

:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 12px;
}

/*
 * Popup styling
 */

:deep(.leaflet-popup-content) {
  margin: 12px;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 10px;
}

:deep(.aidmap-accept-button:hover) {
  filter: brightness(0.95);
}

</style>