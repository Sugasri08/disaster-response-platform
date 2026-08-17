<script setup>
import { computed,onMounted,onBeforeUnmount,ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc,getDoc,collection,getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth,db } from '../firebase/firebase'
import { getEmergencies } from '../services/api'
import DashboardStats from './DashboardStats.vue'
import FilterBar from './FilterBar.vue'
import EmergencyList from './EmergencyList.vue'
import DisasterMap from './DisasterMap.vue'

const router=useRouter()
const emit=defineEmits(['report-emergency'])
const emergencies=ref([])
const volunteerProfile=ref(null)
const loading=ref(true)
const error=ref('')
const statusFilter=ref('all')
const priorityFilter=ref('all')
const typeFilter=ref('all')
const mapLocation=ref(null)
let refreshInterval=null

const normalizeStatus=(status)=>String(status||'').toLowerCase()
const normalizePriority=(priority,severity)=>String(priority||severity||'low').toLowerCase()
const normalizeSkill=(skill)=>String(skill||'').trim().toLowerCase()

const isEmergencyEligible=(emergencyType,volunteerSkills)=>{
  const mapping={
    Medical:'medical',
    Transport:'transport',
    'Food/Supplies':'supplies',
    Food:'supplies',
    Power:'supplies',
    Water:'supplies',
    Shelter:'shelter',
    Rescue:'transport'
  }
  const requiredSkill=mapping[emergencyType]
  if(!requiredSkill)return true
  const skills=(volunteerSkills||[]).map(normalizeSkill)
  return skills.includes(requiredSkill)
}

const calculateDistance=(lat1,lon1,lat2,lon2)=>{
  if(lat1==null||lon1==null||lat2==null||lon2==null)return null
  const latitude1=Number(lat1)
  const longitude1=Number(lon1)
  const latitude2=Number(lat2)
  const longitude2=Number(lon2)
  if([latitude1,longitude1,latitude2,longitude2].some(Number.isNaN))return null
  const R=6371
  const dLat=(latitude2-latitude1)*Math.PI/180
  const dLon=(longitude2-longitude1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(latitude1*Math.PI/180)*Math.cos(latitude2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))
}

const loadEmergencies=async()=>{
  try{
    error.value=''
    const response=await getEmergencies()
    emergencies.value=response?.emergencies||[]
  }catch(err){
    console.warn('Backend unavailable. Loading emergencies from Firestore.',err)
    try{
      const snapshot=await getDocs(collection(db,'emergencies'))
      const list=[]
      snapshot.forEach(docSnap=>{
        list.push({
          _id:docSnap.id,
          firestoreId:docSnap.id,
          ...docSnap.data()
        })
      })
      emergencies.value=list
    }catch(fallbackError){
      console.error(fallbackError)
      error.value='Unable to load emergencies.'
    }
  }finally{
    loading.value=false
  }
}

const fetchVolunteerProfile=async()=>{
  const user=auth.currentUser
  if(!user)return
  try{
    const profileRef=doc(db,'users',user.uid)
    const profileSnap=await getDoc(profileRef)
    if(profileSnap.exists()){
      volunteerProfile.value=profileSnap.data()
    }
  }catch(error){
    console.error('Failed to load volunteer profile:',error)
  }
}

const handleLogout=async()=>{
  try{
    await signOut(auth)
    router.push('/login')
  }catch(error){
    console.error('Logout failed:',error)
  }
}

const assignedEmergencies=computed(()=>{
  const user=auth.currentUser
  if(!user)return[]
  return emergencies.value.filter(emergency=>
    emergency.assignedVolunteerId===user.uid||
    emergency.assignedVolunteer===user.uid
  )
})

