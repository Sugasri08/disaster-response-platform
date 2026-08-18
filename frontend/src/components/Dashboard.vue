<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import CrisisDashboard from '../pages/CrisisDashboard.vue'

const router = useRouter()
const auth = getAuth()

const user = computed(() => auth.currentUser)

const userName = computed(() => {
  if (user.value?.displayName) {
    return user.value.displayName
  }

  if (user.value?.email) {
    return user.value.email.split('@')[0]
  }

  return 'User'
})

const logout = async () => {
  try {
    await auth.signOut()
    await router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<template>
  <div class="dashboard-page">

    <!-- TOP NAVBAR -->
    <header class="topbar">

      <div class="brand">
        <div class="brand-icon">
          🚨
        </div>

        <div>
          <h2>AidMap</h2>

          <span>
            Disaster Response Platform
          </span>
        </div>
      </div>

      <div class="user-area">

        <div class="user-info">
          <strong>
            {{ userName }}
          </strong>

          <span>
            {{ user?.email || 'Guest' }}
          </span>
        </div>

        <button
          class="profile-button"
          type="button"
          @click="router.push('/profile')"
        >
          👤
        </button>

        <button
          class="logout-button"
          type="button"
          @click="logout"
        >
          Logout
        </button>

      </div>

    </header>

    <!-- MAIN DASHBOARD -->
    <main class="dashboard-content">
      <CrisisDashboard />
    </main>

  </div>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
  min-height: 100vh;
  background: #f8fafc;
}

/* =========================================================
   TOP BAR
========================================================= */

.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 20px;

  padding: 12px 22px;

  background: #ffffff;

  border-bottom: 1px solid #e2e8f0;

  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.04);
}

/* =========================================================
   BRAND
========================================================= */

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 38px;
  height: 38px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 10px;

  background: #eff6ff;

  font-size: 20px;
}

.brand h2 {
  margin: 0;

  color: #0f172a;

  font-size: 17px;
}

.brand span {
  display: block;

  margin-top: 2px;

  color: #64748b;

  font-size: 9px;
}

/* =========================================================
   USER AREA
========================================================= */

.user-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;

  text-align: right;
}

.user-info strong {
  color: #0f172a;

  font-size: 12px;
}

.user-info span {
  margin-top: 2px;

  color: #64748b;

  font-size: 9px;
}

/* =========================================================
   PROFILE
========================================================= */

.profile-button {
  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid #e2e8f0;

  border-radius: 50%;

  background: #f8fafc;

  cursor: pointer;

  font-size: 15px;
}

.profile-button:hover {
  background: #eff6ff;

  border-color: #93c5fd;
}

/* =========================================================
   LOGOUT
========================================================= */

.logout-button {
  border: none;

  padding: 8px 12px;

  border-radius: 7px;

  background: #fee2e2;

  color: #b91c1c;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;
}

.logout-button:hover {
  background: #fecaca;
}

/* =========================================================
   CONTENT
========================================================= */

.dashboard-content {
  width: 100%;
  min-height: calc(100vh - 63px);
}

/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 700px) {
  .topbar {
    padding: 10px 12px;
  }

  .user-info {
    display: none;
  }

  .brand span {
    display: none;
  }

  .logout-button {
    padding: 7px 9px;
  }
}
</style>