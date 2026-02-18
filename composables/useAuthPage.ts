import { ref, onMounted } from 'vue'

/**
 * Composable to handle initial page load styling
 * Prevents flash of unstyled content (FOUC) during auth pages
 */
export function useAuthPage() {
  const isReady = ref(false)

  onMounted(() => {
    // Use double RAF to ensure styles are fully computed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isReady.value = true
      })
    })
  })

  return { isReady }
}
