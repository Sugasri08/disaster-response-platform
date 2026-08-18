<script setup>

import {
  onMounted,
  onBeforeUnmount,
  watch,
  ref
} from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


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


/* =========================================================
   EVENTS
========================================================= */

const emit = defineEmits([
  'location-selected',
  'emergencies-updated',
  'accept-emergency'
])


/* =========================================================
   MAP STATE
========================================================= */

const mapContainer = ref(null)

let map = null

let selectedMarker = null

let emergencyLayer = null

let userLocationMarker = null

let userLocationCircle = null


/* =========================================================
   DEFAULT MAP VIEW
========================================================= */

/*
 * This is ONLY a temporary world view.
 *
 * It is NOT a hardcoded user location.
 *
 * The map will immediately move to the user's
 * real browser location when available.
 */

const DEFAULT_MAP_CENTER = [
  20,
  0
]

const DEFAULT_ZOOM = 2


/* =========================================================
   MOUNT
========================================================= */

onMounted(() => {

  initializeMap()

})


/* =========================================================
   INITIALIZE MAP
========================================================= */

const initializeMap = () => {

  if (!mapContainer.value) {
    return
  }


  /*
   * Start with a neutral world view.
   *
   * This prevents the application from pretending
   * that the user is at a hardcoded location.
   */

  map =
    L.map(
      mapContainer.value
    ).setView(
      DEFAULT_MAP_CENTER,
      DEFAULT_ZOOM
    )


  /* -------------------------------------------------------
     OPENSTREETMAP
  ------------------------------------------------------- */

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,

      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(map)


  /* -------------------------------------------------------
     EMERGENCY LAYER
  ------------------------------------------------------- */

  emergencyLayer =
    L.layerGroup().addTo(map)


  /* -------------------------------------------------------
     MAP CLICK
  ------------------------------------------------------- */

  map.on(
    'click',
    handleMapClick
  )


  /* -------------------------------------------------------
     POPUP
  ------------------------------------------------------- */

  map.on(
    'popupopen',
    handlePopupOpen
  )


  /* -------------------------------------------------------
     INITIAL DATA
  ------------------------------------------------------- */

  displayEmergencies(
    props.emergencies || []
  )


  /*
   * If parent already knows user's location,
   * immediately use it.
   */

  if (
    props.focusLocation &&
    isValidLocation(
      props.focusLocation
    )
  ) {

    updateUserLocation(
      props.focusLocation.latitude,
      props.focusLocation.longitude
    )

  }
  else {

    /*
     * Otherwise ask browser for location.
     */

    requestBrowserLocation()

  }


  /* -------------------------------------------------------
     MAP SIZE
  ------------------------------------------------------- */

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
   BROWSER GEOLOCATION
========================================================= */

const requestBrowserLocation = () => {

  if (!navigator.geolocation) {

    console.warn(
      'Browser does not support geolocation.'
    )

    return

  }


  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        Number(
          position.coords.latitude
        )

      const longitude =
        Number(
          position.coords.longitude
        )


      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {

        return

      }


      console.log(
        '📍 DisasterMap browser location:',
        latitude,
        longitude
      )


      /*
       * Update map.
       */

      updateUserLocation(
        latitude,
        longitude
      )


      /*
       * Tell parent about the real location.
       */

      emit(
        'location-selected',
        {
          latitude,
          longitude
        }
      )

    },


    error => {

      console.warn(
        'Unable to get browser location:',
        error
      )

    },


    {
      enableHighAccuracy: true,

      timeout: 15000,

      maximumAge: 0

    }

  )

}


/* =========================================================
   VALIDATE LOCATION
========================================================= */

const isValidLocation = location => {

  if (!location) {
    return false
  }


  const latitude =
    Number(
      location.latitude
    )


  const longitude =
    Number(
      location.longitude
    )


  return (

    Number.isFinite(latitude) &&

    Number.isFinite(longitude) &&

    latitude >= -90 &&

    latitude <= 90 &&

    longitude >= -180 &&

    longitude <= 180

  )

}


/* =========================================================
   UPDATE USER LOCATION
========================================================= */

