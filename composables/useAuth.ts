// Composable for managing auth state with TypeScript

// Define interfaces for types
interface User {
  id: number
  username: string
  email?: string
  isAdmin: boolean
}

interface LoginResponse {
  statusCode: number
  message: string
  user?: User
}

interface MeResponse {
  statusCode?: number
  message?: string
  user?: User | null
}

export const useAuth = () => {
  const user = useState<User | null>('user', () => null)
  const isLoading = useState<boolean>('authLoading', () => false)

  const fetchUser = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<MeResponse>('/api/auth/me', { credentials: 'include' })
      user.value = response.user || null
    } catch {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  if (import.meta.client && !user.value) {
    fetchUser()
  }

  const refreshUser = async (): Promise<void> => fetchUser()

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
        credentials: 'include',
      })
      if (response.user) user.value = response.user
      return response
    } catch (error: any) {
      // Extract error message from the response
      const errorMessage = error.data?.message || error.message || 'Login failed'
      return {
        statusCode: error.response?.status || 500,
        message: errorMessage,
        user: undefined,
      }
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // Ignore logout API errors
    }
    user.value = null
    localStorage.removeItem('session-start-time')
    await navigateTo('/login')
  }

  return {
    user,
    isLoading: readonly(isLoading),
    isAuthenticated: computed((): boolean => !!user.value),
    isAdmin: computed((): boolean => user.value?.isAdmin || false),
    fetchUser,
    refreshUser,
    login,
    logout,
  }
}
