<script setup>
import {
  computed,
  onMounted,
  ref
} from 'vue'

import { useRouter } from 'vue-router'

import {
  getEmergencies
} from '../services/api'

const router = useRouter()

const emergencies = ref([])

const volunteerId = ref('')

const available = ref(true)

onMounted(async () => {

  volunteerId.value =
    localStorage.getItem(
      'aidmap-volunteer-id'
    ) || 'VOL-DEMO'

  const savedProfile =
    localStorage.getItem(
      'aidmap-volunteer-profile'
    )

  if (savedProfile) {
    const profile =
      JSON.parse(savedProfile)

    available.value =
      profile.available
  }

  await loadEmergencies()
})

const loadEmergencies = async () => {
  try {
    const response =
      await getEmergencies()

    emergencies.value =
      response.emergencies || []

  } catch (error) {
    console.error(error)
  }
}

const pendingEmergencies =
  computed(() => {
    return emergencies.value.filter(
      emergency =>
        emergency.status === 'pending'
    )
  })

const criticalCount =
  computed(() => {
    return pendingEmergencies.value.filter(
      emergency =>
        emergency.priority === 'Critical'
    ).length
  })

const toggleAvailability = () => {

  available.value =
    !available.value

  const saved =
    localStorage.getItem(
      'aidmap-volunteer-profile'
    )

  const profile =
    saved
      ? JSON.parse(saved)
      : {}

  profile.available =
    available.value

  localStorage.setItem(
    'aidmap-volunteer-profile',
    JSON.stringify(profile)
  )
}
</script>

<template>
  <div class="dashboard">

    <header>

      <div class="brand">
        🚨
        <strong>AidMap</strong>
      </div>

      <div class="header-actions">

        <button
          @click="router.push('/crisis')"
        >
          🗺️ Crisis Map
        </button>

        <button
          @click="router.push('/profile')"
        >
          👤 Profile
        </button>

      </div>

    </header>

    <main>

      <div class="heading">

        <div>
          <p class="eyebrow">
            VOLUNTEER MODE
          </p>

          <h1>
            Help people near you
          </h1>

          <p>
            Emergency requests are updated
            automatically.
          </p>
        </div>

        <button
          class="availability"
          :class="{ active: available }"
          @click="toggleAvailability"
        >
          <span></span>

          {{
            available
              ? 'Available'
              : 'Unavailable'
          }}
        </button>

      </div>

      <div class="stats">

        <div>
          <strong>
            {{ pendingEmergencies.length }}
          </strong>
          <span>Open requests</span>
        </div>

        <div>
          <strong class="critical">
            {{ criticalCount }}
          </strong>
          <span>Critical</span>
        </div>

        <div>
          <strong>
            {{ volunteerId }}
          </strong>
          <span>Volunteer ID</span>
        </div>

      </div>

      <section>

        <div class="section-title">
          <h2>
            Nearby requests
          </h2>

          <button
            @click="loadEmergencies"
          >
            ↻ Refresh
          </button>
        </div>

        <div
          v-if="pendingEmergencies.length"
          class="requests"
        >

          <article
            v-for="emergency in pendingEmergencies"
            :key="emergency._id"
            @click="
              router.push(
                `/emergency/${emergency._id}`
              )
            "
          >

            <div class="request-icon">
              🚨
            </div>

            <div class="request-info">

              <div class="request-top">

                <h3>
                  {{ emergency.type }}
                </h3>

                <span
                  :class="
                    emergency.priority
                      .toLowerCase()
                  "
                >
                  {{ emergency.priority }}
                </span>

              </div>

              <p>
                {{ emergency.description }}
              </p>

              <small>
                📍
                {{
                  Number(
                    emergency.latitude
                  ).toFixed(4)
                }},
                {{
                  Number(
                    emergency.longitude
                  ).toFixed(4)
                }}
              </small>

            </div>

            <strong>
              →
            </strong>

          </article>

        </div>

        <div
          v-else
          class="empty"
        >
          <div>🎉</div>

          <h3>
            No open requests
          </h3>

          <p>
            We'll show new emergencies here.
          </p>
        </div>

      </section>

    </main>

  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f8fafc;
}

header {
  height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-actions button {
  border: 1px solid #e5e7eb;
  background: white;
  padding: 9px 13px;
  border-radius: 8px;
  cursor: pointer;
}

main {
  max-width: 1000px;
  margin: auto;
  padding: 35px 20px;
}

.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow {
  color: #16a34a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

h1 {
  margin: 5px 0;
}

.heading p {
  color: #6b7280;
}

.availability {
  border: 1px solid #d1d5db;
  background: white;
  padding: 11px 15px;
  border-radius: 9px;
  cursor: pointer;
}

.availability.active {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.availability span {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  margin-right: 6px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 30px 0;
}

.stats > div {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 20px;
  border-radius: 13px;
}

.stats strong {
  display: block;
  font-size: 25px;
  margin-bottom: 5px;
}

.stats span {
  color: #6b7280;
  font-size: 12px;
}

.critical {
  color: #dc2626;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title button {
  border: none;
  background: none;
  cursor: pointer;
}

.requests {
  display: grid;
  gap: 12px;
}

article {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 13px;
  padding: 17px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
}

article:hover {
  border-color: #dc2626;
  transform: translateY(-1px);
}

.request-icon {
  width: 45px;
  height: 45px;
  border-radius: 11px;
  background: #fee2e2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.request-info {
  flex: 1;
}

.request-top {
  display: flex;
  gap: 10px;
  align-items: center;
}

.request-top h3 {
  margin: 0;
}

.request-top span {
  padding: 3px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
}

.critical {
  background: #fee2e2;
  color: #dc2626;
}

.medium {
  background: #fef3c7;
  color: #b45309;
}

.low {
  background: #dcfce7;
  color: #15803d;
}

.request-info p {
  margin: 6px 0;
  color: #4b5563;
  font-size: 13px;
}

.request-info small {
  color: #9ca3af;
}

.empty {
  background: white;
  border-radius: 15px;
  padding: 50px;
  text-align: center;
}

.empty div {
  font-size: 40px;
}

.empty p {
  color: #6b7280;
}
</style>