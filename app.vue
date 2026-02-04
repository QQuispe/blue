<script setup>
const { isCollapsed } = useSidebar()
const auth = useAuth()

// Public routes where sidebar should be hidden
const publicRoutes = ['/login', '/register']

// Determine if sidebar should be shown
const showSidebar = computed(() => {
  const route = useRoute()
  if (publicRoutes.includes(route.path)) {
    return false
  }
  
  if (auth.isAuthenticated) {
    return true
  }
  
  return true
})
</script>

<template>
  <div class="app-wrapper">
    <!-- Show sidebar based on authentication state -->
    <Sidebar v-if="showSidebar" />
    <div class="main-layout" :class="{ 
      'sidebar-collapsed': showSidebar && isCollapsed,
      'sidebar-visible': showSidebar 
    }">
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
  margin-left: 0;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  min-height: 100vh;
}

.main-layout.sidebar-visible {
  margin-left: 210px;
}

.main-layout.sidebar-collapsed {
  margin-left: 75px;
}

.main-content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  width: 100%;
}

@media (max-width: 768px) {
  .main-layout.sidebar-visible {
    margin-left: 75px;
  }
}
</style>