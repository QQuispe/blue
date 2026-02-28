import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { plaidClient } from '~/server/api/plaid/plaid'
import { pool } from '~/server/db/index'
import { decrypt } from '~/server/utils/crypto'

interface LiabilityBill {
  accountId: string
  name: string
  type: 'credit' | 'student' | 'mortgage'
  balance: number
  minimumPayment: number
  nextPaymentDueDate: string
  lastPaymentDate?: string
  apr?: number
}

export default defineEventHandler(async event => {
  const startTime = Date.now()

  try {
    const user = await requireAuth(event)

    const itemsResult = await pool.query(
      `SELECT i.id, i.plaid_item_id, i.plaid_access_token 
       FROM items i
       WHERE i.user_id = $1`,
      [user.id]
    )

    const allLiabilities: LiabilityBill[] = []

    for (const item of itemsResult.rows) {
      const accessToken = decrypt(item.plaid_access_token)
      if (!accessToken) {
        continue
      }

      try {
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: accessToken,
        })

        const liabilities = liabilitiesResponse.data.liabilities
        const accounts = liabilitiesResponse.data.accounts

        for (const credit of liabilities.credit || []) {
          if (!credit.account_id) continue
          const account = accounts.find(a => a.account_id === credit.account_id)
          if (!account || !credit.next_payment_due_date) continue

          allLiabilities.push({
            accountId: credit.account_id,
            name: account.name || 'Credit Card',
            type: 'credit',
            balance: account.balances?.current || 0,
            minimumPayment: (credit as any).minimum_payment_amount || 0,
            nextPaymentDueDate: credit.next_payment_due_date,
            lastPaymentDate: credit.last_payment_date || undefined,
            apr: credit.aprs?.[0]?.apr_percentage || undefined,
          })
        }

        for (const loan of liabilities.student || []) {
          if (!loan.account_id) continue
          const account = accounts.find(a => a.account_id === loan.account_id)
          if (!account || !loan.next_payment_due_date) continue

          allLiabilities.push({
            accountId: loan.account_id,
            name: account.name || 'Student Loan',
            type: 'student',
            balance: account.balances?.current || 0,
            minimumPayment: (loan as any).minimum_payment_amount || 0,
            nextPaymentDueDate: loan.next_payment_due_date,
            lastPaymentDate: loan.last_payment_date || undefined,
            apr: (loan as any).interest_rate_percentage || undefined,
          })
        }

        for (const mortgage of liabilities.mortgage || []) {
          if (!mortgage.account_id) continue
          const account = accounts.find(a => a.account_id === mortgage.account_id)
          if (!account || !mortgage.next_payment_due_date) continue

          allLiabilities.push({
            accountId: mortgage.account_id,
            name: account.name || 'Mortgage',
            type: 'mortgage',
            balance: account.balances?.current || 0,
            minimumPayment: (mortgage as any).minimum_payment_amount || 0,
            nextPaymentDueDate: mortgage.next_payment_due_date,
            lastPaymentDate: mortgage.last_payment_date || undefined,
            apr: (mortgage as any).interest_rate?.percentage || undefined,
          })
        }
      } catch (plaidError: any) {
        // Skip items with errors - they might not support liabilities
      }
    }

    let addedCount = 0
    let updatedCount = 0

    for (const liability of allLiabilities) {
      const existingBill = await pool.query(
        `SELECT id, user_modified FROM user_bills 
         WHERE user_id = $1 AND plaid_account_id = $2`,
        [user.id, liability.accountId]
      )

      if (existingBill.rows.length > 0) {
        if (!existingBill.rows[0].user_modified) {
          await pool.query(
            `UPDATE user_bills 
             SET amount = $1, next_due_date = $2, updated_at = NOW()
             WHERE id = $3`,
            [liability.minimumPayment, liability.nextPaymentDueDate, existingBill.rows[0].id]
          )
          updatedCount++
        }
      } else {
        await pool.query(
          `INSERT INTO user_bills 
            (user_id, name, amount, frequency, next_due_date, source, 
             plaid_account_id, plaid_liability_type, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            user.id,
            liability.name,
            liability.minimumPayment,
            'monthly',
            liability.nextPaymentDueDate,
            'plaid_liabilities',
            liability.accountId,
            liability.type,
          ]
        )
        addedCount++
      }
    }

    serverLogger.api('GET', '/api/user/liabilities/sync', 200, Date.now() - startTime, user.id)

    return {
      statusCode: 200,
      message: 'Liabilities synced successfully',
      count: allLiabilities.length,
      added: addedCount,
      updated: updatedCount,
      liabilities: allLiabilities,
    }
  } catch (error: any) {
    serverLogger.api(
      'GET',
      '/api/user/liabilities/sync',
      error.statusCode || 500,
      Date.now() - startTime
    )
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync liabilities',
    })
  }
})
