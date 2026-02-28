// Single source of truth for finance data
// Lazy-loads data only when needed

export const useFinanceData = () => {
  // === Core Finance State ===
  const accounts = useState<any[]>('finance:accounts', () => [])
  const budgets = useState<any[]>('finance:budgets', () => [])
  const transactions = useState<any[]>('finance:transactions', () => [])
  const bills = useState<any[]>('finance:bills', () => [])
  const liabilities = useState<any[]>('finance:liabilities', () => [])

  // === Overview Data ===
  const overview = useState<any>('finance:overview', () => null)
  const netWorth = useState<any>('finance:netWorth', () => null)
  const cashFlow = useState<any>('finance:cashFlow', () => null)

  // === Guards ===
  const isInitialized = useState('finance:initialized', () => false)
  const isInitializing = useState('finance:initializing', () => false)

  // === Core Init (runs once when first used) ===
  const init = async (force = false) => {
    if (isInitialized.value || isInitializing.value) return
    isInitializing.value = true

    try {
      const [accountsRes, budgetsRes] = await Promise.all([
        $fetch('/api/finance/accounts', { ignoreResponseError: true }),
        $fetch('/api/finance/budgets', { ignoreResponseError: true }),
      ])

      // Handle unauthenticated case
      if (
        accountsRes &&
        typeof accountsRes === 'object' &&
        'statusCode' in accountsRes &&
        (accountsRes as any).statusCode === 401
      ) {
        console.log('[FinanceData] 401 auth required, will retry on next access')
        isInitializing.value = false
        return
      }

      accounts.value = (accountsRes as any)?.accounts || []
      budgets.value = (budgetsRes as any)?.budgets || []

      isInitialized.value = true
    } catch (err) {
      console.error('[FinanceData] Init failed:', err)
    } finally {
      isInitializing.value = false
    }
  }

  // === Lazy Data Fetching ===
  const fetchOverview = async () => {
    try {
      const res = await $fetch('/api/finance/overview', { ignoreResponseError: true })
      overview.value = res || null
    } catch (err) {
      console.error('[FinanceData] fetchOverview failed:', err)
    }
  }

  const fetchNetWorth = async () => {
    try {
      const res = await $fetch('/api/finance/net-worth', { ignoreResponseError: true })
      netWorth.value = res || null
    } catch (err) {
      console.error('[FinanceData] fetchNetWorth failed:', err)
    }
  }

  const fetchCashFlow = async () => {
    try {
      const res = await $fetch('/api/finance/cash-flow', { ignoreResponseError: true })
      cashFlow.value = res || null
    } catch (err) {
      console.error('[FinanceData] fetchCashFlow failed:', err)
    }
  }

  const fetchTransactions = async (params?: any) => {
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await $fetch(`/api/finance/transactions${query}`, { ignoreResponseError: true })
      transactions.value = (res as any)?.transactions || []
      return res
    } catch (err) {
      console.error('[FinanceData] fetchTransactions failed:', err)
      return null
    }
  }

  const fetchBills = async () => {
    try {
      const res = await $fetch('/api/finance/bills', { ignoreResponseError: true })
      bills.value = (res as any)?.bills || []
    } catch (err) {
      console.error('[FinanceData] fetchBills failed:', err)
    }
  }

  const fetchLiabilities = async () => {
    try {
      const res = await $fetch('/api/finance/liabilities', { ignoreResponseError: true })
      liabilities.value = (res as any)?.liabilities || []
    } catch (err) {
      console.error('[FinanceData] fetchLiabilities failed:', err)
    }
  }

  // === Refresh All ===
  const refresh = async () => {
    isInitialized.value = false
    await init(true)
  }

  const refreshAll = async () => {
    await Promise.all([
      fetchOverview(),
      fetchNetWorth(),
      fetchCashFlow(),
      fetchTransactions(),
      fetchBills(),
      fetchLiabilities(),
    ])
  }

  return {
    // State
    accounts,
    budgets,
    transactions,
    bills,
    liabilities,

    // Overview Data
    overview,
    netWorth,
    cashFlow,

    // Guards
    isInitialized,
    isInitializing,

    // Methods
    init,
    refresh,
    refreshAll,
    fetchOverview,
    fetchNetWorth,
    fetchCashFlow,
    fetchTransactions,
    fetchBills,
    fetchLiabilities,
  }
}
