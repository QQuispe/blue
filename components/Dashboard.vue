<script setup>
import BalanceCard from "./cards/BalanceCard.vue";
import Welcome from "./Welcome.vue";
</script>
<template>
  <div class="page-container">
    <div>
      <Welcome />    
    </div>
    <div class="dashboard">
      <!-- Main Content -->
      <div class="main-content">
        <main class="grid-container">
          <div class="card">
            <BalanceCard />
          </div>
          <div class="card">Section 2</div>
          <div class="card">Section 3</div>
          <div class="card">Section 4</div>
          <div class="card">Section 5</div>
          <div class="card">Section 6</div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  /* min-height: 100vh; */
  display: flex;
  flex-direction: column;
}

.welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  width: 100%;
}

/* Layout */
.dashboard {
  display: flex;
  /* background: #f4f4f4; */
}

@media (min-width: 768px) {
  .sidebar {
    display: block;
  }
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Grid Layout */
.grid-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 0 20px 20px 20px;
}

@media (min-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Card Style */
.card {
  background: rgb(64, 64, 64);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
