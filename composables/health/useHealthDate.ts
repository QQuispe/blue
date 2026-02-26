export const useHealthDate = () => {
  const userTimezone = useState<string>('healthTimezone', () => 'America/New_York')
  const selectedDate = useState<string>('healthSelectedDate', () => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const year = parts.find(p => p.type === 'year')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    return `${year}-${month}-${day}`
  })

  const fetchUserTimezone = async () => {
    try {
      const res = await fetch('/api/user/settings', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        userTimezone.value = data.settings?.timezone || 'America/New_York'
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const getLocalDateString = (date: Date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone.value,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find(p => p.type === 'year')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    return `${year}-${month}-${day}`
  }

  const getYesterdayDate = () => {
    const now = new Date()
    now.setDate(now.getDate() - 1)
    return getLocalDateString(now)
  }

  const getDateNDaysAgo = (n: number) => {
    const now = new Date()
    now.setDate(now.getDate() - n)
    return getLocalDateString(now)
  }

  const setSelectedDate = (date: string) => {
    selectedDate.value = date
  }

  const formatDateForApi = (date: Date = new Date()) => {
    return getLocalDateString(date)
  }

  return {
    userTimezone,
    selectedDate,
    fetchUserTimezone,
    getLocalDateString,
    getYesterdayDate,
    getDateNDaysAgo,
    setSelectedDate,
    formatDateForApi,
  }
}