const filteredEmergencies=computed(()=>{
  const profile=volunteerProfile.value
  const isAvailable=
    profile?.availability==='available'||
    profile?.available===true
  const skills=(profile?.skills||[]).map(normalizeSkill)

  return emergencies.value
    .filter(emergency=>{
      const status=normalizeStatus(emergency.status)
      const priority=normalizePriority(emergency.priority,emergency.severity)
      const isAssigned=
        emergency.assignedVolunteerId===auth.currentUser?.uid||
        emergency.assignedVolunteer===auth.currentUser?.uid

      if(status==='pending'&&!isAssigned){
        if(!isAvailable)return false
        if(!isEmergencyEligible(emergency.type,skills))return false
      }

      const statusMatches=
        statusFilter.value==='all'||
        status===String(statusFilter.value).toLowerCase()

      const priorityMatches=
        priorityFilter.value==='all'||
        priority===String(priorityFilter.value).toLowerCase()

      const typeMatches=
        typeFilter.value==='all'||
        emergency.type===typeFilter.value

      return statusMatches&&priorityMatches&&typeMatches
    })
    .map(emergency=>{
      let distance=null
      if(
        profile?.latitude!=null&&
        profile?.longitude!=null&&
        emergency.latitude!=null&&
        emergency.longitude!=null
      ){
        distance=calculateDistance(
          profile.latitude,
          profile.longitude,
          emergency.latitude,
          emergency.longitude
        )
      }
      return{
        ...emergency,
        priority:emergency.priority||emergency.severity||'Low',
        skillMatch:isEmergencyEligible(emergency.type,skills),
        distance
      }
    })
    .sort((a,b)=>{
      if(a.skillMatch&&!b.skillMatch)return-1
      if(!a.skillMatch&&b.skillMatch)return 1
      if(a.distance!=null&&b.distance!=null)return a.distance-b.distance
      if(a.distance!=null)return-1
      if(b.distance!=null)return 1
      return 0
    })
})

const handleUpdated=(emergency)=>{
  const index=emergencies.value.findIndex(item=>
    item._id===emergency._id||
    item.firestoreId===emergency.firestoreId
  )
  if(index!==-1){
    emergencies.value[index]={
      ...emergencies.value[index],
      ...emergency
    }
  }else{
    emergencies.value.push(emergency)
  }
}

const focusMap=(location)=>{
  if(!location)return
  mapLocation.value={
    latitude:location.latitude,
    longitude:location.longitude
  }
}

const resetFilters=()=>{
  statusFilter.value='all'
  priorityFilter.value='all'
  typeFilter.value='all'
}

const openReport=()=>{
  emit('report-emergency')
}

onMounted(async()=>{
  await fetchVolunteerProfile()
  await loadEmergencies()
  refreshInterval=setInterval(loadEmergencies,5000)
})

onBeforeUnmount(()=>{
  if(refreshInterval)clearInterval(refreshInterval)
})
</script>

