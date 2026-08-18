<script setup>
import { ref } from 'vue'

import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

import {
  auth,
  db
} from '../firebase/firebase'

/* =========================================================
   EVENTS
========================================================= */

const emit = defineEmits([
  'close',
  'created'
])

/* =========================================================
   STATE
========================================================= */

const selectedType = ref('')
const selectedPriority = ref('Low')

const description = ref('')
const address = ref('')
const contact = ref('')
const additionalInfo = ref('')

const latitude = ref('')
const longitude = ref('')
const locationAccuracy = ref('')

const locationLoading = ref(false)
const locationShared = ref(false)

const submitting = ref(false)

const error = ref('')
const successMessage = ref('')

/* =========================================================
   HELP TYPES
========================================================= */

const helpTypes = [
  { type: 'Water', icon: '💧' },
  { type: 'Medical', icon: '🏥' },
  { type: 'Food', icon: '🍱' },
  { type: 'Rescue', icon: '🛟' },
  { type: 'Shelter', icon: '🏠' },
  { type: 'Power', icon: '⚡' }
]

/* =========================================================
   SELECT HELP TYPE
========================================================= */

const selectHelpType = type => {
  selectedType.value = type
  error.value = ''
}

/* =========================================================
   SHARE LIVE LOCATION
========================================================= */

