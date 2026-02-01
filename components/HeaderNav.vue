<script setup>
const { user, isAuthenticated, logout } = useAuth();
</script>

<template>
  <header class="header">
    <div class="header-left">
      <img alt="Blue Finance" class="logo" src="~/public/logo.svg" width="25" height="25" />
      <span class="brand">Blue</span>
    </div>
    
    <nav class="nav">
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/about">About</NuxtLink>
    </nav>
    
    <div class="header-right">
      <template v-if="isAuthenticated">
        <span class="username">{{ user?.username }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </template>
      <template v-else>
        <NuxtLink to="/login" class="login-link">Sign In</NuxtLink>
      </template>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #181818;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  color: #18ffc1;
  font-weight: 600;
  font-size: 1.25rem;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.2s;
}

.nav a:hover {
  color: #18ffc1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
}

.logout-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.login-link {
  color: #18ffc1;
  text-decoration: none;
  font-size: 0.875rem;
  padding: 6px 12px;
  border: 1px solid #18ffc1;
  border-radius: 4px;
  transition: all 0.2s;
}

.login-link:hover {
  background: #18ffc1;
  color: #181818;
}
</style>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #f8f9fa;
}
</style>
