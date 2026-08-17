<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'

import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'

import { auth, db } from '../firebase/firebase'

const router = useRouter()

const email = ref('')
const password = ref('')

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const redirectUser = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid)
    const snapshot = await getDoc(userRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      if (data.role === 'volunteer') {
        router.push('/volunteer')
      } else if (data.role === 'help_seeker' || data.role === 'requester') {
        router.push('/crisis')
      } else {
        router.push('/onboarding')
      }
    } else {
      router.push('/onboarding')
    }
  } catch (error) {
    console.error('Error fetching role during login redirect:', error)
    router.push('/onboarding') // Fallback
  }
}

// ===============================
// LOGIN
// ===============================

const login = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter your email and password.'
    return
  }

  loading.value = true

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value
    )

    successMessage.value = 'Login successful!'
    await redirectUser(userCredential.user)
  } catch (error) {
    console.error('Login error:', error)

    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage.value = 'Invalid email or password.'
        break

      case 'auth/user-not-found':
        errorMessage.value = 'No account exists with this email.'
        break

      case 'auth/wrong-password':
        errorMessage.value = 'Incorrect password.'
        break

      case 'auth/invalid-email':
        errorMessage.value = 'Please enter a valid email address.'
        break

      case 'auth/too-many-requests':
        errorMessage.value = 'Too many login attempts. Please try again later.'
        break

      default:
        errorMessage.value = 'Login failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

// ===============================
// GOOGLE LOGIN
// ===============================

const googleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  loading.value = true

  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)

    successMessage.value = 'Google login successful!'
    await redirectUser(userCredential.user)
  } catch (error) {
    console.error('Google login error:', error)

    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage.value = 'Google login was cancelled.'
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage.value = 'Your browser blocked the Google login popup.'
    } else {
      errorMessage.value = 'Google login failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const goToSignup = () => {
  router.push('/signup')
}
</script>


<template>

  <div class="auth-page">

    <div class="auth-card">

      <!-- LOGO -->

      <div class="logo">
        🚨
      </div>


      <!-- TITLE -->

      <h1>
        AidMap
      </h1>

      <p class="subtitle">
        Disaster response & community aid
      </p>


      <!-- FORM -->

      <div class="form">

        <!-- EMAIL -->

        <label>
          Email
        </label>

        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="loading"
        />


        <!-- PASSWORD -->

        <label>
          Password
        </label>

        <input
          v-model="password"
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          :disabled="loading"
          @keyup.enter="login"
        />


        <!-- ERROR -->

        <div
          v-if="errorMessage"
          class="error-message"
        >
          ⚠️ {{ errorMessage }}
        </div>


        <!-- SUCCESS -->

        <div
          v-if="successMessage"
          class="success-message"
        >
          ✓ {{ successMessage }}
        </div>


        <!-- LOGIN -->

        <button
          class="primary-button"
          @click="login"
          :disabled="loading"
        >

          <span v-if="loading">
            Please wait...
          </span>

          <span v-else>
            Login
          </span>

        </button>


        <!-- DIVIDER -->

        <div class="divider">
          <span>or</span>
        </div>


        <!-- GOOGLE -->

        <button
          class="google-button"
          @click="googleLogin"
          :disabled="loading"
        >

          <span class="google-icon">
            G
          </span>

          Continue with Google

        </button>

      </div>


      <!-- CREATE ACCOUNT -->

      <p class="footer-text">

        New to AidMap?

        <button
          class="link-button"
          @click="goToSignup"
          :disabled="loading"
        >
          Create account
        </button>

      </p>

    </div>

  </div>

</template>


<style scoped>

.auth-page {

  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  background: #f8fafc;

  padding: 20px;

}


.auth-card {

  width: 420px;

  max-width: 100%;

  background: white;

  border-radius: 20px;

  padding: 40px;

  box-shadow:
    0 15px 45px rgba(0, 0, 0, .1);

  text-align: center;

}


.logo {

  font-size: 42px;

}


h1 {

  margin: 8px 0 4px;

  font-size: 30px;

}


.subtitle {

  margin: 0 0 30px;

  color: #6b7280;

}


.form {

  text-align: left;

}


label {

  display: block;

  margin: 15px 0 7px;

  font-size: 13px;

  font-weight: 650;

}


input {

  width: 100%;

  box-sizing: border-box;

  padding: 13px;

  border: 1px solid #d1d5db;

  border-radius: 9px;

  outline: none;

  font-size: 14px;

}


input:focus {

  border-color: #dc2626;

  box-shadow:
    0 0 0 3px rgba(220, 38, 38, .08);

}


input:disabled {

  background: #f3f4f6;

  cursor: not-allowed;

}


.primary-button,
.google-button {

  width: 100%;

  padding: 13px;

  margin-top: 18px;

  border-radius: 9px;

  cursor: pointer;

  font-weight: 700;

  font-size: 14px;

}


.primary-button {

  border: none;

  background: #dc2626;

  color: white;

}


.primary-button:hover {

  background: #b91c1c;

}


.primary-button:disabled,
.google-button:disabled {

  opacity: .6;

  cursor: not-allowed;

}


.google-button {

  background: white;

  border: 1px solid #d1d5db;

}


.google-button:hover {

  background: #f9fafb;

}


.google-icon {

  font-weight: 800;

  margin-right: 8px;

}


.divider {

  display: flex;

  align-items: center;

  gap: 10px;

  margin: 20px 0;

  color: #9ca3af;

}


.divider::before,
.divider::after {

  content: '';

  flex: 1;

  height: 1px;

  background: #e5e7eb;

}


.error-message {

  margin-top: 15px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #fef2f2;

  color: #b91c1c;

  font-size: 13px;

  text-align: left;

}


.success-message {

  margin-top: 15px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #f0fdf4;

  color: #15803d;

  font-size: 13px;

  text-align: left;

}


.footer-text {

  margin-top: 25px;

  color: #6b7280;

  font-size: 13px;

}


.link-button {

  border: none;

  background: none;

  color: #dc2626;

  cursor: pointer;

  font-weight: 700;

}


.link-button:hover {

  text-decoration: underline;

}


.link-button:disabled {

  opacity: .6;

  cursor: not-allowed;

}

</style>