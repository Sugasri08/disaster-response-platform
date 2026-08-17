import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase'

export const logout = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout failed:', error)
    throw error
  }
}