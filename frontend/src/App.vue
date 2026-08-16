<script setup>
import { ref } from 'vue'

import Dashboard from './components/Dashboard.vue'
import ReportEmergency from './components/ReportEmergency.vue'

const showReportForm = ref(false)

const openReportForm = () => {
  showReportForm.value = true
}

const closeReportForm = () => {
  showReportForm.value = false
}
</script>

<template>

  <div class="app">

    <Dashboard
      @report-emergency="openReportForm"
    />

    <ReportEmergency
      v-if="showReportForm"
      @close="closeReportForm"
    />

  </div>

</template>

<style>

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  font-family:
    Inter,
    Arial,
    sans-serif;

  background: #f7f8fa;

  color: #1f2937;
}

button,
input,
textarea,
select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

.app {
  width: 100%;
  min-height: 100vh;
}

</style>