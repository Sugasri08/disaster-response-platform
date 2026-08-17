
<script setup>
import {
  onMounted,
  ref
} from 'vue'

import {
  useRoute,
  useRouter
} from 'vue-router'

import {
  getEmergencies,
  acceptEmergency,
  resolveEmergency
} from '../services/api'

const route = useRoute()
const router = useRouter()

const emergency = ref(null)
const loading = ref(true)
const accepting = ref(false)

const volunteerId =
  localStorage.getItem(
    'aidmap-volunteer-id'
  ) || 'VOL-DEMO'

onMounted(async () => {
  await loadEmergency()
})

const loadEmergency = async () => {

  try {

    const response =
      await getEmergencies()

    emergency.value =
      response.emergencies.find(
        item =>
          item._id === route.params.id
      )

  } catch (error) {

    console.error(error)

  } finally {

    loading.value = false

  }
}

const accept = async () => {

  if (!emergency.value) {
    return
  }

  accepting.value = true

  try {

    const response =
      await acceptEmergency(
        emergency.value._id,
        volunteerId
      )

    emergency.value =
      response.emergency

  } catch (error) {

    alert(
      error.response?.data?.message ||
      'Could not accept this emergency.'
    )

  } finally {

    accepting.value = false

  }
}

const resolve = async () => {

  try {

    const response =
      await resolveEmergency(
        emergency.value._id
      )

    emergency.value =
      response.emergency

  } catch (error) {

    alert(
      'Could not resolve emergency.'
    )

  }
}
</script>

<template>

  <div class="details-page">

    <header>

      <button
        @click="router.back()"
      >
        ← Back
      </button>

      <strong>
        AidMap
      </strong>

      <button
        @click="router.push('/profile')"
      >
        👤
      </button>

    </header>

    <main v-if="loading">
      Loading emergency...
    </main>

    <main
      v-else-if="!emergency"
      class="not-found"
    >
      <h2>
        Emergency not found
      </h2>

      <button
        @click="router.push('/crisis')"
      >
        Return to map
      </button>
    </main>

    <main v-else>

      <div class="emergency-card">

        <div class="icon">
          🚨
        </div>

        <span
          class="priority"
          :class="
            emergency.priority.toLowerCase()
          "
        >
          {{ emergency.priority }}
        </span>

        <h1>
          {{ emergency.type }}
        </h1>

        <p class="description">
          {{ emergency.description }}
        </p>

        <div class="info">

          <div>
            <span>📍 Location</span>

            <strong>
              {{
                Number(
                  emergency.latitude
                ).toFixed(5)
              }},
              {{
                Number(
                  emergency.longitude
                ).toFixed(5)
              }}
            </strong>
          </div>

          <div>
            <span>📊 Status</span>

            <strong>
              {{ emergency.status }}
            </strong>
          </div>

        </div>

        <div
          v-if="
            emergency.status === 'pending'
          "
          class="waiting"
        >
          ⏳ Waiting for a volunteer
        </div>

        <div
          v-if="
            emergency.status === 'accepted'
          "
          class="accepted"
        >
          🙋 Help is on the way

          <small>
            Volunteer:
            {{ emergency.assignedVolunteer }}
          </small>
        </div>

        <div
          v-if="
            emergency.status === 'resolved'
          "
          class="resolved"
        >
          ✅ Emergency resolved
        </div>

        <button
          v-if="
            emergency.status === 'pending'
          "
          class="help-button"
          :disabled="accepting"
          @click="accept"
        >
          {{
            accepting
              ? 'Accepting...'
              : '🙋 I CAN HELP'
          }}
        </button>

        <button
          v-if="
            emergency.status === 'accepted' &&
            emergency.assignedVolunteer ===
              volunteerId
          "
          class="resolve-button"
          @click="resolve"
        >
          ✅ Mark Resolved
        </button>

      </div>

    </main>

  </div>

</template>

<style scoped>
.details-page {
  min-height: 100vh;
  background: #f8fafc;
}

header {
  height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
}

header button {
  border: 1px solid #e5e7eb;
  background: white;
  padding: 9px 13px;
  border-radius: 8px;
  cursor: pointer;
}

main {
  max-width: 650px;
  margin: 50px auto;
  padding: 20px;
}

.emergency-card {
  background: white;
  border-radius: 18px;
  padding: 30px;
  box-shadow: 0 12px 35px rgba(0,0,0,.08);
}

.icon {
  font-size: 40px;
}

.priority {
  display: inline-block;
  margin-top: 12px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
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

h1 {
  margin: 12px 0;
}

.description {
  color: #4b5563;
  line-height: 1.6;
}

.info {
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  padding: 18px 0;
  margin: 20px 0;
  display: grid;
  gap: 15px;
}

.info span,
.info strong {
  display: block;
}

.info span {
  color: #9ca3af;
  font-size: 12px;
  margin-bottom: 4px;
}

.waiting,
.accepted,
.resolved {
  padding: 13px;
  border-radius: 9px;
  text-align: center;
  font-weight: 650;
}

.waiting {
  background: #fef3c7;
  color: #b45309;
}

.accepted {
  background: #dbeafe;
  color: #2563eb;
}

.accepted small {
  display: block;
  margin-top: 5px;
}

.resolved {
  background: #dcfce7;
  color: #15803d;
}

.help-button,
.resolve-button {
  width: 100%;
  margin-top: 20px;
  padding: 15px;
  border: none;
  border-radius: 9px;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.help-button {
  background: #16a34a;
}

.resolve-button {
  background: #2563eb;
}
</style>