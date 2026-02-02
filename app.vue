<script setup>
const { isCollapsed } = useSidebar()
</script>

<template>
  <div class="app-wrapper">
    <Sidebar />
    <div class="main-layout" :class="{ 'sidebar-collapsed': isCollapsed }">
      <HeaderNav />
      <main class="main-content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<style>
.app-wrapper {
  display: flex;
  background: #0d0d0d;
  min-height: 100vh;
}

.main-layout {
  flex: 1;
  margin-left: 210px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.main-layout.sidebar-collapsed {
  margin-left: 75px;
}

.main-content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .main-layout {
    margin-left: 75px;
  }
}
</style>