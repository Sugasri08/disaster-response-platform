<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
const router = useRouter()
const emergencies = ref([])
const loading = ref(true)
const errorMessage = ref('')
let unsubscribe = null
const loadMyEmergencies = async (user) => {
  try {
    loading.value = true
    errorMessage.value = ''
    const q = query(
      collection(db, 'emergencies'),
      where('requesterId', '==', user.uid)
    )
    const snapshot = await getDocs(q)
    const list = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      list.push({
        id: docSnap.id,
        ...data
      })
    })
    list.sort((a, b) => {
      const getTime = (value) => {
        if (!value) return 0
        if (value.toDate) return value.toDate().getTime()
        if (value.seconds) return value.seconds * 1000
        const date = new Date(value)
        return isNaN(date.getTime()) ? 0 : date.getTime()
      }
      return getTime(b.createdAt) - getTime(a.createdAt)
    })
    emergencies.value = list
  } catch (error) {
    console.error('Failed to load emergency requests:', error)
    console.error('Firestore error code:', error.code)
    console.error('Firestore error message:', error.message)
    errorMessage.value = 'Failed to load your emergency requests.'
  } finally {
    loading.value = false
  }
}
const startLiveTracking = (user) => {
  try {
    const q = query(
      collection(db, 'emergencies'),
      where('requesterId', '==', user.uid)
    )
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = []
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          list.push({
            id: docSnap.id,
            ...data
          })
        })
        list.sort((a, b) => {
          const getTime = (value) => {
            if (!value) return 0
            if (value.toDate) return value.toDate().getTime()
            if (value.seconds) return value.seconds * 1000
            const date = new Date(value)
            return isNaN(date.getTime()) ? 0 : date.getTime()
          }
          return getTime(b.createdAt) - getTime(a.createdAt)
        })
        emergencies.value = list
        loading.value = false
        errorMessage.value = ''
      },
      (error) => {
        console.error('Live tracking error:', error)
        errorMessage.value = 'Failed to load your emergency requests.'
        loading.value = false
      }
    )
  } catch (error) {
    console.error('Failed to start live tracking:', error)
    errorMessage.value = 'Failed to load your emergency requests.'
    loading.value = false
  }
}
const initializePage = async () => {
  try {
    let user = auth.currentUser
    if (!user) {
      await new Promise((resolve) => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
          user = currentUser
          unsubscribeAuth()
          resolve()
        })
      })
    }
    if (!user) {
      router.push('/login')
      return
    }
    await loadMyEmergencies(user)
    startLiveTracking(user)
  } catch (error) {
    console.error('Initialization error:', error)
    errorMessage.value = 'Unable to load your emergency requests.'
    loading.value = false
  }
}
const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now'
  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : timestamp.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp)
    if (isNaN(date.getTime())) return 'Just now'
    return date.toLocaleString()
  } catch {
    return 'Just now'
  }
}
const getSeverityClass = (severity) => {
  return severity ? String(severity).toLowerCase() : 'low'
}
const getStatusClass = (status) => {
  return status ? String(status).toLowerCase() : 'pending'
}
const pendingCount = () => {
  return emergencies.value.filter(
    item => String(item.status || '').toLowerCase() === 'pending'
  ).length
}
const acceptedCount = () => {
  return emergencies.value.filter(
    item => String(item.status || '').toLowerCase() === 'accepted'
  ).length
}
const inProgressCount = () => {
  return emergencies.value.filter(
    item => String(item.status || '').toLowerCase() === 'in_progress' ||
            String(item.status || '').toLowerCase() === 'in progress'
  ).length
}
const resolvedCount = () => {
  return emergencies.value.filter(
    item => String(item.status || '').toLowerCase() === 'resolved'
  ).length
}
onMounted(() => {
  initializePage()
})
onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
})
</script>
<template>
  <div class="my-emergencies-page">
    <header class="page-header">
      <button class="back-btn" @click="router.push('/crisis')">← Crisis Hub</button>
      <h2>My Emergency Requests</h2>
      <button class="new-request-btn" @click="router.push('/report-emergency')">🚨 New Request</button>
    </header>
    <main class="page-container">
      <div class="live-banner">
        <span class="live-dot"></span>
        <strong>Live tracking enabled</strong>
        <span>Updates appear automatically</span>
      </div>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-dot pending-dot"></div>
          <strong>{{ pendingCount() }}</strong>
          <span>Pending</span>
        </div>
        <div class="stat-card">
          <div class="stat-dot accepted-dot"></div>
          <strong>{{ acceptedCount() }}</strong>
          <span>Accepted</span>
        </div>
        <div class="stat-card">
          <div class="stat-dot progress-dot"></div>
          <strong>{{ inProgressCount() }}</strong>
          <span>In Progress</span>
        </div>
        <div class="stat-card">
          <div class="stat-dot resolved-dot"></div>
          <strong>{{ resolvedCount() }}</strong>
          <span>Resolved</span>
        </div>
      </div>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading your requests...</p>
      </div>
      <div v-else-if="errorMessage" class="error-box">
        ⚠️ {{ errorMessage }}
        <button class="retry-btn" @click="initializePage">Retry</button>
      </div>
      <div v-else-if="emergencies.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>No requests reported</h3>
        <p>You have not submitted any emergency help requests yet.</p>
        <button class="create-btn" @click="router.push('/report-emergency')">🚨 Report Emergency Now</button>
      </div>
      <div v-else class="requests-list">
        <div v-for="item in emergencies" :key="item.id" class="request-card" @click="router.push(`/emergency/${item.id}`)">
          <div class="card-header">
            <span class="type-badge">{{ item.type || 'Emergency' }}</span>
            <span class="severity-badge" :class="getSeverityClass(item.severity || item.priority)">
              {{ item.severity || item.priority || 'Low' }} Priority
            </span>
          </div>
          <p class="description">{{ item.description || 'No description provided.' }}</p>
          <div class="meta-row">
            <span class="date">🕒 {{ formatDate(item.createdAt) }}</span>
            <span class="status-badge" :class="getStatusClass(item.status)">
              {{ item.status || 'PENDING' }}
            </span>
          </div>
          <div v-if="item.address" class="address-row">📍 {{ item.address }}</div>
          <div v-if="item.contact" class="contact-row">📞 {{ item.contact }}</div>
          <div v-if="item.additionalInfo" class="info-row">ℹ️ {{ item.additionalInfo }}</div>
          <div v-if="item.assignedVolunteerName" class="volunteer-row">
            👤 Volunteer assigned: <strong>{{ item.assignedVolunteerName }}</strong>
          </div>
          <div v-if="item.assignedVolunteerId && !item.assignedVolunteerName" class="volunteer-row">
            👤 Volunteer assigned
          </div>
          <div class="view-details">View Details →</div>
        </div>
      </div>
    </main>
  </div>
