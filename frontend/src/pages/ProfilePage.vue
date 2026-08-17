<script setup>
import {
  computed,
  onMounted,
  ref
} from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const router = useRouter()

const email = ref('')
const name = ref('')
const role = ref('')
const profile = ref(null)
const loading = ref(true)

onMounted(() => {
  const user = auth.currentUser
  if (!user) {
    setTimeout(() => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push('/login')
      } else {
        loadUserProfile(currentUser)
      }
    }, 1000)
  } else {
    loadUserProfile(user)
  }
})

const loadUserProfile = async (user) => {
  email.value = user.email || ''
  name.value = user.displayName || ''
  
  try {
    const userRef = doc(db, 'users', user.uid)
    const snapshot = await getDoc(userRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      name.value = data.name || user.displayName || ''
      role.value = data.role || ''
      if (data.role === 'volunteer') {
        profile.value = {
          skills: data.skills || [],
          available: data.availability === 'available' || data.available === true,
          radius: data.radius || 10
        }
      }
    }
  } catch (error) {
    console.error('Failed to load user profile:', error)
  } finally {
    loading.value = false
  }
}

const skillNames = {
  medical: '🏥 Medical',
  transport: '🚗 Transport',
  supplies: '📦 Supplies',
  shelter: '🏠 Shelter'
}

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const home = computed(() => {
  return role.value === 'volunteer'
    ? '/volunteer'
    : '/crisis'
})

</script>

<template>

  <div class="profile-page">

    <header>

      <button
        @click="router.push(home)"
      >
        ← Back
      </button>

      <strong>
        AidMap
      </strong>

      <span></span>

    </header>

    <main>

      <div class="profile-card">

        <div class="avatar">
          👤
        </div>

        <h1>
          {{ name || 'My Profile' }}
        </h1>

        <p class="email">
          {{ email }}
        </p>

        <div class="role">
          {{
            role === 'volunteer'
              ? '🙋 Volunteer'
              : role === 'help_seeker'
              ? '🆘 Help Seeker'
              : '🆘 Requester'
          }}
        </div>

        <div
          v-if="
            role === 'volunteer' &&
            profile
          "
          class="volunteer-info"
        >

          <h3>
            Volunteer capabilities
          </h3>

          <div class="skills">

            <span
              v-for="skill in profile.skills"
              :key="skill"
            >
              {{ skillNames[skill] }}
            </span>

          </div>

          <div class="info-row">

            <span>
              Availability
            </span>

            <strong>
              {{
                profile.available
                  ? '🟢 Available'
                  : '⚪ Unavailable'
              }}
            </strong>

          </div>

          <div class="info-row">

            <span>
              Response radius
            </span>

            <strong>
              {{ profile.radius }} km
            </strong>

          </div>

        </div>

        <button
          class="logout"
          @click="handleLogout"
        >
          Sign out
        </button>

      </div>

    </main>

  </div>

</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
}

header {
  height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

header button {
  border: 1px solid #e5e7eb;
  background: white;
  padding: 9px 13px;
  border-radius: 8px;
  cursor: pointer;
}

main {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
}

.profile-card {
  background: white;
  border-radius: 18px;
  padding: 35px;
  text-align: center;
  box-shadow: 0 12px 35px rgba(0,0,0,.08);
}

.avatar {
  width: 75px;
  height: 75px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
  font-size: 35px;
}

h1 {
  margin: 15px 0 5px;
}

.email {
  color: #6b7280;
}

.role {
  display: inline-block;
  margin-top: 10px;
  padding: 7px 10px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
}

.volunteer-info {
  text-align: left;
  margin-top: 30px;
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.skills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.skills span {
  background: #f0fdf4;
  color: #15803d;
  padding: 7px 9px;
  border-radius: 7px;
  font-size: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 15px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row span {
  color: #6b7280;
}

.logout {
  width: 100%;
  margin-top: 30px;
  padding: 13px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #dc2626;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 700;
}
</style>