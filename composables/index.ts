// Auth
export { useAuth } from './auth/useAuth'
export { useAuthPage } from './auth/useAuthPage'

// Health
export { useBarcodeScanner } from './health/useBarcodeScanner'
export { useCheckins } from './health/useCheckins'
export { useFoodSearch } from './health/useFoodSearch'
export { useHealthData } from './health/useHealthData'
export { useHealthDate } from './health/useHealthDate'
export { useHealthMacros } from './health/useHealthMacros'
export { useHealthSetup } from './health/useHealthSetup'
export { useMacroFormatting } from './health/useMacroFormatting'
export { useMeals } from './health/useMeals'

// Finance
export {
  budgetCategories,
  categoryIcons,
  categoryColors,
  transactionCategories,
} from './finance/useBudgetCategories'
export { useBudgetProgress } from './finance/useBudgetProgress'
export { useCashFlowChart } from './finance/useCashFlowChart'
export { useFinanceData } from './finance/useFinanceData'

// UI
export { useAppError } from './ui/useAppError'
export { useEventBus, EVENTS } from './ui/useEventBus'
export { useMobile } from './ui/useMobile'
export { useSidebar } from './ui/useSidebar'
export { useTheme } from './ui/useTheme'
