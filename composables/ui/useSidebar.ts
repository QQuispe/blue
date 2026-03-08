import { ref, type Ref } from 'vue'

const isCollapsed: Ref<boolean> = ref(false)

export const useSidebar = () => {
  const toggle = (): void => {
    isCollapsed.value = !isCollapsed.value
  }

  return {
    isCollapsed,
    toggle,
  }
}