const updateUserLocation = (
  latitude,
  longitude
) => {

  if (!map) {
    return
  }


  latitude =
    Number(latitude)

  longitude =
    Number(longitude)


  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {

    return

  }


  /*
   * Remove old user marker.
   */

  if (userLocationMarker) {

    map.removeLayer(
      userLocationMarker
    )

  }


  if (userLocationCircle) {

    map.removeLayer(
      userLocationCircle
    )

  }


  /*
   * Blue user location marker.
   */

  userLocationMarker =
    L.circleMarker(
      [
        latitude,
        longitude
      ],
      {

        radius: 9,

        fillColor: '#2563eb',

        color: '#ffffff',

        weight: 3,

        opacity: 1,

        fillOpacity: 1

      }
    ).addTo(map)


  userLocationMarker.bindPopup(`

    <div style="
      min-width:180px;
      text-align:center;
    ">

      <strong>
        📍 Your Current Location
      </strong>

      <br><br>

      <span style="
        color:#475569;
        font-size:12px;
      ">

        ${latitude.toFixed(6)},
        ${longitude.toFixed(6)}

      </span>

    </div>

  `)


  /*
   * Accuracy-style circle.
   *
   * This is visual only and doesn't claim
   * an exact accuracy value.
   */

  userLocationCircle =
    L.circle(
      [
        latitude,
        longitude
      ],
      {

        radius: 80,

        color: '#2563eb',

        weight: 1,

        fillColor: '#2563eb',

        fillOpacity: 0.08

      }
    ).addTo(map)


  /*
   * Move map to user's location.
   */

  map.flyTo(
    [
      latitude,
      longitude
    ],
    15,
    {
      duration: 1.2
    }
  )

}


/* =========================================================
   WATCH EMERGENCIES
========================================================= */

