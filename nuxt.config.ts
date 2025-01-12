// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

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
  }
});