<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)

const login = async () => {
  if (!email.value || !password.value) {
    alert('Please enter your email and password.')
    return
  }

  loading.value = true

  try {
    /*
      Firebase authentication will be connected here.

      For now we store a temporary login state
      so we can build and test the application.
    */

    localStorage.setItem(
      'aidmap-user-email',
      email.value
    )

    router.push('/role-selection')
  } finally {
    loading.value = false
  }
}

const googleLogin = () => {
  /*
    Firebase Google authentication will be connected here.
  */

  localStorage.setItem(
    'aidmap-user-email',
    'google-user'
  )

  router.push('/role-selection')
}
</script>

<template>
  <div class="auth-page">

    <div class="auth-card">

      <div class="logo">
        🚨
      </div>

      <h1>AidMap</h1>

      <p class="subtitle">
        Disaster response & community aid
      </p>

      <div class="form">

        <label>Email</label>

        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
        />

        <label>Password</label>

        <input
          v-model="password"
          type="password"
          placeholder="Enter your password"
        />

        <button
          class="primary-button"
          @click="login"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Login' }}
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <button
          class="google-button"
          @click="googleLogin"
        >
          <span>G</span>
          Continue with Google
        </button>

      </div>

      <p class="footer-text">
        New to AidMap?
        <button
          class="link-button"
          @click="router.push('/role-selection')"
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
  box-shadow: 0 15px 45px rgba(0,0,0,.1);
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
  padding: 13px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  outline: none;
}

input:focus {
  border-color: #dc2626;
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
</style>