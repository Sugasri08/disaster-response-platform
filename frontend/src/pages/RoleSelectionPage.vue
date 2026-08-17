<script setup>
import { useRouter } from 'vue-router'
import { doc, setDoc } from 'firebase/firestore'

import { auth, db } from '../firebase/firebase'

const router = useRouter()

const selectRole = async (role) => {
  try {
    const user = auth.currentUser

    if (!user) {
      router.push('/login')
      return
    }

    // Save the user's role in Firestore
    await setDoc(
      doc(db, 'users', user.uid),
      {
        role: role,
        email: user.email,
        name: user.displayName || '',
        updatedAt: new Date()
      },
      {
        merge: true
      }
    )

    // Move to the correct dashboard
    if (role === 'volunteer') {
      router.push('/volunteer')
    } else {
      router.push('/crisis')
    }

  } catch (error) {
    console.error('Failed to save role:', error)
    alert('Unable to save your role. Please try again.')
  }
}
</script>

<template>
  <div class="role-page">

    <div class="role-card">

      <div class="logo">
        🚨
      </div>

      <h1>How will you use AidMap?</h1>

      <p>
        Choose how you want to participate
        during an emergency.
      </p>

      <div class="roles">

        <!-- REQUEST HELP -->

        <button
          class="role-option"
          @click="selectRole('requester')"
        >

          <div class="icon">
            🆘
          </div>

          <div>
            <h2>Request Help</h2>

            <span>
              I need assistance during a crisis.
            </span>
          </div>

          <strong>→</strong>

        </button>


        <!-- VOLUNTEER -->

        <button
          class="role-option volunteer"
          @click="selectRole('volunteer')"
        >

          <div class="icon">
            🙋
          </div>

          <div>
            <h2>Volunteer</h2>

            <span>
              I want to help people nearby.
            </span>
          </div>

          <strong>→</strong>

        </button>

      </div>

    </div>

  </div>
</template>

<style scoped>

.role-page {
  min-height: 100vh;
  background: #f8fafc;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
}

.role-card {
  width: 650px;
  max-width: 100%;

  background: white;

  padding: 40px;

  border-radius: 20px;

  box-shadow:
    0 15px 45px rgba(0, 0, 0, .1);
}

.logo {
  text-align: center;
  font-size: 40px;
}

h1 {
  text-align: center;
  margin-bottom: 8px;
}

.role-card > p {
  text-align: center;
  color: #6b7280;
  margin-bottom: 30px;
}

.roles {
  display: grid;
  gap: 15px;
}

.role-option {

  width: 100%;

  display: grid;

  grid-template-columns:
    55px 1fr 25px;

  align-items: center;

  text-align: left;

  gap: 15px;

  padding: 20px;

  border-radius: 15px;

  border: 1px solid #e5e7eb;

  background: white;

  cursor: pointer;

  transition: .2s;
}

.role-option:hover {

  border-color: #ef4444;

  background: #fff7f7;

  transform: translateY(-2px);
}

.role-option.volunteer:hover {

  border-color: #22c55e;

  background: #f0fdf4;
}

.icon {

  width: 50px;
  height: 50px;

  border-radius: 13px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #fee2e2;

  font-size: 25px;
}

.volunteer .icon {

  background: #dcfce7;
}

h2 {

  margin: 0 0 5px;

  font-size: 17px;
}

span {

  color: #6b7280;

  font-size: 13px;
}

</style>