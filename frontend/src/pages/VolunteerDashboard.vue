<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

import { auth, db } from '../firebase/firebase'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)

const name = ref('')
const email = ref('')

const skills = ref([])

const availability = ref('available')

const message = ref('')
const errorMessage = ref('')

const skillOptions = [
  {
    id: 'medical',
    label: 'Medical',
    icon: '🩺'
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: '🚗'
  },
  {
    id: 'supplies',
    label: 'Supplies',
    icon: '📦'
  },
  {
    id: 'shelter',
    label: 'Shelter',
    icon: '🏠'
  }
]

const loadProfile = async () => {
  let user = auth.currentUser
  if (!user) {
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        user = u
        unsubscribe()
        resolve()
      })
      setTimeout(resolve, 1000)
    })
  }

  if (!user) {
    router.push('/login')
    return
  }

  email.value = user.email || ''
  name.value = user.displayName || ''

  try {
    const userRef = doc(db, 'users', user.uid)

    const snapshot = await getDoc(userRef)

    if (snapshot.exists()) {
      const data = snapshot.data()

      name.value = data.name || user.displayName || ''
      skills.value = data.skills || []
      availability.value = data.availability || 'available'
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Unable to load your profile.'
  } finally {
    loading.value = false
  }
}

const toggleSkill = (skill) => {
  if (skills.value.includes(skill)) {
    skills.value = skills.value.filter(
      item => item !== skill
    )
  } else {
    skills.value.push(skill)
  }
}

const saveProfile = async () => {
  const user = auth.currentUser

  if (!user) {
    router.push('/login')
    return
  }

  if (!name.value.trim()) {
    errorMessage.value = 'Please enter your name.'
    return
  }

  if (skills.value.length === 0) {
    errorMessage.value = 'Please select at least one skill.'
    return
  }

  saving.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        name: name.value.trim(),
        email: user.email,
        role: 'volunteer',
        skills: skills.value,
        availability: availability.value,
        updatedAt: new Date()
      },
      {
        merge: true
      }
    )

    message.value = 'Profile saved successfully!'

    setTimeout(() => {
      router.push('/volunteer')
    }, 1200)

  } catch (error) {
    console.error(error)
    errorMessage.value = 'Unable to save your profile.'
  } finally {
    saving.value = false
  }
}

const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>

  <div class="page">

    <!-- HEADER -->

    <header>

      <div class="brand">

        <div class="logo">
          🚨
        </div>

        <div>
          <strong>AidMap</strong>
          <span>Volunteer Network</span>
        </div>

      </div>

      <div class="header-actions">

        <button
          class="profile-button"
          @click="router.push('/profile')"
        >
          👤 Profile
        </button>

        <button
          class="logout-button"
          @click="logout"
        >
          🚪 Logout
        </button>

      </div>

    </header>


    <!-- CONTENT -->

    <main v-if="!loading">

      <section class="welcome">

        <div>

          <p class="eyebrow">
            VOLUNTEER PROFILE
          </p>

          <h1>
            Welcome, {{ name || 'Volunteer' }} 👋
          </h1>

          <p>
            Your skills and availability help AidMap
            match you with people who need assistance.
          </p>

        </div>

        <div class="status-card">

          <span
            class="status-dot"
            :class="availability"
          ></span>

          <div>

            <strong>
              {{ availability === 'available'
                ? 'Available'
                : 'Unavailable'
              }}
            </strong>

            <small>
              Volunteer status
            </small>

          </div>

        </div>

      </section>


      <!-- PROFILE CARD -->

      <section class="card">

        <h2>Volunteer Information</h2>

        <p class="description">
          Keep your information updated so emergency
          requests can be matched with the right people.
        </p>


        <!-- NAME -->

        <label>
          Full Name
        </label>

        <input
          v-model="name"
          type="text"
          placeholder="Enter your full name"
        />


        <!-- EMAIL -->

        <label>
          Email
        </label>

        <input
          :value="email"
          type="email"
          disabled
        />


        <!-- SKILLS -->

        <label>
          Your Skills
        </label>

        <p class="hint">
          Select everything you can help with.
        </p>

        <div class="skills">

          <button
            v-for="skill in skillOptions"
            :key="skill.id"
            class="skill"
            :class="{
              selected: skills.includes(skill.id)
            }"
            @click="toggleSkill(skill.id)"
          >

            <span class="skill-icon">
              {{ skill.icon }}
            </span>

            <span>
              {{ skill.label }}
            </span>

            <span
              v-if="skills.includes(skill.id)"
              class="check"
            >
              ✓
            </span>

          </button>

        </div>


        <!-- AVAILABILITY -->

        <label>
          Availability
        </label>

        <div class="availability">

          <button
            :class="{
              active: availability === 'available'
            }"
            @click="availability = 'available'"
          >
            🟢 Available
          </button>

          <button
            :class="{
              active: availability === 'unavailable'
            }"
            @click="availability = 'unavailable'"
          >
            ⚪ Not Available
          </button>

        </div>


        <!-- MESSAGE -->

        <div
          v-if="message"
          class="success"
        >
          ✓ {{ message }}
        </div>

        <div
          v-if="errorMessage"
          class="error"
        >
          {{ errorMessage }}
        </div>


        <!-- SAVE -->

        <button
          class="save-button"
          @click="saveProfile"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save Volunteer Profile' }}
        </button>

      </section>

    </main>


    <!-- LOADING -->

    <div
      v-else
      class="loading"
    >
      Loading your volunteer profile...
    </div>

  </div>

