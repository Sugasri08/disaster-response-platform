
<script setup>
import DisasterMap from './components/DisasterMap.vue'
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-icon">🚨</span>

        <div>
          <h1>AidMap</h1>
          <p>Disaster response & community aid</p>
        </div>
      </div>

      <button class="report-button">
        + Report Emergency
      </button>
    </header>

    <main class="map-container">
      <DisasterMap />
    </main>
  </div>
</template>

 

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #f7f8fa;
  color: #1f2937;
}

button {
  font-family: inherit;
}

.app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  height: 72px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 25px;
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.brand p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.report-button {
  border: none;
  background: #ef4444;
  color: white;
  padding: 11px 18px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.report-button:hover {
  background: #dc2626;
}

.map-container {
  flex: 1;
  position: relative;
}
</style>