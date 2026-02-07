export default defineNuxtPlugin(() => {
  const LAST_ACTIVITY_KEY = 'session-last-activity'
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

    if (lastActivity > 0 && (now - lastActivity) > timeout) {
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
  }

  const stopSession = (): void => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }

    localStorage.removeItem(LAST_ACTIVITY_KEY)

    window.removeEventListener('mousedown', updateActivity)
    window.removeEventListener('keydown', updateActivity)
    window.removeEventListener('scroll', updateActivity)
    window.removeEventListener('touchstart', updateActivity)
    window.removeEventListener('mousemove', throttledMouseMove)
  }

  const throttledMouseMove = (): void => {
    const now = Date.now()
    if (now - lastMouseMove > 1000) {
      lastMouseMove = now
      updateActivity()
    }
  }

  watch(
    () => user.value,
    (newUser) => {
      if (newUser) {
        startSession()
      } else {
        stopSession()
      }
    },
    { immediate: true }
  )
})
