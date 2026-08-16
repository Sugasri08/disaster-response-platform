import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// ------------------------------------
// GET EMERGENCIES
// ------------------------------------

export const getEmergencies = async () => {
  const response = await api.get('/emergencies')

  return response.data
}

// ------------------------------------
// CREATE EMERGENCY
// ------------------------------------

export const createEmergency = async (emergency) => {
  const response = await api.post(
    '/emergencies',
    emergency
  )

  return response.data
}

// ------------------------------------
// ACCEPT EMERGENCY
// ------------------------------------

export const acceptEmergency = async (
  emergencyId,
  volunteerId
) => {
  const response = await api.patch(
    `/emergencies/${emergencyId}/accept`,
    {
      volunteerId
    }
  )

  return response.data
}

// ------------------------------------
// RESOLVE EMERGENCY
// ------------------------------------

export const resolveEmergency = async (
  emergencyId
) => {
  const response = await api.patch(
    `/emergencies/${emergencyId}/resolve`
  )

  return response.data
}

export default api