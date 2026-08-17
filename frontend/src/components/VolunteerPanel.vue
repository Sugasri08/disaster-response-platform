<script setup>

import {
  ref,
  computed,
  onMounted
} from 'vue'

import axios from 'axios'

const props = defineProps({

  volunteerId: {
    type: String,
    required: true
  },

  emergencies: {
    type: Array,
    default: () => []
  }

})

const emit = defineEmits([
  'volunteer-updated'
])


// ====================================
// SKILLS
// ====================================

const availableSkills = [

  {
    name: 'Medical',
    icon: '🚑'
  },

  {
    name: 'Transport',
    icon: '🚚'
  },

  {
    name: 'Supplies',
    icon: '📦'
  },

  {
    name: 'Shelter',
    icon: '🏠'
  }

]


const skills = ref([])

const available = ref(true)

const saving = ref(false)


// ====================================
// LOAD VOLUNTEER
// ====================================

onMounted(async () => {

  try {

    const response =
      await axios.get(
        `http://localhost:3000/api/volunteers/${props.volunteerId}`
      )

    if (
      response.data.success &&
      response.data.volunteer
    ) {

      skills.value =
        response.data.volunteer.skills || []

      available.value =
        response.data.volunteer.available

    }

  } catch (error) {

    console.log(
      'ℹ️ Volunteer profile not found yet'
    )

  }

})


// ====================================
// TOGGLE SKILL
// ====================================

const toggleSkill = async (
  skill
) => {

  if (
    skills.value.includes(skill)
  ) {

    skills.value =
      skills.value.filter(
        item => item !== skill
      )

  } else {

    skills.value.push(skill)

  }

  await saveVolunteer()

}


// ====================================
// SAVE VOLUNTEER
// ====================================

const saveVolunteer = async () => {

  saving.value = true

  try {

    await axios.post(
      'http://localhost:3000/api/volunteers',
      {
        volunteerId:
          props.volunteerId,

        skills:
          skills.value,

        available:
          available.value
      }
    )

    emit(
      'volunteer-updated',
      {
        volunteerId:
          props.volunteerId,

        skills:
          skills.value,

        available:
          available.value
      }
    )

  } catch (error) {

    console.error(
      '❌ Failed to save volunteer:',
      error.message
    )

  } finally {

    saving.value = false

  }

}


// ====================================
// AVAILABILITY
// ====================================

const toggleAvailability =
  async () => {

    available.value =
      !available.value

    await saveVolunteer()

  }


// ====================================
// MATCHING
// ====================================

const skillMap = {

  'Medical Aid':
    'Medical',

  'Search & Rescue':
    'Transport',

  'Potable Water':
    'Supplies',

  'Shelter':
    'Shelter'

}


const matchedEmergencies =
  computed(() => {

    return props.emergencies.filter(
      emergency => {

        if (
          emergency.status !==
          'pending'
        ) {
          return false
        }

        const requiredSkill =
          skillMap[
            emergency.type
          ]

        return (
          requiredSkill &&
          skills.value.includes(
            requiredSkill
          )
        )

      }
    )

  })


const myActiveTask =
  computed(() => {

    return props.emergencies.find(
      emergency =>
        emergency.status ===
          'accepted' &&
        emergency.assignedVolunteer ===
          props.volunteerId
    ) || null

  })


const needHelpCount =
  computed(() => {

    return props.emergencies.filter(
      emergency =>
        emergency.status ===
        'pending'
    ).length

  })


const criticalCount =
  computed(() => {

    return props.emergencies.filter(
      emergency =>
        emergency.status !==
          'resolved' &&
        emergency.priority ===
          'Critical'
    ).length

  })


const beingHelpedCount =
  computed(() => {

    return props.emergencies.filter(
      emergency =>
        emergency.status ===
        'accepted'
    ).length

  })


// ====================================
// ACCEPT
// ====================================

const acceptEmergency =
  async (emergency) => {

    try {

      const response =
        await axios.patch(

          `http://localhost:3000/api/emergencies/${emergency._id}/accept`,

          {
            volunteerId:
              props.volunteerId
          }

        )

      if (
        response.data.success
      ) {

        emit(
          'volunteer-updated',
          response.data.emergency
        )

        alert(
          '🙋 You are now responding to this emergency!'
        )

      }

    } catch (error) {

      console.error(
        '❌ Failed to accept emergency:',
        error
      )

      alert(
        error.response?.data?.message ||
        'Unable to accept this emergency.'
      )

    }

  }

</script>


