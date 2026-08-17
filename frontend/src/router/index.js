import { createRouter, createWebHistory } from 'vue-router'
import { auth, db } from '../firebase/firebase'
import { doc, getDoc } from 'firebase/firestore'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'
import RoleSelectionPage from '../pages/RoleSelectionPage.vue'
import CrisisDashboard from '../pages/CrisisDashboard.vue'
import VolunteerDashboard from '../pages/VolunteerDashboard.vue'
import EmergencyDetailPage from '../pages/EmergencyDetailPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import ReportEmergencyPage from '../pages/ReportEmergencyPage.vue'
import MyEmergenciesPage from '../pages/MyEmergenciesPage.vue'
import Dashboard from '../components/Dashboard.vue'
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/signup',
    name: 'Signup',
    component: SignupPage
  },
  {
    path: '/role-selection',
    name: 'RoleSelection',
    component: RoleSelectionPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: VolunteerDashboard,
    meta: { requiresAuth: true, role: 'volunteer' }
  },
  {
    path: '/crisis',
    name: 'Crisis',
    component: CrisisDashboard,
    meta: { requiresAuth: true, role: 'help_seeker' }
  },
  {
    path: '/report-emergency',
    name: 'ReportEmergency',
    component: ReportEmergencyPage,
    meta: { requiresAuth: true, role: 'help_seeker' }
  },
  {
    path: '/my-emergencies',
    name: 'MyEmergencies',
    component: MyEmergenciesPage,
    meta: { requiresAuth: true, role: 'help_seeker' }
  },
  {
    path: '/volunteer',
    name: 'Volunteer',
    component: Dashboard,
    meta: { requiresAuth: true, role: 'volunteer' }
  },
  {
    path: '/emergency/:id',
    name: 'EmergencyDetails',
    component: EmergencyDetailPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true }
  }
]
const router = createRouter({
  history: createWebHistory(),
  routes
})
const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid)
    const snapshot = await getDoc(userRef)
    if (snapshot.exists()) {
      return snapshot.data()
    }
  } catch (error) {
    console.error('Failed to load user profile:', error)
  }
  return null
}
router.beforeEach(async (to) => {
  // LOGIN AND SIGNUP MUST ALWAYS BE ACCESSIBLE
  if (to.path === '/login' || to.path === '/signup') {
    return true
  }
  // Public route
  if (!to.meta.requiresAuth) {
    return true
  }
  // Check authentication
  const user = auth.currentUser
  if (!user) {
    return '/login'
  }
  // Role-selection is allowed for any authenticated user
  if (to.path === '/role-selection') {
    return true
  }
  const profile = await getUserProfile(user.uid)
  const role = profile?.role || null
  // User has not selected a role
  if (!role) {
    return '/role-selection'
  }
  // VOLUNTEER
  if (role === 'volunteer') {
    const skills = profile?.skills || []
    const onboardingComplete = Array.isArray(skills) && skills.length > 0
    if (!onboardingComplete && to.path !== '/onboarding') {
      return '/onboarding'
    }
    if (to.meta.role && to.meta.role !== 'volunteer') {
      return '/volunteer'
    }
    return true
  }
  // HELP SEEKER
  if (role === 'help_seeker' || role === 'requester') {
    if (to.meta.role && to.meta.role !== 'help_seeker') {
      return '/crisis'
    }
    return true
  }
  // Unknown role
  return '/role-selection'
})
export default router