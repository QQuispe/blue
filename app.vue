<script setup>
const { isCollapsed } = useSidebar()
const auth = useAuth()
const { initializeTheme } = useTheme()
const route = useRoute()

useHead({
  script: [
    {
      children: `
        (function() {
          var theme = localStorage.getItem('blue-theme-mode');
          if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          document.documentElement.setAttribute('data-theme', theme);
        })();
      `,
      type: 'text/javascript',
      tagPosition: 'head',
    },
  ],
})

const isAuthPage = computed(() => ['/login', '/register'].includes(route.path))

const showSidebar = computed(() => {
  if (isAuthPage.value) return false
  if (auth.isAuthenticated) return true
  return true
})

onMounted(() => {
  initializeTheme()
})
</script>

<template>
  <div class="app-wrapper">
    <Sidebar v-if="showSidebar" />
    <div
      class="main-layout"
      :class="{
        'sidebar-collapsed': showSidebar && isCollapsed,
        'sidebar-visible': showSidebar,
        'auth-layout': isAuthPage,
      }"
    >
      <HeaderNav v-if="!isAuthPage" />
      <main class="main-content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<style>
.app-wrapper {
  display: flex;
  background: var(--color-bg-page);
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

.main-layout.auth-layout {
  margin-left: 0 !important;
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
