import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { pool } from '~/server/db/index.js'

interface Transaction {
  id: number
  name: string
  amount: number
  date: string
  account_name?: string
}

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const category = query.category as string
  const startDate = query.startDate as string
  const endDate = query.endDate as string

  if (!category || !startDate || !endDate) {
    return { transactions: [] }
  }

  const result = await pool.query(
    `SELECT 
        t.id,
        t.name,
        t.amount,
        t.date,
        a.name as account_name
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 
       AND t.category ILIKE $2 || '%'
       AND t.date >= $3
       AND t.date <= $4
       AND t.amount > 0
     ORDER BY t.date DESC, t.created_at DESC`,
    [
      user.id,
      category.toUpperCase().replace(/ & /g, '_AND_').replace(/&/g, '_AND_').replace(/ /g, '_'),
      startDate,
      endDate,
    ]
  )

  return {
    transactions: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      date: row.date,
      account_name: row.account_name,
    })),
  }
})
