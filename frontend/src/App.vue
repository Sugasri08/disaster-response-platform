<script setup>
</script>

<template>
  <div class="app-shell">

    <!-- TOP BAR -->
    <header class="top-bar">
      <div class="brand">
        🚨 Disaster Response
      </div>

      <a
        href="https://sugasri-portfolio.ai.studio"
        target="_blank"
        rel="noopener noreferrer"
        class="portfolio-btn"
      >
        👩‍💻 My Portfolio ↗
      </a>
    </header>

    <!-- CURRENT PAGE -->
    <main class="app-content">
      <router-view />
    </main>

  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  background: #f8fafc;
}

.app-shell {
  min-height: 100vh;
  width: 100%;
}

/* =========================================================
   TOP BAR
========================================================= */

.top-bar {
  width: 100%;
  height: 60px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 24px;

  background: #ffffff;

  border-bottom: 1px solid #e2e8f0;

  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);

  position: relative;
  z-index: 9999;
}

/* =========================================================
   BRAND
========================================================= */

.brand {
  display: flex;
  align-items: center;

  color: #0f172a;

  font-size: 17px;
  font-weight: 800;
}

/* =========================================================
   PORTFOLIO BUTTON
========================================================= */

.portfolio-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 9px 15px;

  border-radius: 9px;

  background: #0f172a;
  color: #ffffff;

  text-decoration: none;

  font-size: 12px;
  font-weight: 700;

  transition:
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.portfolio-btn:hover {
  background: #1e293b;

  transform: translateY(-1px);

  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

/* =========================================================
   PAGE CONTENT
========================================================= */

.app-content {
  width: 100%;
  min-height: calc(100vh - 60px);
}

/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 600px) {
  .top-bar {
    height: auto;

    min-height: 60px;

    padding: 10px 14px;

    gap: 10px;
  }

  .brand {
    font-size: 14px;
  }

  .portfolio-btn {
    padding: 8px 11px;

    font-size: 11px;
  }

  .app-content {
    min-height: calc(100vh - 60px);
  }
}
</style>