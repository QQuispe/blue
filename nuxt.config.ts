// https://nuxt.com/docs/api/configuration/nuxt-config
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/icon'],

  icon: {
    size: '24px',
    mode: 'css',
  },

  // TypeScript configuration - add minimal TS support
  typescript: {
    strict: false,
    typeCheck: false,
    shim: false,
  },

  css: ['@/assets/base.css', '@/assets/main.css'],

  app: {
    head: {
      script: [
        {
          src: 'https://cdn.plaid.com/link/v2/stable/link-initialize.js', // Add Plaid script
          type: 'text/javascript',
          async: true, // Ensure it loads asynchronously
        },
        {
          innerHTML: `(function() {
            var s = localStorage.getItem('blue-theme-mode');
            var t = s || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.style.colorScheme = t;
          })();`,
          type: 'text/javascript',
        },
      ],
    },
  },

  // Enable experimental features for session support
  nitro: {
    experimental: {
      wasm: true,
    },
  },

  // Runtime config for session secrets
  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
    usdaApiKey: process.env.USDA_API_KEY,
    // Public config available on client-side
    public: {
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  },
})
