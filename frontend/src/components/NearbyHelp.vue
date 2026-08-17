<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const props = defineProps({
  location: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['location-selected'])

/* =========================
   STATE
========================= */

const latitude = ref(12.8260)
const longitude = ref(80.2333)

const activeTab = ref('hospital')

const hospitals = ref([])
const policeStations = ref([])
const organizations = ref([])

const loading = ref(false)
const error = ref('')

const radius = ref(5000)

/* =========================
   CURRENT LOCATION
========================= */

const currentLocation = computed(() => ({
  latitude: latitude.value,
  longitude: longitude.value
}))

/* =========================
   DISTANCE CALCULATION
========================= */

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`
  }

  return `${distance.toFixed(1)} km`
}

/* =========================
   ADDRESS
========================= */

const getAddress = (tags) => {
  if (!tags) return 'Address unavailable'

  const parts = []

  if (tags['addr:housenumber']) {
    parts.push(tags['addr:housenumber'])
  }

  if (tags['addr:street']) {
    parts.push(tags['addr:street'])
  }

  if (tags['addr:suburb']) {
    parts.push(tags['addr:suburb'])
  }

  if (tags['addr:city']) {
    parts.push(tags['addr:city'])
  }

  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode'])
  }

  return parts.length
    ? parts.join(', ')
    : 'Address unavailable'
}

/* =========================
   PHONE
========================= */

const getPhone = (tags) => {
  if (!tags) return ''

  return (
    tags.phone ||
    tags['contact:phone'] ||
    tags['contact:mobile'] ||
    ''
  )
}

/* =========================
   GOOGLE MAPS DIRECTIONS
========================= */

const createMapsUrl = (lat, lon) => {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}

/* =========================
   LOAD HOSPITALS + POLICE
   USING OPENSTREETMAP
========================= */

const loadNearbyPlaces = async () => {
  try {
    const query = `
      [out:json][timeout:25];

      (
        nwr[
          "amenity"="hospital"
        ](
          around:${radius.value},
          ${latitude.value},
          ${longitude.value}
        );

        nwr[
          "amenity"="police"
        ](
          around:${radius.value},
          ${latitude.value},
          ${longitude.value}
        );
      );

      out center tags;
    `

    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    )

    if (!response.ok) {
      throw new Error('Nearby places service unavailable')
    }

    const data = await response.json()

    const hospitalList = []
    const policeList = []

    data.elements.forEach((place) => {
      const lat = place.lat ?? place.center?.lat
      const lon = place.lon ?? place.center?.lon

      if (lat == null || lon == null) {
        return
      }

      const tags = place.tags || {}

      const name = tags.name || 'Unnamed place'

      const distance = calculateDistance(
        latitude.value,
        longitude.value,
        lat,
        lon
      )

      const item = {
        id: `${place.type}-${place.id}`,
        name,
        latitude: lat,
        longitude: lon,
        distance,
        address: getAddress(tags),
        phone: getPhone(tags),
        mapsUrl: createMapsUrl(lat, lon)
      }

      if (tags.amenity === 'hospital') {
        hospitalList.push(item)
      }

      if (tags.amenity === 'police') {
        policeList.push(item)
      }
    })

    hospitals.value = hospitalList.sort(
      (a, b) => a.distance - b.distance
    )

    policeStations.value = policeList.sort(
      (a, b) => a.distance - b.distance
    )
  } catch (err) {
    console.error('Nearby places error:', err)

    error.value =
      'Unable to load nearby hospitals and police stations.'
  }
}

/* =========================
   LOAD REGISTERED ORGANIZATIONS
========================= */

const loadOrganizations = async () => {
  try {
    const snapshot = await getDocs(
      collection(db, 'organizations')
    )

    const list = []

    snapshot.forEach((docSnap) => {
      const data = docSnap.data()

      const lat = Number(data.latitude)
      const lon = Number(data.longitude)

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {
        return
      }

      const distance = calculateDistance(
        latitude.value,
        longitude.value,
        lat,
        lon
      )

      /* Only organizations within radius */

      if (distance > radius.value / 1000) {
        return
      }

      /* Only verified organizations */

      const verified =
        data.verified === true ||
        data.isVerified === true ||
        data.status === 'verified' ||
        data.status === 'approved'

      /*
       * If your database does not yet have
       * verification fields, organizations
       * will still appear.
       */

      const hasVerificationField =
        'verified' in data ||
        'isVerified' in data ||
        'status' in data

      if (hasVerificationField && !verified) {
        return
      }

      const skills = Array.isArray(data.skills)
        ? data.skills
        : Array.isArray(data.services)
          ? data.services
          : []

      list.push({
        id: docSnap.id,

        name:
          data.name ||
          data.organizationName ||
          'Volunteer Organization',

        description:
          data.description ||
          data.servicesDescription ||
          'Community support organization',

        contact:
          data.phone ||
          data.contact ||
          data.email ||
          '',

        phone:
          data.phone ||
          data.contactPhone ||
          '',

        email:
          data.email ||
          '',

        address:
          data.address ||
          'Address unavailable',

        latitude: lat,
        longitude: lon,

        distance,

        skills,

        verified,

        available:
          data.available !== false &&
          data.availability !== 'unavailable',

        members:
          Number(data.members || data.volunteers || 0)
      })
    })

    organizations.value = list.sort(
      (a, b) => a.distance - b.distance
    )
  } catch (err) {
    console.error(
      'Organization loading error:',
      err
    )

    /*
     * Don't overwrite the hospital/police
     * error message if only organizations fail.
     */

    if (!hospitals.value.length && !policeStations.value.length) {
      error.value =
        'Unable to load nearby help organizations.'
    }
  }
}

/* =========================
   REFRESH EVERYTHING
========================= */

const refresh = async () => {
  loading.value = true
  error.value = ''

  try {
    await Promise.all([
      loadNearbyPlaces(),
      loadOrganizations()
    ])
  } catch (err) {
    console.error('Refresh error:', err)

    error.value =
      'Unable to refresh nearby help.'
  } finally {
    loading.value = false
  }
}

/* =========================
   USE CURRENT LOCATION
========================= */

const useMyLocation = () => {
  if (!navigator.geolocation) {
    error.value =
      'Geolocation is not supported by this browser.'

    return
  }

  loading.value = true
  error.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitude.value =
        position.coords.latitude

      longitude.value =
        position.coords.longitude

      emit(
        'location-selected',
        currentLocation.value
      )

      refresh()
    },

    (err) => {
      console.error(
        'Geolocation error:',
        err
      )

      loading.value = false

      error.value =
        'Unable to access your current location. Please allow location permission.'
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  )
}

/* =========================
   CHANGE RADIUS
========================= */

const changeRadius = async () => {
  await refresh()
}

/* =========================
   ACTIVE TAB DATA
========================= */

const nearbyItems = computed(() => {
  if (activeTab.value === 'hospital') {
    return hospitals.value
  }

  if (activeTab.value === 'police') {
    return policeStations.value
  }

  return organizations.value
})

/* =========================
   LOCATION PROP WATCHER
========================= */

watch(
  () => props.location,

  (location) => {
    if (!location) {
      return
    }

    const lat = Number(location.latitude)
    const lon = Number(location.longitude)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return
    }

    /*
     * Avoid unnecessary refreshes
     * if location hasn't actually changed.
     */

    const changed =
      Math.abs(latitude.value - lat) > 0.00001 ||
      Math.abs(longitude.value - lon) > 0.00001

    if (!changed) {
      return
    }

    latitude.value = lat
    longitude.value = lon

    refresh()
  },

  {
    deep: true
  }
)

/* =========================
   INITIAL LOAD
========================= */

onMounted(() => {
  refresh()
})
</script>

<template>
  <section class="nearby-help">

    <!-- HEADER -->

    <div class="nearby-header">

      <div>
        <h2>📍 Nearby Help</h2>

        <p>
          Find hospitals, police stations and
          registered volunteer organizations.
        </p>

        <div class="coordinates">
          {{ latitude.toFixed(5) }},
          {{ longitude.toFixed(5) }}
        </div>
      </div>

      <div class="header-actions">

        <button
          class="location-button"
          @click="useMyLocation"
          :disabled="loading"
        >
          📍 Use My Location
        </button>

        <button
          class="refresh-button"
          @click="refresh"
          :disabled="loading"
        >
          🔄 Refresh
        </button>

      </div>
    </div>

    <!-- RADIUS -->

    <div class="radius-section">

      <div class="radius-label">
        <span>📏 Search radius</span>

        <strong>
          {{ radius / 1000 }} km
        </strong>
      </div>

      <input
        v-model="radius"
        type="range"
        min="1000"
        max="20000"
        step="1000"
        @change="changeRadius"
      />

      <div class="radius-values">
        <span>1 km</span>
        <span>5 km</span>
        <span>10 km</span>
        <span>20 km</span>
      </div>

    </div>

    <!-- TABS -->

    <div class="tabs">

      <button
        :class="{
          active: activeTab === 'hospital'
        }"
        @click="activeTab = 'hospital'"
      >
        🏥 Hospitals

        <span>
          {{ hospitals.length }}
        </span>
      </button>

      <button
        :class="{
          active: activeTab === 'police'
        }"
        @click="activeTab = 'police'"
      >
        🚔 Police

        <span>
          {{ policeStations.length }}
        </span>
      </button>

      <button
        :class="{
          active: activeTab === 'organization'
        }"
        @click="activeTab = 'organization'"
      >
        🤝 Volunteers

        <span>
          {{ organizations.length }}
        </span>
      </button>

    </div>

    <!-- LOADING -->

    <div
      v-if="loading"
      class="message loading-message"
    >
      <div class="spinner"></div>

      <strong>
        Finding nearby help...
      </strong>

      <span>
        Searching within {{ radius / 1000 }} km
      </span>
    </div>

    <!-- ERROR -->

    <div
      v-else-if="error"
      class="error"
    >
      <div class="error-icon">
        ⚠️
      </div>

      <div>
        <strong>
          Something went wrong
        </strong>

        <p>
          {{ error }}
        </p>

        <button @click="refresh">
          Try Again
        </button>
      </div>
    </div>

    <!-- EMPTY -->

    <div
      v-else-if="nearbyItems.length === 0"
      class="message"
    >
      <div class="empty-icon">
        {{
          activeTab === 'hospital'
            ? '🏥'
            : activeTab === 'police'
              ? '🚔'
              : '🤝'
        }}
      </div>

      <strong>
        No nearby
        {{
          activeTab === 'hospital'
            ? 'hospitals'
            : activeTab === 'police'
              ? 'police stations'
              : 'registered volunteer organizations'
        }}
      </strong>

      <span>
        Nothing found within
        {{ radius / 1000 }} km.
      </span>
    </div>

    <!-- PLACE LIST -->

    <div
      v-else
      class="place-list"
    >

      <article
        v-for="item in nearbyItems"
        :key="item.id"
        class="place-card"
      >

        <!-- ICON -->

        <div class="place-icon">

          {{
            activeTab === 'hospital'
              ? '🏥'
              : activeTab === 'police'
                ? '🚔'
                : '🤝'
          }}

        </div>

        <!-- CONTENT -->

        <div class="place-content">

          <!-- TITLE -->

          <div class="place-title">

            <div class="title-left">

              <h3>
                {{ item.name }}
              </h3>

              <span
                v-if="
                  activeTab === 'organization' &&
                  item.verified
                "
                class="verified"
              >
                ✓ Verified
              </span>

              <span
                v-if="
                  activeTab === 'organization' &&
                  item.available
                "
                class="available"
              >
                ● Available
              </span>

            </div>

            <span class="distance">
              {{ formatDistance(item.distance) }}
            </span>

          </div>

          <!-- ORGANIZATION DESCRIPTION -->

          <p
            v-if="
              activeTab === 'organization' &&
              item.description
            "
            class="description"
          >
            {{ item.description }}
          </p>

          <!-- ADDRESS -->

          <p class="address">
            📍 {{ item.address }}
          </p>

          <!-- PHONE -->

          <p
            v-if="item.phone"
            class="phone"
          >
            📞 {{ item.phone }}
          </p>

          <!-- EMAIL -->

          <p
            v-if="
              activeTab === 'organization' &&
              item.email
            "
            class="email"
          >
            ✉️ {{ item.email }}
          </p>

          <!-- SKILLS -->

          <div
            v-if="
              activeTab === 'organization' &&
              item.skills.length
            "
            class="skills"
          >

            <span
              v-for="skill in item.skills"
              :key="skill"
              class="skill"
            >
              {{ skill }}
            </span>

          </div>

          <!-- ACTIONS -->

          <div class="place-actions">

            <a
              v-if="item.phone"
              :href="`tel:${item.phone}`"
              class="call-button"
            >
              📞 Call
            </a>

            <a
              v-if="
                activeTab === 'organization' &&
                item.email
              "
              :href="`mailto:${item.email}`"
              class="email-button"
            >
              ✉️ Email
            </a>

            <a
              :href="item.mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="maps-button"
            >
              🗺️ Directions
            </a>

          </div>

        </div>

      </article>

    </div>

  </section>
</template>

<style scoped>

.nearby-help {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px;
  margin: 18px;
}

/* HEADER */

.nearby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.nearby-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.nearby-header p {
  margin: 5px 0;
  color: #64748b;
  font-size: 12px;
}

.coordinates {
  margin-top: 6px;
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

/* HEADER BUTTONS */

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button {
  border: 1px solid #cbd5e1;
  background: white;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: 0.2s;
}

.header-actions button:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.header-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* RADIUS */

.radius-section {
  padding: 12px;
  margin-bottom: 15px;
  background: #f8fafc;
  border-radius: 10px;
}

.radius-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  font-size: 11px;
  color: #475569;
}

.radius-label strong {
  color: #2563eb;
}

.radius-section input {
  width: 100%;
  cursor: pointer;
}

.radius-values {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: #94a3b8;
  font-size: 9px;
}

/* TABS */

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 15px;
}

.tabs button {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  color: #475569;
  transition: 0.2s;
}

.tabs button:hover {
  background: #f1f5f9;
}

.tabs button.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
}

.tabs span {
  margin-left: 5px;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
}

/* PLACE LIST */

.place-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 3px;
}

/* CARD */

.place-card {
  display: flex;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  transition: 0.2s;
}

.place-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

/* ICON */

.place-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

/* CONTENT */

.place-content {
  flex: 1;
  min-width: 0;
}

/* TITLE */

.place-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.title-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.place-title h3 {
  margin: 0;
  font-size: 13px;
  color: #0f172a;
}

.distance {
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

/* STATUS */

.verified {
  background: #dcfce7;
  color: #15803d;
  padding: 2px 5px;
  border-radius: 5px;
  font-size: 8px;
  font-weight: 700;
}

.available {
  background: #ecfdf5;
  color: #059669;
  padding: 2px 5px;
  border-radius: 5px;
  font-size: 8px;
  font-weight: 700;
}

/* TEXT */

.place-content p {
  margin: 5px 0;
  font-size: 11px;
  color: #64748b;
}

.description {
  line-height: 1.4;
}

.address {
  line-height: 1.4;
}

.phone {
  color: #334155 !important;
}

.email {
  color: #475569 !important;
}

/* SKILLS */

.skills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.skill {
  padding: 3px 6px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #475569;
  font-size: 9px;
  font-weight: 700;
}

/* ACTIONS */

.place-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.place-actions a {
  text-decoration: none;
  padding: 6px 9px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  transition: 0.2s;
}

.place-actions a:hover {
  transform: translateY(-1px);
}

.call-button {
  background: #dcfce7;
  color: #15803d;
}

.email-button {
  background: #fef3c7;
  color: #b45309;
}

.maps-button {
  background: #eff6ff;
  color: #1d4ed8;
}

/* LOADING */

.message {
  padding: 30px 20px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.loading-message strong {
  color: #334155;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* EMPTY */

.empty-icon {
  font-size: 30px;
  margin-bottom: 3px;
}

.message strong {
  color: #334155;
}

/* ERROR */

.error {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 15px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 12px;
}

.error-icon {
  font-size: 22px;
}

.error strong {
  display: block;
  margin-bottom: 3px;
}

.error p {
  margin: 0 0 8px;
  font-size: 11px;
}

.error button {
  border: none;
  background: #dc2626;
  color: white;
  padding: 6px 9px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

/* MOBILE */

@media (max-width: 700px) {

  .nearby-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }

  .tabs {
    grid-template-columns: 1fr;
  }

  .place-title {
    flex-direction: column;
    gap: 4px;
  }

  .distance {
    align-self: flex-start;
  }
}

</style>