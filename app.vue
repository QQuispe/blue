<script setup>
const { isCollapsed } = useSidebar()
const auth = useAuth()
const { initializeTheme } = useTheme()
const route = useRoute()
const { isMobile } = useMobile()

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
  if (isMobile.value) return false // Hide sidebar on mobile
  if (auth.isAuthenticated) return true
  return true
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
        'mobile-layout': isMobile && !isAuthPage,
      }"
    >
      <HeaderNav v-if="!isAuthPage" />
      <main class="main-content">
        <NuxtPage />
      </main>
    </div>

    <!-- Mobile Navigation - ClientOnly to prevent hydration mismatches -->
    <ClientOnly>
      <MobileBottomNav v-if="isMobile && !isAuthPage" />
      <MobileMenu v-if="isMobile && !isAuthPage" />
    </ClientOnly>
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

/* Mobile Layout Styles */
.main-layout.mobile-layout {
  margin-left: 0 !important;
}

.main-layout.mobile-layout .main-content {
  padding-bottom: 64px; /* Space for bottom nav */
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .main-layout.mobile-layout .main-content {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 768px) {
  .main-layout.sidebar-visible {
    margin-left: 0 !important; /* Hide sidebar completely on mobile */
  }

  .main-layout:not(.auth-layout) {
    margin-left: 0 !important;
  }
}
</style>
