<script setup>
import {
  onMounted,
  onBeforeUnmount,
  ref
} from 'vue'

import L from 'leaflet'

import 'leaflet/dist/leaflet.css'


const emit = defineEmits([
  'location-selected'
])


const mapContainer = ref(null)

let map = null

let selectedMarker = null


onMounted(() => {

  // Create map
  map = L.map(
    mapContainer.value
  ).setView(
    [12.8456, 80.2209],
    13
  )


  // OpenStreetMap tiles
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; OpenStreetMap contributors',

      maxZoom: 19
    }
  ).addTo(map)


  // Map click
  map.on(
    'click',
    (event) => {

      const {
        lat,
        lng
      } = event.latlng


      console.log(
        'Selected location:'
      )

      console.log(
        'Latitude:',
        lat
      )

      console.log(
        'Longitude:',
        lng
      )


      // Remove previous marker
      if (selectedMarker) {

        map.removeLayer(
          selectedMarker
        )

      }


      // Create new marker
      selectedMarker =
        L.marker([
          lat,
          lng
        ])
          .addTo(map)

          .bindPopup(`
            <b>Selected Location</b>
            <br>
            Latitude:
            ${lat.toFixed(5)}
            <br>
            Longitude:
            ${lng.toFixed(5)}
          `)

          .openPopup()


      // Send location to App.vue
      emit(
        'location-selected',
        {
          latitude: lat,
          longitude: lng
        }
      )

    }
  )

})


onBeforeUnmount(() => {

  if (map) {

    map.remove()

  }

})

</script>


<template>

  <div
    ref="mapContainer"
    class="map"
  ></div>

</template>


<style scoped>

.map {
  width: 100%;

  height: 100%;
}

</style>