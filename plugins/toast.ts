import { defineNuxtPlugin } from '#app'
import Vue3Toastify, { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 3000,
    position: 'top-right',
    theme: 'dark',
    style: {
      '--toastify-color-dark': '#151515',
      '--toastify-color-success': '#3EB489',
      '--toastify-color-error': '#ef4444',
      '--toastify-color-warning': '#f59e0b',
      '--toastify-text-color-dark': '#fff',
    }
  })
  
  return {
    provide: {
      toast
    }
  }
})
