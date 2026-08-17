import { createRouter, createWebHistory } from 'vue-router'

import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/firebase'

import LoginPage from '../pages/LoginPage.vue'
import RoleSelectionPage from '../pages/RoleSelectionPage.vue'
import CrisisDashboard from '../pages/CrisisDashboard.vue'
import EmergencyDetailPage from '../pages/EmergencyDetailPage.vue'
import VolunteerDashboard from '../pages/VolunteerDashboard.vue'
import ProfilePage from '../pages/ProfilePage.vue'


const routes = [

  {
    path: '/',
    redirect: '/login'
  },

  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: {
      guestOnly: true
    }
  },

  {
    path: '/role-selection',
    name: 'RoleSelection',
    component: RoleSelectionPage,
    meta: {
      requiresAuth: true
    }
  },

  {
    path: '/crisis',
    name: 'CrisisDashboard',
    component: CrisisDashboard,
    meta: {
      requiresAuth: true
    }
  },

  {
    path: '/emergency/:id',
    name: 'EmergencyDetail',
    component: EmergencyDetailPage,
    props: true,
    meta: {
      requiresAuth: true
    }
  },

  {
    path: '/volunteer',
    name: 'VolunteerDashboard',
    component: VolunteerDashboard,
    meta: {
      requiresAuth: true
    }
  },

  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: {
      requiresAuth: true
    }
  }

]


const router = createRouter({

  history: createWebHistory(),

  routes

})


/*
  Firebase initially needs a moment to determine
  whether the user is logged in.
*/

const getCurrentUser = () => {

  return new Promise((resolve) => {

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {

        unsubscribe()

        resolve(user)

      }
    )

  })

}


/*
  ROUTER AUTH GUARD
*/

router.beforeEach(async (to) => {

  const user = await getCurrentUser()


  // User must be logged in
  // to access protected pages

  if (
    to.meta.requiresAuth &&
    !user
  ) {

    return {
      path: '/login'
    }

  }


  // Logged-in users shouldn't
  // go back to login page

  if (
    to.meta.guestOnly &&
    user
  ) {

    return {
      path: '/role-selection'
    }

  }


  return true

})


export default router