const shareLiveLocation = () => {

  error.value = ''
  successMessage.value = ''

  if (!navigator.geolocation) {
    error.value =
      'Your browser does not support location services.'
    return
  }

  locationLoading.value = true

  navigator.geolocation.getCurrentPosition(

    position => {

      console.log(
        '📍 RAW BROWSER LOCATION:',
        position
      )

      /*
       * IMPORTANT:
       * Capture the values immediately.
       * Do NOT use any hardcoded coordinates.
       */

      const currentLatitude =
        position.coords.latitude

      const currentLongitude =
        position.coords.longitude

      const currentAccuracy =
        position.coords.accuracy

      console.log(
        '📍 GPS COORDINATES:',
        {
          latitude: currentLatitude,
          longitude: currentLongitude,
          accuracy: currentAccuracy
        }
      )

      /* -----------------------------------------------------
         VALIDATE GPS
      ----------------------------------------------------- */

      if (
        typeof currentLatitude !== 'number' ||
        typeof currentLongitude !== 'number' ||
        !Number.isFinite(currentLatitude) ||
        !Number.isFinite(currentLongitude)
      ) {

        locationLoading.value = false

        error.value =
          'The browser returned an invalid location.'

        return
      }

      /* -----------------------------------------------------
         VALIDATE RANGE
      ----------------------------------------------------- */

      if (
        currentLatitude < -90 ||
        currentLatitude > 90 ||
        currentLongitude < -180 ||
        currentLongitude > 180
      ) {

        locationLoading.value = false

        error.value =
          'The GPS coordinates are outside a valid range.'

        return
      }

      /*
       * 0,0 is technically valid geographically,
       * but it is not a realistic emergency location
       * for this application.
       */

      if (
        currentLatitude === 0 &&
        currentLongitude === 0
      ) {

        locationLoading.value = false

        error.value =
          'Your browser returned 0,0 instead of your actual location. Please enable GPS/location access and try again.'

        return
      }

      /* -----------------------------------------------------
         SAVE EXACT GPS VALUES
      ----------------------------------------------------- */

      latitude.value = currentLatitude
      longitude.value = currentLongitude

      locationAccuracy.value =
        Number.isFinite(currentAccuracy)
          ? currentAccuracy
          : ''

      locationShared.value = true

      locationLoading.value = false

      successMessage.value =
        'Your current live location has been captured successfully.'

      console.log(
        '✅ LOCATION SAVED IN FORM:',
        {
          latitude: latitude.value,
          longitude: longitude.value,
          accuracy: locationAccuracy.value
        }
      )
    },

    locationError => {

      locationLoading.value = false

      console.error(
        '❌ GEOLOCATION ERROR:',
        locationError
      )

      switch (locationError.code) {

        case 1:
          error.value =
            'Location permission was denied. Please allow location access for this website.'
          break

        case 2:
          error.value =
            'Your location could not be determined. Please check your device GPS/location settings.'
          break

        case 3:
          error.value =
            'Location request timed out. Please try again.'
          break

        default:
          error.value =
            'Unable to get your current location.'
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    }
  )
}

/* =========================================================
   CLEAR LOCATION
========================================================= */

const clearLocation = () => {

  latitude.value = ''
  longitude.value = ''
  locationAccuracy.value = ''

  locationShared.value = false

  successMessage.value = ''
}

/* =========================================================
   VALIDATE FORM
========================================================= */

const validateForm = () => {

  if (!selectedType.value) {

    error.value =
      'Please select the type of help needed.'

    return false
  }

  if (!description.value.trim()) {

    error.value =
      'Please describe the situation.'

    return false
  }

  if (!locationShared.value) {

    error.value =
      'Please share your live location before submitting.'

    return false
  }

  /*
   * IMPORTANT:
   * Take immutable copies BEFORE Firestore write.
   */

  const currentLatitude =
    Number(latitude.value)

  const currentLongitude =
    Number(longitude.value)

  console.log(
    '🔎 VALIDATING LOCATION BEFORE SUBMIT:',
    {
      latitude: currentLatitude,
      longitude: currentLongitude
    }
  )

  if (
    !Number.isFinite(currentLatitude) ||
    !Number.isFinite(currentLongitude)
  ) {

    error.value =
      'Invalid GPS coordinates. Please refresh your location.'

    return false
  }

  if (
    currentLatitude < -90 ||
    currentLatitude > 90
  ) {

    error.value =
      'Invalid latitude.'

    return false
  }

  if (
    currentLongitude < -180 ||
    currentLongitude > 180
  ) {

    error.value =
      'Invalid longitude.'

    return false
  }

  if (
    currentLatitude === 0 &&
    currentLongitude === 0
  ) {

    error.value =
      'Invalid 0,0 location. Please refresh your GPS location.'

    return false
  }

  return true
}

/* =========================================================
   SUBMIT EMERGENCY
========================================================= */

const submitEmergency = async () => {

  if (submitting.value) {
    return
  }

  error.value = ''
  successMessage.value = ''

  /* -------------------------------------------------------
     VALIDATE
  ------------------------------------------------------- */

  if (!validateForm()) {
    return
  }

  /* -------------------------------------------------------
     AUTH
  ------------------------------------------------------- */

  const user = auth.currentUser

  if (!user) {

    error.value =
      'Your session has expired. Please login again.'

    return
  }

  /*
   * VERY IMPORTANT:
   * Create immutable local variables.
   *
   * These are the exact coordinates that will be sent
   * to Firestore.
   */

  const emergencyLatitude =
    Number(latitude.value)

  const emergencyLongitude =
    Number(longitude.value)

  const emergencyAccuracy =
    locationAccuracy.value !== ''
      ? Number(locationAccuracy.value)
      : null

  console.log(
    '🚨 FINAL COORDINATES BEING SENT TO FIRESTORE:',
    {
      latitude: emergencyLatitude,
      longitude: emergencyLongitude,
      accuracy: emergencyAccuracy
    }
  )

  /* -------------------------------------------------------
     FINAL SAFETY CHECK
  ------------------------------------------------------- */

  if (
    !Number.isFinite(emergencyLatitude) ||
    !Number.isFinite(emergencyLongitude)
  ) {

    error.value =
      'Location became invalid before submission. Please refresh your location.'

    return
  }

  if (
    emergencyLatitude === 0 &&
    emergencyLongitude === 0
  ) {

    error.value =
      'Invalid 0,0 coordinates. Please refresh your location.'

    return
  }

  /* -------------------------------------------------------
     SUBMIT
  ------------------------------------------------------- */

  submitting.value = true

  try {

    /*
     * FIRESTORE OBJECT
     *
     * Notice that latitude/longitude use the immutable
     * emergencyLatitude/emergencyLongitude variables.
     */

    const emergencyData = {

      /* USER */

      requesterId:
        user.uid,

      requesterName:
        user.displayName ||
        user.email ||
        'Help Seeker',

      requesterEmail:
        user.email || null,


      /* EMERGENCY */

      type:
        selectedType.value,

      priority:
        selectedPriority.value,

      severity:
        selectedPriority.value,

      description:
        description.value.trim(),


      /* LOCATION */

      latitude:
        emergencyLatitude,

      longitude:
        emergencyLongitude,

      locationShared:
        true,

      locationAccuracy:
        emergencyAccuracy,

      locationSource:
        'browser-gps',

      address:
        address.value.trim() || null,


      /* CONTACT */

      contact:
        contact.value.trim() || null,


      /* ADDITIONAL INFO */

      additionalInfo:
        additionalInfo.value.trim() || null,


      /* STATUS */

      status:
        'pending',


      /* VOLUNTEER */

      assignedVolunteer:
        null,

      assignedVolunteerId:
        null,


      /* CRISIS */

      crisisId:
        'default',


      /* RESOLUTION */

      resolutionProof:
        null,

      resolutionNote:
        null,


      /* TIMESTAMPS */

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      acceptedAt:
        null,

      resolvedAt:
        null
    }

    /* -----------------------------------------------------
       FINAL DEBUG
    ----------------------------------------------------- */

    console.log(
      '🔥 FIRESTORE DATA:',
      {
        latitude:
          emergencyData.latitude,

        longitude:
          emergencyData.longitude,

        locationSource:
          emergencyData.locationSource
      }
    )

    /* -----------------------------------------------------
       FIRESTORE WRITE
    ----------------------------------------------------- */

    const docRef =
      await addDoc(
        collection(
          db,
          'emergencies'
        ),
        emergencyData
      )

    console.log(
      '✅ EMERGENCY CREATED:',
      docRef.id
    )

    console.log(
      '📍 STORED LOCATION:',
      {
        latitude:
          emergencyData.latitude,

        longitude:
          emergencyData.longitude
      }
    )

    /* -----------------------------------------------------
       CREATED OBJECT
    ----------------------------------------------------- */

    const emergency = {

      ...emergencyData,

      firestoreId:
        docRef.id,

      _id:
        docRef.id
    }

    /* -----------------------------------------------------
       SEND TO PARENT
    ----------------------------------------------------- */

    emit(
      'created',
      emergency
    )

    /* -----------------------------------------------------
       RESET
    ----------------------------------------------------- */

    resetForm()

    /* -----------------------------------------------------
       CLOSE
    ----------------------------------------------------- */

    emit('close')

  }

  catch (err) {

    console.error(
      '❌ FAILED TO CREATE EMERGENCY:',
      err
    )

    if (
      err?.code ===
      'permission-denied'
    ) {

      error.value =
        'Firestore permission denied. Check your Firebase security rules.'

    }

    else if (
      err?.code ===
      'unauthenticated'
    ) {

      error.value =
        'Your Firebase session expired. Please login again.'

    }

    else {

      error.value =
        err?.message ||
        'Failed to submit emergency.'
    }

  }

  finally {

    submitting.value = false

  }
}

/* =========================================================
   RESET
========================================================= */

const resetForm = () => {

  selectedType.value = ''
  selectedPriority.value = 'Low'

  description.value = ''
  address.value = ''
  contact.value = ''
  additionalInfo.value = ''

  latitude.value = ''
  longitude.value = ''

  locationAccuracy.value = ''

  locationShared.value = false

  successMessage.value = ''
}

/* =========================================================
   CLOSE
========================================================= */

const close = () => {

  if (submitting.value) {
    return
  }

  emit('close')
}
</script>