</template>


<style scoped>

.page {
  min-height: 100vh;
  background: #f8fafc;
}

header {
  height: 70px;

  padding: 0 30px;

  background: white;

  border-bottom: 1px solid #e5e7eb;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 30px;
}

.brand strong {
  display: block;
  font-size: 18px;
}

.brand span {
  display: block;
  font-size: 11px;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.profile-button,
.logout-button {
  padding: 9px 14px;

  border-radius: 8px;

  cursor: pointer;

  font-weight: 600;
}

.profile-button {
  border: 1px solid #e5e7eb;
  background: white;
}

.logout-button {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

main {
  width: 900px;
  max-width: calc(100% - 40px);

  margin: 40px auto;
}

.welcome {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 25px;
}

.eyebrow {
  color: #16a34a;

  font-size: 12px;

  font-weight: 800;

  letter-spacing: 1px;
}

h1 {
  margin: 5px 0 8px;

  font-size: 30px;
}

.welcome p {
  color: #6b7280;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 12px 18px;

  background: white;

  border: 1px solid #e5e7eb;

  border-radius: 12px;
}

.status-card strong,
.status-card small {
  display: block;
}

.status-card small {
  color: #6b7280;
  font-size: 11px;
}

.status-dot {
  width: 10px;
  height: 10px;

  border-radius: 50%;
}

.status-dot.available {
  background: #22c55e;
}

.status-dot.unavailable {
  background: #9ca3af;
}

.card {
  background: white;

  border: 1px solid #e5e7eb;

  border-radius: 16px;

  padding: 30px;

  box-shadow: 0 5px 20px rgba(0,0,0,.04);
}

h2 {
  margin: 0 0 5px;
}

.description {
  color: #6b7280;

  margin-bottom: 25px;
}

label {
  display: block;

  margin: 20px 0 7px;

  font-size: 13px;

  font-weight: 700;
}

input {
  width: 100%;

  box-sizing: border-box;

  padding: 12px;

  border: 1px solid #d1d5db;

  border-radius: 8px;

  outline: none;
}

input:focus {
  border-color: #16a34a;
}

input:disabled {
  background: #f3f4f6;
}

.hint {
  color: #6b7280;

  font-size: 12px;

  margin-top: -3px;
}

.skills {
  display: grid;

  grid-template-columns: repeat(2, 1fr);

  gap: 12px;
}

.skill {
  display: flex;

  align-items: center;

  gap: 12px;

  padding: 15px;

  border-radius: 10px;

  border: 1px solid #e5e7eb;

  background: white;

  cursor: pointer;

  text-align: left;

  font-weight: 600;
}

.skill:hover {
  border-color: #22c55e;
}

.skill.selected {
  background: #f0fdf4;

  border-color: #22c55e;

  color: #15803d;
}

.skill-icon {
  font-size: 22px;
}

.check {
  margin-left: auto;

  color: #16a34a;
}

.availability {
  display: flex;

  gap: 10px;
}

.availability button {
  padding: 11px 15px;

  border-radius: 9px;

  border: 1px solid #e5e7eb;

  background: white;

  cursor: pointer;

  font-weight: 600;
}

.availability button.active {
  border-color: #22c55e;

  background: #f0fdf4;

  color: #15803d;
}

.save-button {
  width: 100%;

  margin-top: 25px;

  padding: 14px;

  border: none;

  border-radius: 9px;

  background: #16a34a;

  color: white;

  font-weight: 700;

  cursor: pointer;
}

.save-button:disabled {
  opacity: .6;

  cursor: not-allowed;
}

.success {
  margin-top: 20px;

  padding: 11px;

  background: #f0fdf4;

  color: #15803d;

  border-radius: 8px;

  font-size: 13px;
}

.error {
  margin-top: 20px;

  padding: 11px;

  background: #fef2f2;

  color: #b91c1c;

  border-radius: 8px;

  font-size: 13px;
}

.loading {
  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  color: #6b7280;
}

@media (max-width: 700px) {

  .welcome {
    display: block;
  }

  .status-card {
    margin-top: 20px;
    width: fit-content;
  }

  .skills {
    grid-template-columns: 1fr;
  }

  .header-actions {
    gap: 5px;
  }

}

</style>