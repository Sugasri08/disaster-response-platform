import axios from 'axios'

const API_URL =
  'http://localhost:3000/api'

export const registerVolunteer = async (
  volunteer
) => {

  const response =
    await axios.post(
      `${API_URL}/volunteers`,
      volunteer
    )

  return response.data
}


export const updateVolunteer = async (
  volunteerId,
  data
) => {

  const response =
    await axios.patch(
      `${API_URL}/volunteers/${volunteerId}`,
      data
    )

  return response.data
}


export const getVolunteers = async () => {

  const response =
    await axios.get(
      `${API_URL}/volunteers`
    )

  return response.data
}


export const getMatchedEmergencies =
  async (
    volunteerId
  ) => {

    const response =
      await axios.get(
        `${API_URL}/volunteers/${volunteerId}/matches`
      )

    return response.data
  }