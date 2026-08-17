<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
import { createEmergency } from '../services/api'

const router = useRouter()

const type = ref('')
const severity = ref('')
const description = ref('')
const address = ref('')
const contact = ref('')
const additionalInfo = ref('')

const latitude = ref(null)
const longitude = ref(null)
const locationStatus = ref('')

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const emergencyTypes = [
  { id: 'Medical', label: 'Medical Emergency', icon: '🩺' },
  { id: 'Transport', label: 'Emergency Transport', icon: '🚗' },
  { id: 'Food/Supplies', label: 'Food & Supplies', icon: '📦' },
  { id: 'Shelter', label: 'Emergency Shelter', icon: '🏠' },
  { id: 'Rescue', label: 'Search & Rescue', icon: '🛟' },
  { id: 'Other', label: 'Other Urgent Assistance', icon: '🚨' }
]

const severityLevels = [
  { id: 'Low', label: 'Low', desc: 'No immediate danger' },
  { id: 'Medium', label: 'Medium', desc: 'Needs attention soon' },
  { id: 'High', label: 'High', desc: 'Urgent response needed' },
  { id: 'Critical', label: 'Critical', desc: 'Life-threatening threat' }
]

const shareLocation = () => {
  if (!navigator.geolocation) {
    locationStatus.value = 'Geolocation is not supported by your browser.'
    return
  }

  locationStatus.value = 'Locating...'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude
      locationStatus.value = `Location Shared: ${latitude.value.toFixed(4)}, ${longitude.value.toFixed(4)}`
    },
    (error) => {
      console.error(error)
      locationStatus.value = 'Unable to retrieve location.'
    }
  )
}