watch(

  () => props.emergencies,

  emergencies => {

    if (
      !map ||
      !emergencyLayer
    ) {

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


/* =========================================================
   WATCH FOCUS LOCATION
========================================================= */

watch(

  () => props.focusLocation,

  location => {

    if (
      !location ||
      !map
    ) {

      return

    }


    if (
      !isValidLocation(location)
    ) {

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


    /*
     * Update blue user/selected marker.
     */

    updateUserLocation(
      latitude,
      longitude
    )

  },

  {
    deep: true,

    immediate: true

  }

)


/* =========================================================
   MAP CLICK
========================================================= */

const handleMapClick = event => {

  if (!map) {
    return
  }


  const latitude =
    event.latlng.lat


  const longitude =
    event.latlng.lng


  /*
   * Show selected location.
   */

  setSelectedMarker(
    latitude,
    longitude
  )


  /*
   * Tell parent.
   */

  emit(
    'location-selected',
    {
      latitude,
      longitude
    }
  )

}


/* =========================================================
   SELECTED LOCATION MARKER
========================================================= */

const setSelectedMarker = (
  latitude,
  longitude
) => {

  if (!map) {
    return
  }


  if (selectedMarker) {

    map.removeLayer(
      selectedMarker
    )

  }


  selectedMarker =
    L.marker(
      [
        latitude,
        longitude
      ]
    ).addTo(map)


  selectedMarker
    .bindPopup(`

      <div style="
        min-width:180px;
      ">

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

}


/* =========================================================
   DISPLAY EMERGENCIES
========================================================= */

const displayEmergencies =
  emergencies => {

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
          Number(
            emergency.latitude
          )


        const longitude =
          Number(
            emergency.longitude
          )


        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {

          return

        }


        const status =
          normalizeStatus(
            emergency.status
          )


        const priority =
          emergency.priority ||
          emergency.severity ||
          'Low'


        const color =
          getPriorityColor(
            priority,
            status
          )


        const resolved =
          status === 'RESOLVED'


        const marker =
          L.circleMarker(
            [
              latitude,
              longitude
            ],
            {

              radius:
                resolved
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
                resolved
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


    emit(
      'emergencies-updated',
      emergencies
    )

  }


/* =========================================================
   CREATE POPUP
========================================================= */

const createPopup = (
  emergency,
  color
) => {

  const status =
    normalizeStatus(
      emergency.status
    )


  const priority =
    emergency.priority ||
    emergency.severity ||
    'Low'


  const emergencyId =
    emergency.firestoreId ||
    emergency._id ||
    emergency.id ||
    ''


  const volunteerName =
    emergency.assignedVolunteerName ||
    emergency.assignedVolunteer ||
    ''


  const latitude =
    Number(
      emergency.latitude
    )


  const longitude =
    Number(
      emergency.longitude
    )


  const contact =
    emergency.contact ||
    emergency.phone ||
    emergency.contactNumber ||
    ''


  const address =
    emergency.address ||
    emergency.locationAddress ||
    ''


  let statusContent = ''


  /* -------------------------------------------------------
     PENDING
  ------------------------------------------------------- */

  if (
    status === 'PENDING'
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


    if (
      props.volunteerId &&
      emergencyId
    ) {

      statusContent += `

        <button
          class="aidmap-accept-button"
          data-emergency-id="${escapeHtml(
            emergencyId
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


  /* -------------------------------------------------------
     ACCEPTED
  ------------------------------------------------------- */

  else if (
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

  }


  /* -------------------------------------------------------
     IN PROGRESS
  ------------------------------------------------------- */

  else if (
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

  }


  /* -------------------------------------------------------
     RESOLVED
  ------------------------------------------------------- */

  else if (
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

  }


  else {

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


  /* -------------------------------------------------------
     CONTACT
  ------------------------------------------------------- */

  const contactContent =
    contact
      ? `

        <div style="
          margin-top:7px;
          font-size:12px;
          color:#475569;
        ">

          📞
          ${escapeHtml(contact)}

        </div>

      `
      : ''


  /* -------------------------------------------------------
     ADDRESS
  ------------------------------------------------------- */

  const addressContent =
    address
      ? `

        <div style="
          margin-top:7px;
          font-size:12px;
          color:#475569;
          line-height:1.4;
        ">

          🏠
          ${escapeHtml(address)}

        </div>

      `
      : ''


  /* -------------------------------------------------------
     VOLUNTEER
  ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     DIRECTIONS
  ------------------------------------------------------- */

  const directions =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

      ? `

        <a
          href="https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}"
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


  return `

    <div style="
      min-width:230px;
      max-width:280px;
    ">


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


      <div style="
        margin-bottom:6px;
        font-size:12px;
        font-weight:600;
      ">

        Priority:

        <span style="
          color:${color};
          font-weight:800;
        ">

          ${escapeHtml(priority)}

        </span>

      </div>


      <div style="
        margin-bottom:8px;
        font-size:12px;
      ">

        Status:

        <strong>

          ${escapeHtml(status)}

        </strong>

      </div>


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


      ${addressContent}

      ${contactContent}


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


      ${volunteerContent}

      ${directions}

      ${statusContent}


    </div>

  `

}


/* =========================================================
   POPUP OPEN
========================================================= */

const handlePopupOpen = event => {

  const popupElement =
    event.popup.getElement()


  if (!popupElement) {
    return
  }


  popupElement.addEventListener(
    'click',
    handlePopupClick
  )

}


/* =========================================================
   POPUP CLICK
========================================================= */

const handlePopupClick = event => {

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


/* =========================================================
   STATUS
========================================================= */

const normalizeStatus = status => {

  return String(
    status || 'PENDING'
  )
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')

}


/* =========================================================
   PRIORITY COLOR
========================================================= */

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
    String(priority || '')
      .trim()
      .toLowerCase()
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
      return '#64748b'

  }

}


/* =========================================================
   ICONS
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

    'Food/Supplies': '📦',

    Food: '🍱',

    Supplies: '📦',

    Power: '⚡'

  }


  return (
    icons[type] ||
    '🚨'
  )

}


/* =========================================================
   COORDINATES
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
   ESCAPE HTML
========================================================= */

const escapeHtml = value => {

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
   CLEANUP
========================================================= */

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

  userLocationMarker = null

  userLocationCircle = null

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

  width:
    100%;

  height:
    100%;

  min-height:
    400px;

}


:deep(.leaflet-container) {

  width:
    100%;

  height:
    100%;

  min-height:
    400px;

  border-radius:
    12px;

}


:deep(.leaflet-popup-content) {

  margin:
    12px;

}


:deep(.leaflet-popup-content-wrapper) {

  border-radius:
    10px;

}


:deep(.aidmap-accept-button:hover) {

  filter:
    brightness(0.95);

}

</style>