import { ref } from 'vue'

type ErrorType = 'network' | 'auth' | 'server' | 'plaid' | 'unknown'

interface AppError {
  type: ErrorType
  message: string
  retryable: boolean
}

const error = ref<AppError | null>(null)
const isRetrying = ref(false)

export const useAppError = () => {
  const { logout } = useAuth()
  const router = useRouter()

  const handleError = async (err: unknown, options?: { retry?: () => Promise<void> }): Promise<void> => {
    const errorData = err as { statusCode?: number; data?: { error_code?: string } }
    const statusCode = errorData?.statusCode
    const errorCode = errorData?.data?.error_code

    if (statusCode === 401) {
      error.value = {
        type: 'auth',
        message: 'Session expired',
        retryable: false,
      }
      await logout()
      router.push('/login')
      return
    }

    if (statusCode === 0 || statusCode === undefined || statusCode >= 500) {
      error.value = {
        type: 'network',
        message: 'Connection lost',
        retryable: true,
      }

      if (options?.retry) {
        isRetrying.value = true
        try {
          await options.retry()
          error.value = null
        } catch {
          error.value = {
            type: 'server',
            message: 'Server unavailable',
            retryable: false,
          }
          await logout()
          router.push('/login')
        } finally {
          isRetrying.value = false
        }
      }
      return
    }

    if (errorCode === 'INVALID_PUBLIC_TOKEN' || errorCode === 'ITEM_LOGIN_REQUIRED') {
      error.value = {
        type: 'plaid',
        message: 'Bank connection needs to be refreshed',
        retryable: true,
      }
      return
    }

    error.value = {
      type: 'unknown',
      message: 'Something went wrong',
      retryable: false,
    }
  }

  const clearError = (): void => {
    error.value = null
    isRetrying.value = false
  }

  const retry = async (retryFn: () => Promise<void>): Promise<void> => {
    isRetrying.value = true
    try {
      await retryFn()
      error.value = null
    } catch (err) {
      await handleError(err)
    } finally {
      isRetrying.value = false
    }
  }

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
  }
}
