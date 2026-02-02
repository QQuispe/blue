import { ref } from 'vue'

const isCollapsed = ref(false)

export const useSidebar = () => {
  const toggle = () => {
    isCollapsed.value = !isCollapsed.value
  }

  return {
    isCollapsed,
    toggle
  }
}
