import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// Get all emergencies
export const getEmergencies = async () => {
  const response = await API.get('/emergencies')
  return response.data
}

// Create emergency
export const createEmergency = async (emergency) => {
  const response = await API.post(
    '/emergencies',
    emergency
  )

  return response.data
}

// Accept emergency
export const acceptEmergency = async (
  emergencyId,
  volunteerId
) => {
  const response = await API.patch(
    `/emergencies/${emergencyId}/accept`,
    {
      volunteerId
    }
  )

  return response.data
}

// Resolve emergency
export const resolveEmergency = async (
  emergencyId
) => {
  const response = await API.patch(
    `/emergencies/${emergencyId}/resolve`
  )

  return response.data
}

export default API