<template>

  <div class="volunteer-panel">

    <!-- HEADER -->

    <div class="volunteer-title">

      <div class="volunteer-icon">
        🙋
      </div>

      <div>

        <h2>
          Volunteer Mode
        </h2>

        <p>
          Help people near you
        </p>

      </div>

    </div>


    <!-- AVAILABILITY -->

    <button
      class="availability"
      :class="{
        offline:
          !available
      }"
      @click="
        toggleAvailability
      "
    >

      <span
        class="availability-dot"
      ></span>

      {{
        available
          ? 'You are available to help'
          : 'You are currently unavailable'
      }}

    </button>


    <!-- SKILLS -->

    <div class="skills-section">

      <div class="section-title">
        Your skills
      </div>

      <div class="skills-grid">

        <button
          v-for="
            skill in availableSkills
          "
          :key="skill.name"
          class="skill-button"
          :class="{
            selected:
              skills.includes(
                skill.name
              )
          }"
          @click="
            toggleSkill(
              skill.name
            )
          "
        >

          <span>
            {{ skill.icon }}
          </span>

          {{ skill.name }}

        </button>

      </div>

      <div
        v-if="saving"
        class="saving"
      >
        Saving...
      </div>

    </div>


    <!-- STATS -->

    <div class="stats">

      <div class="stat-card">

        <strong class="orange">
          {{ needHelpCount }}
        </strong>

        <span>
          Need help
        </span>

      </div>

      <div class="stat-card">

        <strong class="red">
          {{ criticalCount }}
        </strong>

        <span>
          Critical
        </span>

      </div>

      <div class="stat-card">

        <strong class="blue">
          {{ beingHelpedCount }}
        </strong>

        <span>
          Being helped
        </span>

      </div>

    </div>


    <!-- MATCHED REQUESTS -->

    <div
      v-if="
        available &&
        matchedEmergencies.length
      "
      class="matched-section"
    >

      <div class="matched-title">

        🚨 Requests matching your skills

      </div>


      <div
        v-for="
          emergency in matchedEmergencies
        "
        :key="emergency._id"
        class="matched-request"
      >

        <div class="request-top">

          <strong>
            {{ emergency.type }}
          </strong>

          <span
            class="priority"
            :class="
              emergency.priority.toLowerCase()
            "
          >
            {{ emergency.priority }}
          </span>

        </div>

        <p>
          {{ emergency.description }}
        </p>

        <div class="request-location">

          📍

          {{
            Number(
              emergency.latitude
            ).toFixed(4)
          }},
          {{
            Number(
              emergency.longitude
            ).toFixed(4)
          }}

        </div>

        <button
          class="help-button"
          @click="
            acceptEmergency(
              emergency
            )
          "
        >

          🙋 I CAN HELP

        </button>

      </div>

    </div>


    <!-- ACTIVE TASK -->

    <div
      v-if="myActiveTask"
      class="active-task"
    >

      <div class="task-header">
        🙋 You're helping
      </div>

      <h3>
        🚨
        {{ myActiveTask.type }}
      </h3>

      <p>
        {{ myActiveTask.description }}
      </p>

      <div class="task-location">

        📍

        {{
          Number(
            myActiveTask.latitude
          ).toFixed(5)
        }},
        {{
          Number(
            myActiveTask.longitude
          ).toFixed(5)
        }}

      </div>

      <div class="task-status">
        🔵 Help is on the way
      </div>

    </div>


    <!-- NO SKILLS -->

    <div
      v-if="
        available &&
        skills.length === 0
      "
      class="instruction-box"
    >

      <div>
        💡
      </div>

      <p>
        Select your skills above to
        receive matching emergency
        requests.
      </p>

    </div>


    <!-- NO MATCHES -->

    <div
      v-else-if="
        available &&
        skills.length &&
        !matchedEmergencies.length &&
        !myActiveTask
      "
      class="instruction-box"
    >

      <div>
        🔎
      </div>

      <p>
        No requests currently match
        your skills. We'll keep
        checking.
      </p>

    </div>


    <!-- ID -->

    <div class="volunteer-id">

      Volunteer ID:

      <strong>
        {{ volunteerId }}
      </strong>

    </div>

  </div>

</template>


<style scoped>

.volunteer-panel {

  position: absolute;

  top: 28px;

  left: 42px;

  width: 365px;

  max-height: calc(100vh - 130px);

  overflow-y: auto;

  background: white;

  border-radius: 17px;

  padding: 18px;

  z-index: 500;

  box-shadow:
    0 12px 35px
    rgba(0,0,0,.18);

}

.volunteer-title {

  display: flex;

  align-items: center;

  gap: 12px;

  margin-bottom: 14px;

}

.volunteer-icon {

  width: 42px;

  height: 42px;

  border-radius: 12px;

  background: #ecfdf5;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 23px;

}

.volunteer-title h2 {

  margin: 0;

  font-size: 19px;

}

