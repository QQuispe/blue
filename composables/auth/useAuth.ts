// Composable for managing auth state - Uses v1 API
import type { AuthUser, LoginBody } from '~/types'

interface LoginResponse {
  success: true
  data: {
    user: AuthUser
    message?: string
  }
}

interface MeResponse {
  success: true
  data: {
    user: AuthUser | null
  }
}

interface LogoutResponse {
  success: true
  data: {
    success: boolean
  }
}

interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('user', () => null)
  const isLoading = useState<boolean>('authLoading', () => false)

  const fetchUser = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await $fetch<MeResponse>('/api/v1/auth/me', { credentials: 'include' })
      user.value = response.data.user
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

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const body: LoginBody = { username, password }
      const response = await $fetch<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body,
        credentials: 'include',
      })
      if (response.data.user) user.value = response.data.user
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.data?.error?.message || error.message || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await $fetch<LogoutResponse>('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
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