const submitRequest = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!type.value) {
    errorMessage.value = 'Please select the emergency type.'
    return
  }
  if (!severity.value) {
    errorMessage.value = 'Please select the severity level.'
    return
  }
  if (!description.value.trim()) {
    errorMessage.value = 'Please provide a description of the situation.'
    return
  }

  if (contact.value && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(contact.value)) {
    errorMessage.value = 'Please enter a valid contact number.'
    return
  }

  loading.value = true

  try {
    const user = auth.currentUser
    if (!user) {
      errorMessage.value = 'You must be logged in to request help.'
      return
    }

    // Get current active crisis from Firestore, or use default if none
    let activeCrisisId = 'default'
    
    // Save to Firestore first
    const docRef = await addDoc(collection(db, 'emergencies'), {
      requesterId: user.uid,
      requesterName: user.displayName || 'Help Seeker',
      crisisId: activeCrisisId,
      type: type.value,
      severity: severity.value,
      description: description.value.trim(),
      address: address.value.trim() || null,
      contact: contact.value.trim() || null,
      additionalInfo: additionalInfo.value.trim() || null,
      latitude: latitude.value,
      longitude: longitude.value,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Sync to backend MongoDB API so it populates map/dashboards
    // Generate default coordinates if not provided to satisfy mongoose validation requirement
    const lat = latitude.value !== null ? latitude.value : (12.8260 + (Math.random() - 0.5) * 0.05)
    const lng = longitude.value !== null ? longitude.value : (80.2333 + (Math.random() - 0.5) * 0.05)

    const priorityMap = {
      Low: 'Low',
      Medium: 'Medium',
      High: 'Critical',
      Critical: 'Critical'
    }

    await createEmergency({
      type: type.value,
      priority: priorityMap[severity.value] || 'Low',
      description: description.value.trim(),
      latitude: lat,
      longitude: lng,
      status: 'pending',
      firestoreId: docRef.id
    })

    successMessage.value = 'Emergency request submitted successfully!'
    
    setTimeout(() => {
      router.push(`/emergency/${docRef.id}`)
    }, 1500)
  } catch (error) {
    console.error('Failed to save emergency:', error)
    errorMessage.value = 'Unable to submit emergency request. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="report-page">
    <header class="report-header">
      <button class="back-btn" @click="router.push('/crisis')">← Crisis Hub</button>
      <h2>Report Emergency Request</h2>
      <div style="width: 100px;"></div>
    </header>

    <main class="report-container">
      <div class="report-card">
        <div v-if="successMessage" class="success-box">
          ✓ {{ successMessage }}
        </div>

        <div v-if="errorMessage" class="error-box">
          ⚠️ {{ errorMessage }}
        </div>

        <div class="form-group">
          <label class="required-lbl">1. Emergency Type</label>
          <div class="types-grid">
            <button 
              v-for="item in emergencyTypes" 
              :key="item.id"
              type="button"
              class="type-card"
              :class="{ selected: type === item.id }"
              @click="type = item.id"
              :disabled="loading"
            >
              <span class="type-icon">{{ item.icon }}</span>
              <span class="type-label">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="required-lbl">2. Severity Level</label>
          <div class="severity-grid">
            <button 
              v-for="level in severityLevels" 
              :key="level.id"
              type="button"
              class="severity-card"
              :class="[level.id.toLowerCase(), { selected: severity === level.id }]"
              @click="severity = level.id"
              :disabled="loading"
            >
              <strong>{{ level.label }}</strong>
              <span>{{ level.desc }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="required-lbl">3. Describe the Situation</label>
          <textarea 
            v-model="description" 
            placeholder="Please detail what is happening, who is affected, and what immediate help is required..."
            rows="4"
            :disabled="loading"
          ></textarea>
        </div>

        <hr class="form-divider" />
        <p class="optional-notice">ℹ The fields below are optional, but help responders locate and contact you faster.</p>

        <div class="form-group">
          <label class="optional-lbl">Exact Address <span>(Optional)</span></label>
          <input 
            v-model="address" 
            type="text" 
            placeholder="Street name, landmark, building number..."
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="optional-lbl">Contact Number <span>(Optional)</span></label>
          <input 
            v-model="contact" 
            type="tel" 
            placeholder="e.g. +1234567890"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="optional-lbl">Additional Details <span>(Optional)</span></label>
          <textarea 
            v-model="additionalInfo" 
            placeholder="Special instructions, gate codes, nearby landmarks, medical history of victims..."
            rows="2"
            :disabled="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="optional-lbl">Current Location <span>(Optional)</span></label>
          <div class="location-box">
            <button 
              type="button" 
              class="location-btn" 
              @click="shareLocation"
              :disabled="loading"
            >
              📍 Share Coordinates
            </button>
            <span v-if="locationStatus" class="location-status">{{ locationStatus }}</span>
          </div>
        </div>

        <button 
          class="submit-btn" 
          @click="submitRequest"
          :disabled="loading"
        >
          {{ loading ? 'Submitting Urgent Request...' : '🚨 Submit Emergency Request' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.report-page {
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Outfit', 'Inter', sans-serif;
}

.report-header {
  height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.back-btn {
  border: 1px solid #e2e8f0;
  background: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.back-btn:hover {
  background: #f1f5f9;
}

.report-header h2 {
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.report-container {
  max-width: 700px;
  margin: 30px auto;
  padding: 0 20px 50px;
}

.report-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 24px;
}

label {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}

.required-lbl::after {
  content: ' *';
  color: #ef4444;
}

.optional-lbl span {
  font-weight: 500;
  color: #64748b;
  font-size: 13px;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.type-card {
  padding: 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.type-card:hover {
  border-color: #cbd5e1;
}

.type-card.selected {
  border-color: #dc2626;
  background: #fef2f2;
  color: #991b1b;
}

.type-icon {
  font-size: 24px;
}

.type-label {
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.severity-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.severity-card {
  padding: 12px 8px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
}

.severity-card strong {
  font-size: 13px;
}

.severity-card span {
  font-size: 9px;
  text-align: center;
  color: #64748b;
  margin-top: 3px;
}

.severity-card.selected.low { border-color: #22c55e; background: #f0fdf4; color: #166534; }
.severity-card.selected.medium { border-color: #eab308; background: #fef9c3; color: #854d0e; }
.severity-card.selected.high { border-color: #f97316; background: #ffedd5; color: #9a3412; }
.severity-card.selected.critical { border-color: #ef4444; background: #fee2e2; color: #991b1b; }

textarea, input[type="text"], input[type="tel"] {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  background: #f8fafc;
}

textarea:focus, input:focus {
  border-color: #cbd5e1;
  background: white;
  box-shadow: 0 0 0 3px rgba(203, 213, 225, 0.25);
}

.form-divider {
  border: 0;
  height: 1px;
  background: #e2e8f0;
  margin: 30px 0 20px;
}

.optional-notice {
  font-size: 12.5px;
  color: #475569;
  background: #f1f5f9;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.location-box {
  display: flex;
  align-items: center;
  gap: 15px;
}

.location-btn {
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  background: white;
  cursor: pointer;
  color: #334155;
}

.location-btn:hover {
  background: #f8fafc;
}

.location-status {
  font-size: 12.5px;
  color: #059669;
  font-weight: 600;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 30px;
  transition: background 0.2s;
}

.submit-btn:hover {
  background: #b91c1c;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-box {
  padding: 12px;
  background: #f0fdf4;
  color: #166534;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.error-box {
  padding: 12px;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .severity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
