import { createRouter, createWebHistory } from 'vue-router'

import Login from '../pages/Login.vue'
import RoleSelection from '../pages/RoleSelection.vue'
import VolunteerSetup from '../pages/VolunteerSetup.vue'
import CrisisHome from '../pages/CrisisHome.vue'
import VolunteerDashboard from '../pages/VolunteerDashboard.vue'
import EmergencyDetails from '../pages/EmergencyDetails.vue'
import Profile from '../pages/Profile.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },

  {
    path: '/login',
    name: 'Login',
    component: Login
  },

  {
    path: '/role-selection',
    name: 'RoleSelection',
    component: RoleSelection
  },

  {
    path: '/volunteer-setup',
    name: 'VolunteerSetup',
    component: VolunteerSetup
  },

  {
    path: '/crisis',
    name: 'CrisisHome',
    component: CrisisHome
  },

  {
    path: '/volunteer',
    name: 'VolunteerDashboard',
    component: VolunteerDashboard
  },

  {
    path: '/emergency/:id',
    name: 'EmergencyDetails',
    component: EmergencyDetails,
    props: true
  },

  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router