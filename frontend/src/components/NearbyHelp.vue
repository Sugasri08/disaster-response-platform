<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  location: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['location-selected'])

const activeTab = ref('all')
const loading = ref(false)

const services = ref([
  {
    id: 1,
    type: 'hospital',
    name: 'Nearby Hospital',
    icon: '🏥',
    description: 'Emergency medical assistance',
    distance: 'Nearby',
    phone: '108',
    address: 'Emergency Medical Services'
  },
  {
    id: 2,
    type: 'police',
    name: 'Police Station',
    icon: '👮',
    description: 'Police and emergency assistance',
    distance: 'Nearby',
    phone: '100',
    address: 'Local Police Station'
  },
  {
    id: 3,
    type: 'volunteer',
    name: 'Volunteer Organizations',
    icon: '🤝',
    description: 'Community volunteers available to help',
    distance: 'Nearby',
    phone: '—',
    address: 'Registered volunteer organizations'
  }
])

const filteredServices = () => {
  if (activeTab.value === 'all') {
    return services.value
  }

  return services.value.filter(
    service => service.type === activeTab.value
  )
}

const useCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('Location is not supported by your browser.')
    return
  }

  loading.value = true

  navigator.geolocation.getCurrentPosition(
    position => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }

      emit('location-selected', location)

      loading.value = false
    },
    error => {
      console.error(error)

      alert(
        'Unable to get your location. Please allow location access.'
      )

      loading.value = false
    }
  )
}

const openMaps = service => {
  if (!props.location) {
    useCurrentLocation()
    return
  }

  const lat = Number(props.location.latitude)
  const lng = Number(props.location.longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return
  }

  const query = encodeURIComponent(
    `${service.name} near ${lat},${lng}`
  )

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    '_blank'
  )
}

const callService = service => {
  if (!service.phone || service.phone === '—') {
    return
  }

  window.location.href = `tel:${service.phone}`
}

watch(
  () => props.location,
  location => {
    if (location) {
      console.log(
        '📍 Nearby services location:',
        location
      )
    }
  },
  {
    deep: true
  }
)
</script>

<template>

  <section class="nearby-section">

    <!-- HEADER -->

    <div class="nearby-header">

      <div>
        <h2>📍 Nearby Emergency Help</h2>

        <p>
          Find hospitals, police stations and volunteer organizations
          near the selected location.
        </p>
      </div>

      <button
        class="location-button"
        @click="useCurrentLocation"
        :disabled="loading"
      >
        {{ loading ? '📡 Finding...' : '📍 Use My Location' }}
      </button>

    </div>


    <!-- LOCATION -->

    <div
      v-if="location"
      class="location-box"
    >

      <span>📌 Selected location</span>

      <strong>
        {{ Number(location.latitude).toFixed(5) }},
        {{ Number(location.longitude).toFixed(5) }}
      </strong>

    </div>


    <!-- FILTERS -->

    <div class="service-tabs">

      <button
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        🌐 All
      </button>

      <button
        :class="{ active: activeTab === 'hospital' }"
        @click="activeTab = 'hospital'"
      >
        🏥 Hospitals
      </button>

      <button
        :class="{ active: activeTab === 'police' }"
        @click="activeTab = 'police'"
      >
        👮 Police
      </button>

      <button
        :class="{ active: activeTab === 'volunteer' }"
        @click="activeTab = 'volunteer'"
      >
        🤝 Volunteers
      </button>

    </div>


    <!-- SERVICES -->

    <div class="services-grid">

      <article
        v-for="service in filteredServices()"
        :key="service.id"
        class="service-card"
      >

        <div class="service-icon">
          {{ service.icon }}
        </div>

        <div class="service-content">

          <div class="service-title">

            <h3>
              {{ service.name }}
            </h3>

            <span>
              {{ service.distance }}
            </span>

          </div>

          <p>
            {{ service.description }}
          </p>

          <div class="service-address">
            📍 {{ service.address }}
          </div>

          <div class="service-actions">

            <button
              class="map-button"
              @click="openMaps(service)"
            >
              🗺️ Open Map
            </button>

            <button
              v-if="service.phone !== '—'"
              class="call-button"
              @click="callService(service)"
            >
              📞 {{ service.phone }}
            </button>

          </div>

        </div>

      </article>

    </div>

  </section>

</template>

<style scoped>

.nearby-section {
  margin-top: 20px;
  padding: 20px;

  background: white;

  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.nearby-header {
  display: flex;

  justify-content: space-between;
  align-items: center;

  gap: 20px;

  margin-bottom: 15px;
}

.nearby-header h2 {
  margin: 0;

  color: #0f172a;

  font-size: 18px;
}

.nearby-header p {
  margin: 5px 0 0;

  color: #64748b;

  font-size: 12px;
}

.location-button {
  border: none;

  padding: 9px 13px;

  border-radius: 8px;

  background: #2563eb;

  color: white;

  font-size: 11px;

  font-weight: 700;

  cursor: pointer;
}

.location-button:hover {
  background: #1d4ed8;
}

.location-button:disabled {
  opacity: 0.6;

  cursor: not-allowed;
}

.location-box {
  display: flex;

  justify-content: space-between;

  gap: 10px;

  margin-bottom: 15px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #eff6ff;

  color: #1d4ed8;

  font-size: 11px;
}

.location-box strong {
  font-weight: 700;
}

.service-tabs {
  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  margin-bottom: 15px;
}

.service-tabs button {
  border: 1px solid #e2e8f0;

  background: #f8fafc;

  color: #475569;

  padding: 7px 11px;

  border-radius: 7px;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;
}

.service-tabs button.active {
  background: #eff6ff;

  border-color: #2563eb;

  color: #1d4ed8;
}

.services-grid {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 12px;
}

.service-card {
  display: flex;

  gap: 12px;

  padding: 14px;

  border: 1px solid #e2e8f0;

  border-radius: 10px;

  transition: 0.2s;
}

.service-card:hover {
  border-color: #93c5fd;

  transform: translateY(-2px);
}

.service-icon {
  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  flex-shrink: 0;

  border-radius: 10px;

  background: #f1f5f9;

  font-size: 21px;
}

.service-content {
  flex: 1;

  min-width: 0;
}

.service-title {
  display: flex;

  justify-content: space-between;

  gap: 8px;
}

.service-title h3 {
  margin: 0;

  color: #0f172a;

  font-size: 13px;
}

.service-title span {
  color: #16a34a;

  font-size: 10px;

  font-weight: 700;
}

.service-content p {
  margin: 5px 0;

  color: #64748b;

  font-size: 10px;
}

.service-address {
  margin-top: 6px;

  color: #64748b;

  font-size: 10px;
}

.service-actions {
  display: flex;

  gap: 6px;

  margin-top: 10px;
}

.service-actions button {
  flex: 1;

  padding: 7px;

  border-radius: 6px;

  cursor: pointer;

  font-size: 10px;

  font-weight: 700;
}

.map-button {
  border: 1px solid #bfdbfe;

  background: #eff6ff;

  color: #2563eb;
}

.call-button {
  border: 1px solid #bbf7d0;

  background: #f0fdf4;

  color: #16a34a;
}

@media (max-width: 900px) {

  .services-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 600px) {

  .nearby-header {
    align-items: flex-start;

    flex-direction: column;
  }

  .location-box {
    flex-direction: column;
  }

}

</style>