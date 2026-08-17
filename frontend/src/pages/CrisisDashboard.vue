<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '../utils/auth'

import DisasterMap from '../components/DisasterMap.vue'
import CrisisBanner from '../components/CrisisBanner.vue'
import ReportEmergency from '../components/ReportEmergency.vue'

const router = useRouter()
const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch {
    alert('Unable to logout. Please try again.')
  }
}

const showReport = ref(false)
const focusLocation = ref(null)

const crisisName =
  'Chennai Emergency Response'

const crisisLocation =
  'Chennai & surrounding areas'

const handleLocationSelected = (location) => {
  focusLocation.value = location
}

const openReport = () => {
  showReport.value = true
}

const closeReport = () => {
  showReport.value = false
}
</script>

<template>
  <div class="crisis-page">

    <header>

      <div class="brand">
        🚨
        <div>
          <strong>AidMap</strong>
          <span>Crisis Response</span>
        </div>
      </div>

      <div class="actions">

        <button
          class="profile"
          @click="router.push('/profile')"
        >
          👤
        </button>

        <button
          class="volunteer"
          @click="router.push('/volunteer')"
        >
          🙋 Volunteer
        </button>
        <button
  class="logout"
  @click="handleLogout"
>
  🚪 Logout
</button>

      </div>

    </header>

    <main>

      <CrisisBanner
        :active="true"
        :crisis-name="crisisName"
        :location="crisisLocation"
      />

      <DisasterMap
        :focus-location="focusLocation"
        @location-selected="handleLocationSelected"
      />

      <div class="crisis-label">
        <span></span>
        Crisis Mode Active
      </div>

      <button
        class="report-button"
        @click="openReport"
      >
        🚨 Report Urgent Need
      </button>

    </main>

    <ReportEmergency
      v-if="showReport"
      @close="closeReport"
      :selected-location="focusLocation"
    />

  </div>
</template>

<style scoped>
.crisis-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 4px solid #dc2626;
}

header {
  height: 70px;
  flex-shrink: 0;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
  z-index: 1000;
}
.logout {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 14px;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 600;
}

.logout:hover {
  background: #fee2e2;
}
.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 25px;
}

.brand strong {
  display: block;
  font-size: 20px;
}

.brand span {
  display: block;
  font-size: 11px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 10px;
}

.profile,
.volunteer {
  border: 1px solid #e5e7eb;
  background: white;
  padding: 10px 14px;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 600;
}

main {
  flex: 1;
  position: relative;
}

.crisis-label {
  position: absolute;
  left: 20px;
  bottom: 20px;
  background: #7f1d1d;
  color: white;
  padding: 9px 13px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  z-index: 500;
}

.crisis-label span {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #facc15;
  border-radius: 50%;
  margin-right: 7px;
}

.report-button {
  position: absolute;
  right: 25px;
  top: 85px;
  z-index: 500;
  background: #dc2626;
  color: white;
  border: none;
  padding: 13px 18px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}
</style>