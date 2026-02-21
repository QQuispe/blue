import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { getAccountsByUserId } from '~/server/db/queries/accounts'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const accounts = await getAccountsByUserId(user.id)

  return {
    accounts: accounts.map((acc: any) => ({ id: acc.id, name: acc.name })),
  }
})

function getDateFromPreset(preset: string | undefined): string | undefined {
  if (!preset) return undefined

  const today = new Date()
  let days = 0

  switch (preset) {
    case '7d':
      days = 7
      break
    case '30d':
      days = 30
      break
    case '90d':
      days = 90
      break
    case 'mtd':
      today.setDate(1)
      return today.toISOString().split('T')[0]
    case 'lm':
      today.setMonth(today.getMonth() - 1)
      today.setDate(1)
      return today.toISOString().split('T')[0]
    case 'ytd':
      today.setMonth(0)
      today.setDate(1)
      return today.toISOString().split('T')[0]
    default:
      days = 30
  }

  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}