</template>
<style scoped>
.my-emergencies-page{min-height:100vh;background:#f8fafc;font-family:'Outfit','Inter',sans-serif;color:#0f172a}.page-header{height:70px;background:white;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 24px}.page-header h2{font-weight:800;margin:0;font-size:22px}.back-btn{border:1px solid #e2e8f0;background:white;padding:8px 16px;border-radius:8px;font-weight:600;color:#475569;cursor:pointer}.back-btn:hover{background:#f1f5f9}.new-request-btn{background:#dc2626;color:white;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer}.new-request-btn:hover{background:#b91c1c}.page-container{max-width:875px;margin:35px auto;padding:0 20px 50px}.live-banner{display:flex;align-items:center;gap:9px;background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;border-radius:10px;padding:12px 16px;margin-bottom:15px;font-size:13px}.live-banner span:last-child{margin-left:auto;color:#059669}.live-dot{width:10px;height:10px;border-radius:50%;background:#34d399}.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.stat-card{height:65px;background:white;border:1px solid #dbe3ee;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}.stat-card strong{font-size:18px;margin-bottom:1px}.stat-card span{font-size:12px;color:#334155}.stat-dot{position:absolute;top:10px;width:19px;height:19px;border-radius:50%}.pending-dot{background:#f5c542}.accepted-dot{background:#4f86dc}.progress-dot{background:#8062bd}.resolved-dot{background:#4dcc8a}.loading-state,.empty-state{background:white;border-radius:16px;padding:50px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.04)}.spinner{width:40px;height:40px;border:4px solid #fee2e2;border-top-color:#dc2626;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px}@keyframes spin{to{transform:rotate(360deg)}}.empty-icon{font-size:48px;margin-bottom:15px}.empty-state h3{font-size:18px;margin:0 0 8px}.empty-state p{color:#64748b;margin:0 0 22px}.create-btn,.retry-btn{padding:10px 18px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer}.error-box{padding:16px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;font-size:14px}.retry-btn{margin-left:12px;background:#b91c1c;padding:7px 13px}.requests-list{display:flex;flex-direction:column;gap:15px}.request-card{background:white;border-radius:13px;padding:19px;border:1px solid #e2e8f0;box-shadow:0 3px 12px rgba(0,0,0,.03);cursor:pointer;transition:.2s}.request-card:hover{transform:translateY(-2px);border-color:#cbd5e1;box-shadow:0 7px 20px rgba(0,0,0,.06)}.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.type-badge{background:#f1f5f9;color:#334155;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:700}.severity-badge{padding:5px 10px;border-radius:6px;font-size:10px;font-weight:800;text-transform:uppercase}.severity-badge.low{background:#dcfce7;color:#166534}.severity-badge.medium{background:#fef3c7;color:#854d0e}.severity-badge.high{background:#ffedd5;color:#9a3412}.severity-badge.critical{background:#fee2e2;color:#991b1b}.description{font-size:14px;color:#334155;margin:0 0 15px;line-height:1.5}.meta-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b}.status-badge{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase}.status-badge.pending{background:#eff6ff;color:#1e40af}.status-badge.accepted{background:#dcfce7;color:#166534}.status-badge.in_progress{background:#ede9fe;color:#6d28d9}.status-badge.resolved{background:#f3f4f6;color:#374151}.address-row,.contact-row,.info-row{margin-top:10px;padding-top:9px;border-top:1px dashed #e2e8f0;font-size:12px;color:#475569}.volunteer-row{margin-top:10px;padding:10px;background:#eff6ff;color:#2563eb;border-radius:7px;font-size:12px}.view-details{text-align:right;margin-top:12px;color:#2563eb;font-size:12px;font-weight:700}@media(max-width:700px){.page-header{padding:0 12px}.page-header h2{font-size:16px}.back-btn,.new-request-btn{padding:7px 9px;font-size:11px}.page-container{padding:0 12px}.stats-row{grid-template-columns:repeat(2,1fr)}.live-banner{font-size:11px}.live-banner span:last-child{display:none}}
</style>