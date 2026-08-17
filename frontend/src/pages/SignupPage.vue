<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { doc, setDoc } from 'firebase/firestore'

import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'

import { auth, db } from '../firebase/firebase'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref('help_seeker')

const loading = ref(false)
const errorMessage = ref('')

const signup = async () => {
  errorMessage.value = ''

  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Please fill in all fields.'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  loading.value = true

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value
    )

    await updateProfile(userCredential.user, {
      displayName: name.value.trim()
    })

    // Save profile and role to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name: name.value.trim(),
      email: email.value.trim(),
      role: role.value,
      createdAt: new Date()
    })

    if (role.value === 'volunteer') {
      router.push('/onboarding')
    } else {
      router.push('/crisis')
    }
  } catch (error) {
    console.error(error)

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage.value = 'An account with this email already exists.'
        break

      case 'auth/invalid-email':
        errorMessage.value = 'Please enter a valid email address.'
        break

      case 'auth/weak-password':
        errorMessage.value = 'Password is too weak.'
        break

      default:
        errorMessage.value = 'Account creation failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const googleSignup = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const provider = new GoogleAuthProvider()

    await signInWithPopup(auth, provider)

    // Redirect to onboarding/role selection since Google doesn't choose a role beforehand
    router.push('/onboarding')
  } catch (error) {
    console.error(error)

    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage.value = 'Google sign-in was cancelled.'
    } else {
      errorMessage.value = 'Google sign-in failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

</script>

<template>
  <div class="auth-page">

    <div class="auth-card">

      <div class="logo">
        🚨
      </div>

      <h1>Create Account</h1>

      <p class="subtitle">
        Join the AidMap emergency response network
      </p>

      <div
        v-if="errorMessage"
        class="error-message"
      >
        {{ errorMessage }}
      </div>

      <div class="form">

        <label>Full Name</label>

        <input
          v-model="name"
          type="text"
          placeholder="Your name"
          :disabled="loading"
        />

        <label>Email</label>

        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          :disabled="loading"
        />

        <label>Password</label>

        <input
          v-model="password"
          type="password"
          placeholder="At least 6 characters"
          :disabled="loading"
        />

        <label>Confirm Password</label>

        <input
          v-model="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          :disabled="loading"
        />

        <label>I want to join as</label>
        <div class="role-selector">
          <label class="role-radio" :class="{ selected: role === 'help_seeker' }">
            <input type="radio" value="help_seeker" v-model="role" :disabled="loading" />
            <span>🆘 Help Seeker</span>
          </label>
          <label class="role-radio" :class="{ selected: role === 'volunteer' }">
            <input type="radio" value="volunteer" v-model="role" :disabled="loading" />
            <span>🙋 Volunteer</span>
          </label>
        </div>

        <button
          class="primary-button"
          @click="signup"
          :disabled="loading"
        >
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <button
          class="google-button"
          @click="googleSignup"
          :disabled="loading"
        >
          <span>G</span>
          Continue with Google
        </button>

      </div>

      <p class="footer-text">
        Already have an account?

        <button
          class="link-button"
          @click="goToLogin"
          :disabled="loading"
        >
          Login
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
  box-shadow: 0 15px 45px rgba(0, 0, 0, .1);
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
  margin: 0 0 25px;
  color: #6b7280;
}

.form {
  text-align: left;
}

label {
  display: block;
  margin: 14px 0 7px;
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
}

input:focus {
  border-color: #dc2626;
}

input:disabled {
  background: #f3f4f6;
}

.primary-button,
.google-button {
  width: 100%;
  padding: 13px;
  margin-top: 18px;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 700;
}

.primary-button {
  border: none;
  background: #dc2626;
  color: white;
}

.google-button {
  background: white;
  border: 1px solid #d1d5db;
}

.google-button span {
  font-weight: 800;
  margin-right: 8px;
}

.primary-button:disabled,
.google-button:disabled {
  opacity: .6;
  cursor: not-allowed;
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
  margin-bottom: 15px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
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

.link-button:disabled {
  opacity: .6;
}

.role-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 5px;
}

.role-radio {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;
  user-select: none;
}

.role-radio input {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.role-radio.selected {
  border-color: #dc2626;
  background: #fff7f7;
  color: #b91c1c;
}
</style>