// Mobile detection composable with global shared state
import { onMounted, onUnmounted } from 'vue'

const MOBILE_BREAKPOINT = 768 // px - phone sizes only

export const useMobile = () => {
  // Use useState for global shared state across all components
  const isMobile = useState('mobile:isMobile', () => false)
  const isMobileMenuOpen = useState('mobile:isMenuOpen', () => false)
  const activeMenu = useState<'finance' | 'health' | 'settings' | null>(
    'mobile:activeMenu',
    () => null
  )

  const checkMobile = () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  }

  const openMobileMenu = (menu: 'finance' | 'health' | 'settings') => {
    activeMenu.value = menu
    isMobileMenuOpen.value = true
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
    activeMenu.value = null
    document.body.style.overflow = ''
  }

  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })

  return {
    isMobile,
    isMobileMenuOpen,
    activeMenu,
    openMobileMenu,
    closeMobileMenu,
  }
}