<template>
<div class="dashboard">
<header class="dashboard-header">
<div>
<h1>AidMap</h1>
<p>Disaster response & community aid</p>
</div>
<div class="header-actions">
<button class="nav-btn" @click="router.push('/profile')">👤 Profile</button>
<button class="nav-btn" @click="router.push('/onboarding')">⚙️ Setup Profile</button>
<button class="logout-btn" @click="handleLogout">🚪 Logout</button>
</div>
</header>
<DashboardStats :emergencies="emergencies"/>
<main class="dashboard-content">
<section class="map-section">
<div class="section-title">
<div>
<h2>Live Emergency Map</h2>
<p>Click the map to select a location</p>
</div>
</div>
<div class="map-wrapper">
<DisasterMap :focus-location="mapLocation" @location-selected="mapLocation=$event"/>
</div>
</section>
<section class="requests-section">
<div v-if="assignedEmergencies.length>0" class="assigned-section">
<h3>📋 My Assigned Emergencies</h3>
<div class="assigned-list">
<div v-for="item in assignedEmergencies" :key="item._id||item.firestoreId" class="assigned-item">
<div class="assigned-header">
<strong>{{ item.type||'Emergency' }}</strong>
<span class="severity-badge" :class="normalizePriority(item.priority,item.severity)">
{{ item.priority||item.severity||'LOW' }}
</span>
</div>
<p>{{ item.description||'No description provided.' }}</p>
<div class="assigned-meta">
<span v-if="item.latitude!=null&&item.longitude!=null">
📍 {{ Number(item.latitude).toFixed(4) }}, {{ Number(item.longitude).toFixed(4) }}
</span>
<span v-else>📍 Location not provided</span>
<span>Status: <strong class="accepted-status">{{ item.status||'ACCEPTED' }}</strong></span>
</div>
<button class="details-btn" @click="router.push(`/emergency/${item.firestoreId||item._id}`)">View Details</button>
</div>
</div>
</div>
<FilterBar
:status="statusFilter"
:priority="priorityFilter"
:type="typeFilter"
@update:status="statusFilter=$event"
@update:priority="priorityFilter=$event"
@update:type="typeFilter=$event"
@reset="resetFilters"
/>
<div class="result-count">
Showing <strong>{{ filteredEmergencies.length }}</strong>
{{ filteredEmergencies.length===1?'emergency':'emergencies' }}
</div>
<EmergencyList
:emergencies="filteredEmergencies"
:loading="loading"
:error="error"
@updated="handleUpdated"
@focus-map="focusMap"
@refresh="loadEmergencies"
/>
</section>
</main>
</div>
</template>

<style scoped>
.dashboard{width:100%;min-height:100vh;background:#f7f8fa;padding:20px 24px}
.dashboard-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.dashboard-header h1{margin:0;font-size:24px;color:#111827}
.dashboard-header p{margin:4px 0 0;color:#6b7280;font-size:12px}
.header-actions{display:flex;gap:10px;align-items:center}
.nav-btn{border:1px solid #cbd5e1;background:white;padding:8px 12px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px}
.nav-btn:hover{background:#f8fafc}
.logout-btn{border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;padding:8px 12px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px}
.logout-btn:hover{background:#fee2e2}
.dashboard-content{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(350px,.8fr);gap:18px;align-items:start}
.map-section{background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden}
.section-title{padding:14px 17px;border-bottom:1px solid #e5e7eb}
.section-title h2{margin:0;font-size:16px;color:#111827}
.section-title p{margin:4px 0 0;color:#6b7280;font-size:11px}
.map-wrapper{height:620px}
.requests-section{min-width:0;max-height:720px;overflow-y:auto}
.result-count{margin-bottom:10px;color:#6b7280;font-size:12px}
.result-count strong{color:#111827}
.assigned-section{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin-bottom:18px}
.assigned-section h3{font-size:14px;font-weight:800;color:#1e293b;margin:0 0 10px}
.assigned-list{display:flex;flex-direction:column;gap:10px}
.assigned-item{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
.assigned-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.assigned-header strong{font-size:13px;color:#0f172a}
.assigned-item p{font-size:11.5px;color:#475569;margin:0 0 6px}
.assigned-meta{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;color:#64748b;margin-bottom:8px}
.accepted-status{color:#16a34a;text-transform:uppercase}
.severity-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px;text-transform:uppercase}
.severity-badge.critical{background:#fee2e2;color:#dc2626}
.severity-badge.high{background:#fee2e2;color:#dc2626}
.severity-badge.medium{background:#fef3c7;color:#d97706}
.severity-badge.low{background:#dcfce7;color:#16a34a}
.details-btn{width:100%;padding:6px;background:#2563eb;color:white;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer}
.details-btn:hover{background:#1d4ed8}
@media(max-width:1100px){.dashboard-content{grid-template-columns:1fr}.map-wrapper{height:500px}.requests-section{max-height:none}}
@media(max-width:600px){.dashboard{padding:12px}.dashboard-header{align-items:flex-start;flex-direction:column;gap:12px}.header-actions{width:100%;flex-wrap:wrap}.map-wrapper{height:420px}.assigned-meta{flex-direction:column}}
</style>