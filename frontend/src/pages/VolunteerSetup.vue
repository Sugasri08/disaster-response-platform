<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const skills = ref([])

const available = ref(true)

const radius = ref(5)

const skillOptions = [
  {
    id: 'medical',
    label: 'Medical',
    icon: '🏥'
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: '🚗'
  },
  {
    id: 'supplies',
    label: 'Supplies',
    icon: '📦'
  },
  {
    id: 'shelter',
    label: 'Shelter',
    icon: '🏠'
  }
]

const toggleSkill = (skill) => {
  if (skills.value.includes(skill)) {
    skills.value =
      skills.value.filter(
        item => item !== skill
      )
  } else {
    skills.value.push(skill)
  }
}

const continueSetup = () => {
  if (skills.value.length === 0) {
    alert(
      'Please select at least one skill.'
    )

    return
  }

  const volunteerProfile = {
    skills: skills.value,
    available: available.value,
    radius: radius.value
  }

  localStorage.setItem(
    'aidmap-volunteer-profile',
    JSON.stringify(
      volunteerProfile
    )
  )

  router.push('/volunteer')
}
</script>

<template>
  <div class="setup-page">

    <div class="setup-card">

      <div class="step">
        VOLUNTEER SETUP
      </div>

      <h1>
        How can you help?
      </h1>

      <p class="subtitle">
        Your skills help AidMap match you
        with the right emergency requests.
      </p>

      <section>

        <h3>
          Select your skills
        </h3>

        <div class="skills">

          <button
            v-for="skill in skillOptions"
            :key="skill.id"
            :class="{
              selected:
                skills.includes(skill.id)
            }"
            @click="toggleSkill(skill.id)"
          >
            <span>
              {{ skill.icon }}
            </span>

            {{ skill.label }}

          </button>

        </div>

      </section>

      <section>

        <h3>
          Availability
        </h3>

        <button
          class="availability"
          :class="{ active: available }"
          @click="available = !available"
        >

          <span class="dot"></span>

          {{
            available
              ? 'Available to help'
              : 'Currently unavailable'
          }}

        </button>

      </section>

      <section>

        <h3>
          Response radius
        </h3>

        <div class="radius-row">

          <input
            v-model="radius"
            type="range"
            min="1"
            max="25"
          />

          <strong>
            {{ radius }} km
          </strong>

        </div>

      </section>

      <button
        class="continue"
        @click="continueSetup"
      >
        Continue →
      </button>

    </div>

  </div>
</template>

<style scoped>
.setup-page {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.setup-card {
  width: 600px;
  max-width: 100%;
  background: white;
  border-radius: 20px;
  padding: 35px;
  box-shadow: 0 15px 45px rgba(0,0,0,.1);
}

.step {
  color: #16a34a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

h1 {
  margin: 8px 0;
}

.subtitle {
  color: #6b7280;
  line-height: 1.5;
}

section {
  margin-top: 28px;
}

h3 {
  font-size: 14px;
  margin-bottom: 12px;
}

.skills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.skills button {
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
}

.skills button.selected {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #15803d;
}

.skills span {
  margin-right: 8px;
  font-size: 20px;
}

.availability {
  border: 1px solid #d1d5db;
  background: white;
  padding: 12px 15px;
  border-radius: 9px;
  cursor: pointer;
}

.availability.active {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  background: #22c55e;
  border-radius: 50%;
  margin-right: 8px;
}

.radius-row {
  display: flex;
  gap: 15px;
  align-items: center;
}

.radius-row input {
  flex: 1;
}

.continue {
  width: 100%;
  margin-top: 30px;
  padding: 14px;
  border: none;
  border-radius: 9px;
  background: #16a34a;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
</style>