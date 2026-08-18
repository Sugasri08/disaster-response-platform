<script setup>
import { ref } from 'vue'
import {
  collection,
  addDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const emit = defineEmits(['close', 'created'])

const selectedType = ref('')
const selectedPriority = ref('Low')
const description = ref('')
const address = ref('')
const contact = ref('')
const additionalInfo = ref('')

const latitude = ref(null)
const longitude = ref(null)
const locationAccuracy = ref(null)

const locationLoading = ref(false)
const locationShared = ref(false)
const submitting = ref(false)

const error = ref('')
const successMessage = ref('')

const helpTypes = [
  { type: 'Water', icon: '💧' },
  { type: 'Medical', icon: '🏥' },
  { type: 'Food', icon: '🍱' },
  { type: 'Rescue', icon: '🛟' },
  { type: 'Shelter', icon: '🏠' },
  { type: 'Power', icon: '⚡' }
]

const selectHelpType = type => {
  selectedType.value = type
  error.value = ''
}

const shareLiveLocation = () => {
  error.value = ''
  successMessage.value = ''

  if (!navigator.geolocation) {
    error.value = 'Your browser does not support location services.'
    return
  }

  locationLoading.value = true

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords

      console.log('📍 REAL BROWSER GPS LOCATION:', {
        latitude: lat,
        longitude: lng,
        accuracy
      })

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        locationLoading.value = false
        error.value = 'The browser returned an invalid location.'
        return
      }

      latitude.value = lat
      longitude.value = lng
      locationAccuracy.value = Number.isFinite(accuracy) ? accuracy : null
      locationShared.value = true
      locationLoading.value = false

      successMessage.value = 'Your current location has been captured successfully.'

      console.log('✅ LOCATION STORED IN FORM:', {
        latitude: latitude.value,
        longitude: longitude.value,
        accuracy: locationAccuracy.value
      })
    },
    locationError => {
      locationLoading.value = false

      console.error('❌ Geolocation error:', locationError)

      switch (locationError.code) {
        case 1:
          error.value =
            'Location permission was denied. Please allow location access for this website.'
          break
        case 2:
          error.value =
            'Your location could not be determined. Please check your GPS/location settings.'
          break
        case 3:
          error.value =
            'Location request timed out. Please try again.'
          break
        default:
          error.value =
            'Unable to get your current location. Please try again.'
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  )
}

const clearLocation = () => {
  latitude.value = null
  longitude.value = null
  locationAccuracy.value = null
  locationShared.value = false
  successMessage.value = ''
}

const validateForm = () => {
  if (!selectedType.value) {
    error.value = 'Please select the type of help needed.'
    return false
  }

  if (!description.value.trim()) {
    error.value = 'Please describe the situation.'
    return false
  }

  if (
    latitude.value === null ||
    longitude.value === null
  ) {
    error.value =
      'Please share your live location before submitting the emergency.'
    return false
  }

  const lat = Number(latitude.value)
  const lng = Number(longitude.value)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    error.value =
      'The selected location is invalid. Please capture your location again.'
    return false
  }

  if (lat < -90 || lat > 90) {
    error.value = 'Invalid latitude.'
    return false
  }

  if (lng < -180 || lng > 180) {
    error.value = 'Invalid longitude.'
    return false
  }

  if (lat === 0 && lng === 0) {
    error.value =
      'Location returned 0,0. Please refresh your location and try again.'
    return false
  }

  return true
}

