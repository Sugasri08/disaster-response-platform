<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const router = useRouter()

const step = ref(1) // Step 1: Role Selection, Step 2: Volunteer Details (if volunteer chosen)
const role = ref('')
const name = ref('')
const skills = ref([])
const availability = ref('available')

const loading = ref(false)
const errorMessage = ref('')
const fetchingProfile = ref(true)

const skillOptions = [
  { id: 'medical', label: 'Medical Assistance', icon: '🩺' },
  { id: 'transport', label: 'Transport / Logistics', icon: '🚗' },
  { id: 'supplies', label: 'Food & Supplies', icon: '📦' },
  { id: 'shelter', label: 'Shelter / Housing', icon: '🏠' }
]

onMounted(async () => {
  // Check if user is authenticated
  const user = auth.currentUser
  if (!user) {
    // Wait a brief moment for auth initialization just in case
    setTimeout(async () => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push('/login')
      } else {
        await loadExistingProfile(currentUser)
      }
    }, 1000)
  } else {
    await loadExistingProfile(user)
  }
})

const loadExistingProfile = async (user) => {
  try {
    name.value = user.displayName || ''
    const userRef = doc(db, 'users', user.uid)
    const snapshot = await getDoc(userRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      name.value = data.name || user.displayName || ''
      if (data.role) {
        role.value = data.role
        // If they already completed onboarding, redirect to dashboard
        if (data.role === 'volunteer') {
          skills.value = data.skills || []
          availability.value = data.availability || 'available'
          if (skills.value.length > 0) {
            router.push('/volunteer')
            return
          }
          // If volunteer but has no skills onboarding, show step 2
          step.value = 2
        } else if (data.role === 'help_seeker' || data.role === 'requester') {
          router.push('/crisis')
          return
        }
      }
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
  } finally {
    fetchingProfile.value = false
  }
}

const selectRole = (selectedRole) => {
  role.value = selectedRole
  if (selectedRole === 'help_seeker') {
    saveHelpSeekerProfile()
  } else {
    step.value = 2
  }
}

const toggleSkill = (skillId) => {
  if (skills.value.includes(skillId)) {
    skills.value = skills.value.filter(s => s !== skillId)
  } else {
    skills.value.push(skillId)
  }
}

const saveHelpSeekerProfile = async () => {
  const user = auth.currentUser
  if (!user) return

  loading.value = true
  errorMessage.value = ''

  try {
    await setDoc(doc(db, 'users', user.uid), {
      name: name.value || user.displayName || 'Help Seeker',
      email: user.email,
      role: 'help_seeker',
      updatedAt: new Date()
    }, { merge: true })

    router.push('/crisis')
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to save your profile. Please try again.'
  } finally {
    loading.value = false
  }
}

const saveVolunteerProfile = async () => {
  const user = auth.currentUser
  if (!user) return

  if (skills.value.length === 0) {
    errorMessage.value = 'Please select at least one skill capability.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await setDoc(doc(db, 'users', user.uid), {
      name: name.value || user.displayName || 'Volunteer',
      email: user.email,
      role: 'volunteer',
      skills: skills.value,
      availability: availability.value,
      available: availability.value === 'available', // For profile page compatibility
      updatedAt: new Date()
    }, { merge: true })

    router.push('/volunteer')
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to save volunteer onboarding details.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="onboarding-page">
    <div v-if="fetchingProfile" class="loading-state">
      <div class="spinner"></div>
      <p>Loading your profile...</p>
    </div>

    <div v-else class="onboarding-card">
      <div class="logo">🚨</div>
      
      <!-- STEP 1: ROLE SELECTION -->
      <div v-if="step === 1">
        <h1>Welcome to AidMap</h1>
        <p class="subtitle">How will you participate in the community response?</p>

        <div class="roles-grid">
          <button class="role-card-option requester" @click="selectRole('help_seeker')">
            <div class="role-icon">🆘</div>
            <div class="role-details">
              <h2>Request Help</h2>
              <p>I need assistance, supplies, or rescue support during a crisis.</p>
            </div>
            <span class="arrow">→</span>
          </button>

          <button class="role-card-option volunteer" @click="selectRole('volunteer')">
            <div class="role-icon">🙋</div>
            <div class="role-details">
              <h2>Volunteer</h2>
              <p>I want to provide aid, transport, medical assistance, or shelter.</p>
            </div>
            <span class="arrow">→</span>
          </button>
        </div>
      </div>

      <!-- STEP 2: VOLUNTEER ONBOARDING -->
      <div v-else>
        <h1>Volunteer Capabilities</h1>
        <p class="subtitle">Tell us how you can help during emergencies</p>

        <div class="form-section">
          <h3>1. Choose your skills</h3>
          <p class="section-desc">Select all areas where you can provide assistance:</p>
          <div class="skills-grid">
            <button 
              v-for="skill in skillOptions" 
              :key="skill.id"
              type="button"
              class="skill-card"
              :class="{ selected: skills.includes(skill.id) }"
              @click="toggleSkill(skill.id)"
            >
              <span class="skill-icon">{{ skill.icon }}</span>
              <span class="skill-label">{{ skill.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-section">
          <h3>2. Set your availability</h3>
          <div class="availability-toggle">
            <label class="toggle-option" :class="{ active: availability === 'available' }">
              <input type="radio" value="available" v-model="availability" />
              <span>🟢 Available for active dispatch</span>
            </label>
            <label class="toggle-option" :class="{ active: availability === 'unavailable' }">
              <input type="radio" value="unavailable" v-model="availability" />
              <span>⚪ Currently Unavailable</span>
            </label>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          ⚠️ {{ errorMessage }}
        </div>

        <div class="actions-row">
          <button class="back-button" @click="step = 1" :disabled="loading">
            ← Back
          </button>
          <button class="submit-button" @click="saveVolunteerProfile" :disabled="loading">
            {{ loading ? 'Saving details...' : 'Complete Onboarding' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  padding: 20px;
  font-family: 'Outfit', 'Inter', sans-serif;
}

.loading-state {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(220, 38, 38, 0.1);
  border-top-color: #dc2626;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.onboarding-card {
  width: 600px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.logo {
  font-size: 44px;
  text-align: center;
  margin-bottom: 12px;
}

h1 {
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  color: #0f172a;
  margin: 0 0 8px;
}

.subtitle {
  text-align: center;
  color: #64748b;
  margin-bottom: 35px;
  font-size: 15px;
}

.roles-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-card-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;
}

.role-card-option:hover {
  transform: translateY(-2px);
}

.role-card-option.requester:hover {
  border-color: #ef4444;
  background: #fff5f5;
}

.role-card-option.volunteer:hover {
  border-color: #22c55e;
  background: #f0fdf4;
}

.role-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: #f1f5f9;
}

.requester .role-icon {
  background: #fee2e2;
}

.volunteer .role-icon {
  background: #dcfce7;
}

.role-details {
  flex: 1;
}

.role-details h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #0f172a;
}

.role-details p {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.arrow {
  font-size: 20px;
  font-weight: bold;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.role-card-option:hover .arrow {
  transform: translateX(4px);
  color: #0f172a;
}

.form-section {
  margin-top: 30px;
}

.form-section h3 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}

.section-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: #334155;
  transition: all 0.2s ease;
}

.skill-card:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.skill-card.selected {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #166534;
  box-shadow: 0 0 0 1px #22c55e;
}

.skill-icon {
  font-size: 20px;
}

.availability-toggle {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toggle-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.toggle-option input {
  margin: 0;
  accent-color: #22c55e;
}

.toggle-option.active {
  border-color: #94a3b8;
  background: #f8fafc;
}

.error-message {
  margin-top: 24px;
  padding: 12px 16px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 13.5px;
  text-align: left;
}

.actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 35px;
  gap: 16px;
}

.back-button {
  padding: 13px 24px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #475569;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.back-button:hover {
  background: #f1f5f9;
}

.submit-button {
  flex: 1;
  padding: 13px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-button:hover {
  background: #16a34a;
}

.submit-button:disabled, .back-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 500px) {
  .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style>
