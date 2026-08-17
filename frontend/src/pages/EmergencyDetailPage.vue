<script setup>
import { onMounted, ref, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
import { getEmergencies, acceptEmergency, resolveEmergency } from '../services/api'
const route = useRoute()
const router = useRouter()
const emergency = ref(null)
const userProfile = ref(null)
const loading = ref(true)
const accepting = ref(false)
const resolving = ref(false)
const showResolveForm = ref(false)
const resolutionNote = ref('')
const accessDenied = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
let unsubscribeEmergency = null
onMounted(async () => {
  await loadEmergencyDetails()
})
onBeforeUnmount(() => {
  if (unsubscribeEmergency) {
    unsubscribeEmergency()
    unsubscribeEmergency = null
  }
})
const loadEmergencyDetails = async () => {
  loading.value = true
  accessDenied.value = false
  emergency.value = null
  try {
    const user = auth.currentUser
    if (!user) {
      router.push('/login')
      return
    }
    const profileRef = doc(db, 'users', user.uid)
    const profileSnap = await getDoc(profileRef)
    if (profileSnap.exists()) {
      userProfile.value = profileSnap.data()
    }
    const firestoreRef = doc(db, 'emergencies', route.params.id)
    const firestoreSnap = await getDoc(firestoreRef)
    if (firestoreSnap.exists()) {
      const data = firestoreSnap.data()
      const isVolunteer = userProfile.value?.role === 'volunteer'
      const isRequester = data.requesterId === user.uid
      const isAssignedVolunteer = data.assignedVolunteerId === user.uid
      if (!isVolunteer && !isRequester) {
        accessDenied.value = true
        return
      }
      if (isVolunteer && data.status === 'ACCEPTED' && data.assignedVolunteerId && !isAssignedVolunteer) {
        accessDenied.value = true
        return
      }
      emergency.value = {
        id: firestoreSnap.id,
        _id: firestoreSnap.id,
        ...data,
        createdAt: formatDate(data.createdAt)
      }
      startRealtimeListener(firestoreRef)
    } else {
      const response = await getEmergencies()
      const found = response.emergencies?.find(item => item._id === route.params.id || item.firestoreId === route.params.id)
      if (!found) {
        emergency.value = null
        return
      }
      const isVolunteer = userProfile.value?.role === 'volunteer'
      if (!isVolunteer && found.requesterId && found.requesterId !== user.uid) {
        accessDenied.value = true
        return
      }
      emergency.value = {
        id: found.firestoreId || found._id,
        _id: found._id,
        ...found
      }
    }
  } catch (error) {
    console.error('Failed to load emergency:', error)
    errorMessage.value = 'Failed to load emergency details.'
  } finally {
    loading.value = false
  }
}
const startRealtimeListener = (firestoreRef) => {
  if (unsubscribeEmergency) {
    unsubscribeEmergency()
  }
  unsubscribeEmergency = onSnapshot(firestoreRef, snapshot => {
    if (!snapshot.exists()) {
      emergency.value = null
      return
    }
    const data = snapshot.data()
    emergency.value = {
      id: snapshot.id,
      _id: snapshot.id,
      ...data,
      createdAt: formatDate(data.createdAt)
    }
  }, error => {
    console.error('Real-time listener error:', error)
  })
}
const formatDate = timestamp => {
  if (!timestamp) return 'Just now'
  if (timestamp.toDate) return timestamp.toDate().toLocaleString()
  const date = new Date(timestamp)
  return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString()
}
const accept = async () => {
  if (!emergency.value) return
  accepting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const user = auth.currentUser
  if (!user || !userProfile.value) {
    errorMessage.value = 'User session not found.'
    accepting.value = false
    return
  }
  if (userProfile.value.role !== 'volunteer') {
    errorMessage.value = 'Only volunteers can accept emergencies.'
    accepting.value = false
    return
  }
  try {
    const firestoreRef = doc(db, 'emergencies', emergency.value.id)
    const volunteerName = userProfile.value.name || user.displayName || 'Volunteer'
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(firestoreRef)
      if (!snapshot.exists()) {
        throw new Error('This emergency request was not found.')
      }
      const data = snapshot.data()
      if (data.status !== 'PENDING' && data.status !== 'pending') {
        throw new Error('This emergency has already been accepted by another volunteer.')
      }
      transaction.update(firestoreRef, {
        status: 'ACCEPTED',
        assignedVolunteerId: user.uid,
        assignedVolunteerName: volunteerName,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    })
    emergency.value.status = 'ACCEPTED'
    emergency.value.assignedVolunteerId = user.uid
    emergency.value.assignedVolunteerName = volunteerName
    successMessage.value = 'Emergency accepted successfully!'
    try {
      await acceptEmergency(emergency.value.id, user.uid, volunteerName)
    } catch (error) {
      console.error('MongoDB acceptance sync failed:', error)
    }
  } catch (error) {
    console.error('Acceptance failed:', error)
    errorMessage.value = error.message || 'Failed to accept emergency.'
  } finally {
    accepting.value = false
  }
}
const openResolveForm = () => {
  successMessage.value = ''
  errorMessage.value = ''
  resolutionNote.value = ''
  showResolveForm.value = true
}
const cancelResolve = () => {
  showResolveForm.value = false
  resolutionNote.value = ''
}
const resolve = async () => {
  if (!emergency.value) return
  const user = auth.currentUser
  if (!user || !userProfile.value) {
    errorMessage.value = 'User session not found.'
    return
  }
  if (emergency.value.status !== 'ACCEPTED') {
    errorMessage.value = 'Only accepted emergencies can be resolved.'
    return
  }
  if (emergency.value.assignedVolunteerId !== user.uid) {
    errorMessage.value = 'Only the assigned volunteer can resolve this emergency.'
    return
  }
  if (!resolutionNote.value.trim()) {
    errorMessage.value = 'Please enter a resolution note.'
    return
  }
  resolving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const firestoreRef = doc(db, 'emergencies', emergency.value.id)
    const volunteerName = userProfile.value.name || user.displayName || 'Volunteer'
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(firestoreRef)
      if (!snapshot.exists()) {
        throw new Error('Emergency request not found.')
      }
      const data = snapshot.data()
      if (data.status !== 'ACCEPTED') {
        throw new Error('This emergency is no longer available for resolution.')
      }
      if (data.assignedVolunteerId !== user.uid) {
        throw new Error('Only the assigned volunteer can resolve this emergency.')
      }
      transaction.update(firestoreRef, {
        status: 'RESOLVED',
        resolutionNote: resolutionNote.value.trim(),
        resolvedBy: user.uid,
        resolvedByName: volunteerName,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    })
    try {
      const apiId = emergency.value._id || emergency.value.id
      const response = await resolveEmergency(apiId)
      if (response?.emergency) {
        emergency.value = {
          ...emergency.value,
          ...response.emergency
        }
      }
    } catch (error) {
      console.error('MongoDB resolution sync failed:', error)
    }
    emergency.value.status = 'RESOLVED'
    emergency.value.resolutionNote = resolutionNote.value.trim()
    emergency.value.resolvedBy = user.uid
    emergency.value.resolvedByName = volunteerName
    showResolveForm.value = false
    successMessage.value = 'Emergency has been successfully resolved!'
  } catch (error) {
    console.error('Resolution failed:', error)
    errorMessage.value = error.message || 'Failed to resolve emergency.'
  } finally {
    resolving.value = false
  }
}
const goBack = () => {
  router.back()
}
</script>
<template>
  <div class="details-page">
    <header>
      <button @click="goBack">← Back</button>
      <strong>AidMap Detail View</strong>
      <button @click="router.push('/profile')">👤 Profile</button>
    </header>
    <main v-if="loading">
      <div class="loading-box">Loading emergency...</div>
    </main>
    <main v-else-if="accessDenied" class="not-found">
      <h2>⚠️ Access Denied</h2>
      <p>You are not authorized to view this emergency's details.</p>
      <button @click="router.push('/crisis')">Return to Crisis</button>
    </main>
    <main v-else-if="!emergency" class="not-found">
      <h2>Emergency request not found</h2>
      <button @click="goBack">Return Back</button>
    </main>
    <main v-else>
      <div class="emergency-card">
        <div class="icon">🚨</div>
        <span class="priority" :class="emergency.severity ? emergency.severity.toLowerCase() : 'low'">
          {{ emergency.severity || emergency.priority || 'Low' }}
        </span>
        <h1>{{ emergency.type }} Emergency</h1>
        <p class="description">{{ emergency.description }}</p>
        <div class="info">
          <div>
            <span>📊 Status</span>
            <strong>{{ emergency.status }}</strong>
          </div>
          <div v-if="emergency.latitude != null && emergency.longitude != null">
            <span>📍 Location Coordinates</span>
            <strong>{{ Number(emergency.latitude).toFixed(5) }}, {{ Number(emergency.longitude).toFixed(5) }}</strong>
          </div>
          <div v-if="emergency.address">
            <span>🏠 Address</span>
            <strong>{{ emergency.address }}</strong>
          </div>
          <div v-if="emergency.contact">
            <span>📞 Contact Number</span>
            <strong>{{ emergency.contact }}</strong>
          </div>
          <div v-if="emergency.additionalInfo">
            <span>ℹ️ Additional Information</span>
            <strong>{{ emergency.additionalInfo }}</strong>
          </div>
          <div v-if="emergency.createdAt">
            <span>⏱ Reported Time</span>
            <strong>{{ emergency.createdAt }}</strong>
          </div>
          <div v-if="emergency.assignedVolunteerName">
            <span>🙋 Assigned Volunteer</span>
            <strong>{{ emergency.assignedVolunteerName }}</strong>
          </div>
          <div v-if="emergency.resolvedAt">
            <span>✅ Resolved Time</span>
            <strong>{{ formatDate(emergency.resolvedAt) }}</strong>
          </div>
        </div>
        <div v-if="successMessage" class="feedback-msg success">
          ✅ {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="feedback-msg error">
          ❌ {{ errorMessage }}
        </div>
        <div v-if="emergency.status === 'PENDING' || emergency.status === 'pending'" class="waiting">
          ⏳ Waiting for volunteer response...
        </div>
        <div v-if="emergency.status === 'ACCEPTED' || emergency.status === 'accepted'" class="accepted">
          🙋 Help is on the way
          <small>Assigned Volunteer: {{ emergency.assignedVolunteerName || 'Assigned' }}</small>
        </div>
        <div v-if="emergency.status === 'RESOLVED' || emergency.status === 'resolved'" class="resolved">
          <strong>✅ Emergency request resolved</strong>
          <small v-if="emergency.resolutionNote">{{ emergency.resolutionNote }}</small>
          <small v-if="emergency.resolvedByName">Resolved by: {{ emergency.resolvedByName }}</small>
        </div>
        <button v-if="(emergency.status === 'PENDING' || emergency.status === 'pending') && userProfile?.role === 'volunteer'" class="help-button" :disabled="accepting" @click="accept">
          {{ accepting ? 'Accepting...' : '🙋 ACCEPT EMERGENCY' }}
        </button>
        <div v-if="(emergency.status === 'ACCEPTED' || emergency.status === 'accepted') && userProfile?.role === 'volunteer' && emergency.assignedVolunteerId === auth.currentUser?.uid" class="resolve-area">
          <button v-if="!showResolveForm" class="resolve-button" @click="openResolveForm">
            ✅ RESOLVE EMERGENCY
          </button>
          <div v-if="showResolveForm" class="resolve-form">
            <h3>Resolve Emergency</h3>
            <p>Please describe how the emergency was resolved.</p>
            <textarea v-model="resolutionNote" placeholder="Example: Person was safely transported to the hospital." rows="4"></textarea>
            <div class="resolve-actions">
              <button class="cancel-button" @click="cancelResolve" :disabled="resolving">Cancel</button>
              <button class="confirm-resolve-button" @click="resolve" :disabled="resolving">
                {{ resolving ? 'Resolving...' : 'Mark as Resolved' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<style scoped>
.details-page {
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Outfit', 'Inter', sans-serif;
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
  font-weight: 600;
}
main {
  max-width: 650px;
  margin: 50px auto;
  padding: 20px;
}
.loading-box {
  text-align: center;
  font-size: 16px;
  color: #64748b;
  padding: 40px;
}
.emergency-card {
  background: white;
  border-radius: 18px;
  padding: 30px;
  box-shadow: 0 12px 35px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}
.icon {
  font-size: 40px;
}
.priority {
  display: inline-block;
  margin-top: 12px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.critical {
  background: #fee2e2;
  color: #dc2626;
}
.high {
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
  font-size: 24px;
  color: #0f172a;
}
.description {
  color: #4b5563;
  line-height: 1.6;
  font-size: 15px;
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
.info strong {
  color: #1e293b;
  font-size: 14px;
}
.waiting,
.accepted,
.resolved {
  padding: 13px;
  border-radius: 9px;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 15px;
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
  font-size: 11px;
  color: #1d4ed8;
}
.resolved {
  background: #dcfce7;
  color: #15803d;
}
.resolved small {
  display: block;
  margin-top: 6px;
  font-weight: 500;
}
.feedback-msg {
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
}
.feedback-msg.success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.feedback-msg.error {
  background: #fff5f5;
  color: #e11d48;
  border: 1px solid #fecdd3;
}
.help-button,
.resolve-button {
  width: 100%;
  margin-top: 10px;
  padding: 15px;
  border: none;
  border-radius: 9px;
  color: white;
  font-weight: 800;
  cursor: pointer;
  font-size: 15px;
}
.help-button {
  background: #16a34a;
}
.help-button:hover:not(:disabled) {
  background: #15803d;
}
.resolve-button {
  background: #2563eb;
}
.resolve-button:hover {
  background: #1d4ed8;
}
.help-button:disabled,
.resolve-button:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.resolve-area {
  margin-top: 10px;
}
.resolve-form {
  margin-top: 12px;
  padding: 18px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
}
.resolve-form h3 {
  margin: 0 0 6px;
  color: #1e3a8a;
}
.resolve-form p {
  margin: 0 0 12px;
  font-size: 13px;
  color: #475569;
}
.resolve-form textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.resolve-form textarea:focus {
  border-color: #2563eb;
}
.resolve-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.cancel-button,
.confirm-resolve-button {
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
.cancel-button {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}
.confirm-resolve-button {
  background: #16a34a;
  color: white;
}
.confirm-resolve-button:hover:not(:disabled) {
  background: #15803d;
}
.cancel-button:disabled,
.confirm-resolve-button:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.not-found {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.not-found button {
  margin-top: 15px;
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
</style>