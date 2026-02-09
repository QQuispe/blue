// Theme management composable
// Supports both dark/light mode and will support theme presets in the future

export type ColorMode = 'dark' | 'light'
export type ThemePreset = 'default' | 'atom' | 'github' | 'dracula' // Future support

interface ThemeState {
  mode: ColorMode
  preset: ThemePreset
}

const STORAGE_KEY = 'blue-theme-mode'

export const useTheme = () => {
  const mode = useState<ColorMode>('themeMode', () => 'dark')
  const preset = useState<ThemePreset>('themePreset', () => 'default')
  const isInitialized = useState<boolean>('themeInitialized', () => false)

  // Initialize theme from localStorage or system preference
  const initializeTheme = () => {
    if (process.server || isInitialized.value) return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      mode.value = stored as ColorMode
    } else {
      // Check system preference, default to dark
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      mode.value = prefersDark ? 'dark' : 'light'
    }

    applyTheme()
    isInitialized.value = true

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        mode.value = e.matches ? 'dark' : 'light'
        applyTheme()
      }
    })
  }

  // Apply theme to document
  const applyTheme = () => {
    if (process.server) return
    
    const html = document.documentElement
    html.setAttribute('data-theme', mode.value)
    
    // Also set color-scheme for native UI elements
    html.style.colorScheme = mode.value
  }

  // Toggle between dark and light
  const toggleMode = () => {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, mode.value)
    applyTheme()
  }

  // Set specific mode
  const setMode = (newMode: ColorMode) => {
    mode.value = newMode
    localStorage.setItem(STORAGE_KEY, newMode)
    applyTheme()
  }

  // Set theme preset (for future use)
  const setPreset = (newPreset: ThemePreset) => {
    preset.value = newPreset
    // Future: apply preset-specific variables
  }

  // Initialize on client-side
  if (process.client) {
    onMounted(() => {
      initializeTheme()
    })
  }

  return {
    mode: readonly(mode),
    preset: readonly(preset),
    isDark: computed(() => mode.value === 'dark'),
    isLight: computed(() => mode.value === 'light'),
    toggleMode,
    setMode,
    setPreset,
    initializeTheme
  }
}
