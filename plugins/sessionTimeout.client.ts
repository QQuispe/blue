export default defineNuxtPlugin(() => {
  const LAST_ACTIVITY_KEY = 'session-last-activity'
  const TAB_HIDDEN_KEY = 'session-tab-hidden'
  let checkInterval: ReturnType<typeof setInterval> | null = null
  let lastMouseMove = 0

  const INACTIVITY_TIMEOUT_DEV = 0
  const INACTIVITY_TIMEOUT_PROD = 20 * 60 * 1000

  const getTimeout = (): number => {
    const isDev = process.env.NODE_ENV === 'development'
    return isDev ? INACTIVITY_TIMEOUT_DEV : INACTIVITY_TIMEOUT_PROD
  }

  const { logout, user } = useAuth()
  const router = useRouter()

  const updateActivity = (): void => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
  }

  const checkTimeout = (): void => {
    const timeout = getTimeout()

    // Skip check if timeout is disabled (0)
    if (timeout <= 0) return

    const stored = localStorage.getItem(LAST_ACTIVITY_KEY)
    const lastActivity = stored ? parseInt(stored) : 0
    const now = Date.now()

    if (lastActivity > 0 && now - lastActivity > timeout) {
      stopSession()
      logout()
      router.push('/login')
    }
  }

  const startSession = (): void => {
    updateActivity()

    if (checkInterval) {
      clearInterval(checkInterval)
    }

    checkInterval = setInterval(checkTimeout, 1000)

    window.addEventListener('mousedown', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('scroll', updateActivity, { passive: true })
    window.addEventListener('touchstart', updateActivity)
    window.addEventListener('mousemove', throttledMouseMove)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  const stopSession = (): void => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }

    localStorage.removeItem(LAST_ACTIVITY_KEY)
    localStorage.removeItem(TAB_HIDDEN_KEY)

    window.removeEventListener('mousedown', updateActivity)
    window.removeEventListener('keydown', updateActivity)
    window.removeEventListener('scroll', updateActivity)
    window.removeEventListener('touchstart', updateActivity)
    window.removeEventListener('mousemove', throttledMouseMove)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  const throttledMouseMove = (): void => {
    const now = Date.now()
    if (now - lastMouseMove > 1000) {
      lastMouseMove = now
      updateActivity()
    }
  }

  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab hidden - store the time when it was hidden
      localStorage.setItem(TAB_HIDDEN_KEY, Date.now().toString())
    } else {
      // Tab visible again - calculate elapsed hidden time
      const hiddenTime = localStorage.getItem(TAB_HIDDEN_KEY)
      if (hiddenTime) {
        const elapsedHidden = Date.now() - parseInt(hiddenTime)
        const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0')
        // Add the hidden time to the last activity timestamp
        // so the timeout doesn't count hidden time against the user
        localStorage.setItem(LAST_ACTIVITY_KEY, (lastActivity + elapsedHidden).toString())
        localStorage.removeItem(TAB_HIDDEN_KEY)
      }
    }
  }

  watch(
    () => user.value,
    newUser => {
      if (newUser) {
        startSession()
      } else {
        stopSession()
      }
    },
    { immediate: true }
  )
})
