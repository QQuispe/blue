import { defineNuxtPlugin } from '#app'
import Vue3Toastify, { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 3000,
    position: 'top-right',
    theme: 'dark',
    style: {
      '--toastify-color-dark': 'var(--color-bg-card)',
      '--toastify-color-success': 'var(--color-success)',
      '--toastify-color-error': 'var(--color-error)',
      '--toastify-color-warning': 'var(--color-warning)',
      '--toastify-text-color-dark': 'var(--color-text-primary)',
    }
  })
  
  return {
    provide: {
      toast
    }
  }
})