const submitEmergency = async () => {
  if (submitting.value) return

  error.value = ''
  successMessage.value = ''

  if (!validateForm()) return

  const user = auth.currentUser

  if (!user) {
    error.value =
      'Your session has expired. Please login again before reporting an emergency.'
    return
  }

  const parsedLatitude = Number(latitude.value)
  const parsedLongitude = Number(longitude.value)

  console.log('🚨 FINAL LOCATION BEFORE FIRESTORE:', {
    latitude: parsedLatitude,
    longitude: parsedLongitude
  })

  submitting.value = true

  try {
    const emergencyData = {
      requesterId: user.uid,
      requesterName:
        user.displayName ||
        user.email ||
        'Help Seeker',
      requesterEmail: user.email || null,

      type: selectedType.value,
      priority: selectedPriority.value,
      severity: selectedPriority.value,

      description: description.value.trim(),

      // REAL DEVICE LOCATION
      latitude: parsedLatitude,
      longitude: parsedLongitude,

      // Structured location for future map/distance queries
      location: {
        latitude: parsedLatitude,
        longitude: parsedLongitude
      },

      locationShared: true,

      locationAccuracy:
        locationAccuracy.value !== null
          ? Number(locationAccuracy.value)
          : null,

      address: address.value.trim() || null,
      contact: contact.value.trim() || null,
      additionalInfo: additionalInfo.value.trim() || null,

      status: 'pending',

      assignedVolunteer: null,
      assignedVolunteerId: null,
      assignedVolunteerName: null,

      crisisId: 'default',

      resolutionProof: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedByName: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      acceptedAt: null,
      resolvedAt: null
    }

    console.log('🔥 SAVING EMERGENCY:', emergencyData)
    console.log('📍 SAVING REAL COORDINATES:', {
      latitude: emergencyData.latitude,
      longitude: emergencyData.longitude
    })

    const docRef = await addDoc(
      collection(db, 'emergencies'),
      emergencyData
    )

    console.log('✅ Emergency created:', docRef.id)

    const savedEmergency = await getDoc(docRef)

    if (savedEmergency.exists()) {
      const savedData = savedEmergency.data()

      console.log('🔥 FIRESTORE CONFIRMATION:', {
        latitude: savedData.latitude,
        longitude: savedData.longitude,
        location: savedData.location
      })
    }

    const createdEmergency = {
      ...emergencyData,
      firestoreId: docRef.id,
      _id: docRef.id
    }

    emit('created', createdEmergency)

    resetForm()
    emit('close')
  } catch (err) {
    console.error('❌ Failed to create emergency:', err)

    if (err?.code === 'permission-denied') {
      error.value =
        'Firestore permission denied. Please check your Firebase security rules.'
    } else if (err?.code === 'unauthenticated') {
      error.value =
        'Your Firebase login session has expired. Please login again.'
    } else {
      error.value =
        err?.message ||
        'Failed to submit emergency. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  selectedType.value = ''
  selectedPriority.value = 'Low'
  description.value = ''
  address.value = ''
  contact.value = ''
  additionalInfo.value = ''

  latitude.value = null
  longitude.value = null
  locationAccuracy.value = null

  locationShared.value = false
  successMessage.value = ''
  error.value = ''
}

const close = () => {
  if (submitting.value) return
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="close">
    <div class="report-modal">

      <div class="modal-header">
        <div>
          <h2>🚨 Report an Emergency</h2>
          <p>Tell the community what help is needed.</p>
        </div>

        <button
          type="button"
          class="close-button"
          :disabled="submitting"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div v-if="error" class="error-box">
        ⚠️ {{ error }}
      </div>

      <div v-if="successMessage" class="success-box">
        ✅ {{ successMessage }}
      </div>

      <div class="form-section">
        <label>What kind of help is needed?</label>

        <div class="help-grid">
          <button
            v-for="item in helpTypes"
            :key="item.type"
            type="button"
            class="help-option"
            :class="{ selected: selectedType === item.type }"
            @click="selectHelpType(item.type)"
          >
            <span>{{ item.icon }}</span>
            {{ item.type }}
          </button>
        </div>
      </div>

      <div class="form-section">
        <label>Priority</label>

        <div class="priority-options">
          <label>
            <input
              v-model="selectedPriority"
              type="radio"
              value="Low"
              name="priority"
            />
            🟢 Low
          </label>

          <label>
            <input
              v-model="selectedPriority"
              type="radio"
              value="Medium"
              name="priority"
            />
            🟠 Medium
          </label>

          <label>
            <input
              v-model="selectedPriority"
              type="radio"
              value="Critical"
              name="priority"
            />
            🔴 Critical
          </label>
        </div>
      </div>

      <div class="form-section">
        <label for="description">
          Describe the situation *
        </label>

        <textarea
          id="description"
          v-model="description"
          rows="4"
          placeholder="Tell us what is happening and what kind of help is required..."
        />
      </div>

      <div class="form-section">
        <label for="address">Exact Address</label>

        <input
          id="address"
          v-model="address"
          type="text"
          placeholder="Enter the exact address or landmark"
        />
      </div>

      <div class="form-section">
        <label for="contact">Contact Number</label>

        <input
          id="contact"
          v-model="contact"
          type="tel"
          placeholder="Enter a phone number for responders"
        />
      </div>

      <div class="form-section">
        <label for="additionalInfo">
          Additional Information
        </label>

        <textarea
          id="additionalInfo"
          v-model="additionalInfo"
          rows="3"
          placeholder="Any extra information responders should know..."
        />
      </div>

      <!-- LIVE LOCATION -->
      <div class="form-section location-section">
        <label>Emergency Location *</label>

        <button
          type="button"
          class="location-selector"
          :class="{ 'location-active': locationShared }"
          :disabled="locationLoading"
          @click="shareLiveLocation"
        >
          <span class="location-icon">
            <span v-if="locationLoading">⏳</span>
            <span v-else-if="locationShared">✅</span>
            <span v-else>📍</span>
          </span>

          <span class="location-text">
            <strong v-if="locationLoading">
              Getting your location...
            </strong>

            <strong v-else-if="locationShared">
              Location captured
            </strong>

            <strong v-else>
              Share My Live Location
            </strong>

            <small v-if="locationShared">
              {{ Number(latitude).toFixed(6) }},
              {{ Number(longitude).toFixed(6) }}
            </small>

            <small v-else>
              Use your device's current GPS location
            </small>
          </span>
        </button>

        <div
          v-if="locationShared && locationAccuracy !== null"
          class="accuracy-info"
        >
          🎯 Accuracy: approximately
          {{ Math.round(Number(locationAccuracy)) }}m
        </div>

        <div
          v-if="locationShared"
          class="location-actions"
        >
          <button
            type="button"
            class="refresh-location"
            :disabled="locationLoading"
            @click="shareLiveLocation"
          >
            🔄 Refresh Location
          </button>

          <button
            type="button"
            class="clear-location"
            @click="clearLocation"
          >
            Clear
          </button>
        </div>

        <p class="location-hint">
          Your browser will ask for permission to access your current GPS location.
        </p>
      </div>

      <button
        type="button"
        class="submit-button"
        :disabled="submitting || locationLoading || !locationShared"
        @click="submitEmergency"
      >
        <span v-if="submitting">
          ⏳ Submitting Emergency...
        </span>

        <span v-else>
          🚨 Submit Emergency
        </span>
      </button>

      <p v-if="submitting" class="submit-hint">
        Saving your emergency request securely...
      </p>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 5000;
}

.report-modal {
  width: 500px;
  max-width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.modal-header h2 {
  margin: 0;
  font-size: 21px;
  color: #111827;
}

.modal-header p {
  margin: 5px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.close-button {
  border: none;
  background: #f3f4f6;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
}

.close-button:hover {
  background: #e5e7eb;
}

.close-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-box,
.success-box {
  margin-bottom: 18px;
  padding: 11px 13px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.success-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.form-section {
  margin-bottom: 20px;
}

.form-section > label {
  display: block;
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
}

.help-option {
  border: 1px solid #e5e7eb;
  background: #fafafa;
  padding: 13px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: 0.2s;
}

.help-option span {
  font-size: 19px;
}

.help-option:hover {
  border-color: #ef4444;
  background: #fff5f5;
}

.help-option.selected {
  border-color: #ef4444;
  background: #fff1f2;
  color: #dc2626;
  font-weight: 700;
}

.priority-options {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.priority-options label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
}

input[type="text"],
input[type="tel"],
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  padding: 11px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

.location-selector {
  width: 100%;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  padding: 13px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
}

.location-selector:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.location-selector.location-active {
  border-color: #22c55e;
  background: #f0fdf4;
}

.location-selector:disabled {
  opacity: 0.7;
  cursor: wait;
}

.location-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #fee2e2;
  font-size: 18px;
}

.location-selector.location-active .location-icon {
  background: #dcfce7;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.location-text strong {
  font-size: 13px;
}

.location-text small {
  color: #64748b;
  font-size: 10px;
}

.accuracy-info {
  margin-top: 7px;
  color: #15803d;
  font-size: 10px;
  font-weight: 600;
}

.location-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.refresh-location {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  padding: 7px 10px;
  border-radius: 7px;
  font-size: 11px;
  cursor: pointer;
}

.refresh-location:hover {
  background: #f9fafb;
}

.clear-location {
  border: none;
  background: transparent;
  color: #dc2626;
  padding: 7px 10px;
  font-size: 11px;
  cursor: pointer;
}

.location-hint {
  margin: 7px 0 0;
  font-size: 10px;
  color: #9ca3af;
}

.submit-button {
  width: 100%;
  border: none;
  background: #ef4444;
  color: white;
  padding: 13px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #dc2626;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-hint {
  margin: 8px 0 0;
  text-align: center;
  color: #6b7280;
  font-size: 10px;
}

@media (max-width: 500px) {
  .report-modal {
    padding: 18px;
  }

  .help-grid {
    grid-template-columns: 1fr;
  }

  .priority-options {
    flex-direction: column;
    gap: 10px;
  }
}
</style>