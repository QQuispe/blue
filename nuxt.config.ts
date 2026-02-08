// https://nuxt.com/docs/api/configuration/nuxt-config
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // TypeScript configuration - add minimal TS support
  typescript: {
    strict: false,
    typeCheck: false,
    shim: false
  },

  css: [
    '@/assets/base.css',
    '@/assets/main.css',
  ],

  app: {
    head: {
      script: [
        {
          src: 'https://cdn.plaid.com/link/v2/stable/link-initialize.js', // Add Plaid script
          type: 'text/javascript',
          async: true, // Ensure it loads asynchronously
        }
      ]
    }
  },

  // Enable experimental features for session support
  nitro: {
    experimental: {
      wasm: true
    }
  },

  // Runtime config for session secrets
  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
    // Public config available on client-side
    public: {
      logLevel: process.env.LOG_LEVEL || 'info'
    }
  }
});