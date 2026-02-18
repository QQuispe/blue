export default defineNuxtPlugin(() => {
  if (process.server) return

  const STORAGE_KEY = 'blue-theme-mode'
  const html = document.documentElement

  const stored = localStorage.getItem(STORAGE_KEY)
  let mode: 'dark' | 'light' = 'dark'

  if (stored) {
    mode = stored as 'dark' | 'light'
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    mode = prefersDark ? 'dark' : 'light'
  }

  html.setAttribute('data-theme', mode)
  html.style.colorScheme = mode
})