.volunteer-title p {

  margin: 3px 0 0;

  color: #6b7280;

  font-size: 13px;

}


/* AVAILABILITY */

.availability {

  width: 100%;

  border: none;

  background: #f0fdf4;

  color: #15803d;

  padding: 10px 12px;

  border-radius: 9px;

  font-size: 13px;

  font-weight: 600;

  display: flex;

  align-items: center;

  gap: 8px;

  margin-bottom: 15px;

  cursor: pointer;

  text-align: left;

}

.availability.offline {

  background: #f3f4f6;

  color: #6b7280;

}

.availability-dot {

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: #22c55e;

}

.offline
.availability-dot {

  background: #9ca3af;

}


/* SKILLS */

.skills-section {

  margin-bottom: 15px;

}

.section-title {

  font-size: 13px;

  font-weight: 700;

  margin-bottom: 9px;

}

.skills-grid {

  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 7px;

}

.skill-button {

  border:
    1px solid #e5e7eb;

  background: #fafafa;

  padding: 9px 7px;

  border-radius: 8px;

  cursor: pointer;

  font-size: 11px;

}

.skill-button span {

  margin-right: 3px;

}

.skill-button.selected {

  background: #ecfdf5;

  border-color: #86efac;

  color: #15803d;

  font-weight: 700;

}

.saving {

  margin-top: 5px;

  color: #9ca3af;

  font-size: 10px;

}


/* STATS */

.stats {

  display: grid;

  grid-template-columns:
    repeat(3,1fr);

  gap: 8px;

  margin-bottom: 14px;

}

.stat-card {

  border:
    1px solid #e5e7eb;

  border-radius: 9px;

  padding: 9px 4px;

  text-align: center;

}

.stat-card strong {

  display: block;

  font-size: 20px;

}

.stat-card span {

  font-size: 10px;

  color: #6b7280;

}

.orange {
  color: #f59e0b;
}

.red {
  color: #ef4444;
}

.blue {
  color: #2563eb;
}


/* MATCHED */

.matched-section {

  margin-bottom: 14px;

}

.matched-title {

  font-size: 12px;

  font-weight: 800;

  color: #b91c1c;

  margin-bottom: 8px;

}

.matched-request {

  border:
    1px solid #fecaca;

  background: #fffafa;

  border-radius: 10px;

  padding: 11px;

  margin-bottom: 8px;

}

.request-top {

  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 5px;

}

.request-top strong {

  font-size: 13px;

}

.priority {

  font-size: 9px;

  font-weight: 800;

  padding: 3px 5px;

  border-radius: 5px;

}

.priority.low {

  background: #dcfce7;

  color: #15803d;

}

.priority.medium {

  background: #fef3c7;

  color: #b45309;

}

.priority.critical {

  background: #fee2e2;

  color: #dc2626;

}

.matched-request p {

  margin: 7px 0;

  font-size: 11px;

  color: #4b5563;

  line-height: 1.4;

}

.request-location {

  font-size: 10px;

  color: #6b7280;

  margin-bottom: 8px;

}

.help-button {

  width: 100%;

  border: none;

  background: #16a34a;

  color: white;

  padding: 9px;

  border-radius: 7px;

  font-weight: 700;

  font-size: 11px;

  cursor: pointer;

}

.help-button:hover {

  background: #15803d;

}


/* ACTIVE TASK */

.active-task {

  border:
    1px solid #bfdbfe;

  background: #eff6ff;

  border-radius: 11px;

  padding: 13px;

  margin-bottom: 13px;

}

.task-header {

  color: #2563eb;

  font-size: 12px;

  font-weight: 700;

  margin-bottom: 8px;

}

.active-task h3 {

  margin: 0 0 7px;

  font-size: 16px;

}

.active-task p {

  margin: 8px 0;

  font-size: 12px;

  color: #374151;

}

.task-location {

  font-size: 11px;

  color: #6b7280;

}

.task-status {

  margin-top: 9px;

  padding: 8px;

  background: white;

  border-radius: 7px;

  text-align: center;

  color: #2563eb;

  font-size: 12px;

  font-weight: 650;

}


/* INSTRUCTIONS */

.instruction-box {

  background: #eff6ff;

  border-radius: 10px;

  padding: 11px;

  display: flex;

  gap: 9px;

  color: #1d4ed8;

  font-size: 11px;

  line-height: 1.45;

  margin-bottom: 13px;

}


/* ID */

.volunteer-id {

  font-size: 10px;

  color: #9ca3af;

  border-top:
    1px solid #f3f4f6;

  padding-top: 10px;

}


/* MOBILE */

@media (max-width:700px) {

  .volunteer-panel {

    left: 15px;

    right: 15px;

    width: auto;

    top: 80px;

  }

}

</style>