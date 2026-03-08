import { pool } from '~/server/db/index.js'

export interface Bill {
  id: number
  name: string
  amount: number
  frequency: string
  nextDueDate: string
  daysUntil: number
  source: string
  type?: string
  isUserManaged: boolean
  isActive: boolean
}

export interface SuggestedBill {
  id: number
  name: string
  amount: number
  frequency: string
  confidence: number
  detectedDate: string
}

export interface BillsData {
  bills: Bill[]
  suggestions: SuggestedBill[]
  totalDue: number
}

export interface CreateBillInput {
  name: string
  amount: number
  frequency?: string
  nextDueDate: string
  source?: string
}

export interface UpdateBillInput {
  amount?: number
  nextDueDate?: string
  isActive?: boolean
}

export async function getBills(
  userId: number,
  includeInactive: boolean = false
): Promise<BillsData> {
  // Fetch user's bills
  let billsQuery = `
    SELECT 
      id,
      name,
      amount,
      frequency,
      next_due_date,
      source,
      plaid_liability_type as type,
      user_modified,
      is_active
    FROM user_bills
    WHERE user_id = $1
  `

  if (!includeInactive) {
    billsQuery += ' AND is_active = true'
  }

  billsQuery += ' ORDER BY next_due_date ASC'

  const billsResult = await pool.query(billsQuery, [userId])

  const today = new Date()

  const bills: Bill[] = billsResult.rows.map((row: any) => {
    const dueDate = new Date(row.next_due_date)
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: row.id,
      name: row.name,
      amount: parseFloat(row.amount),
      frequency: row.frequency,
      nextDueDate: row.next_due_date,
      daysUntil,
      source: row.source,
      type: row.type,
      isUserManaged: row.user_modified || row.source === 'manual',
      isActive: row.is_active,
    }
  })

  // Fetch suggested bills (detected patterns not yet added)
  const suggestionsResult = await pool.query(
    `SELECT 
      id,
      name,
      amount,
      frequency,
      confidence,
      last_detected
    FROM detected_bill_patterns
    WHERE user_id = $1 AND is_ignored = false
    ORDER BY confidence DESC, last_detected DESC
    LIMIT 5`,
    [userId]
  )

  const suggestions: SuggestedBill[] = suggestionsResult.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    amount: parseFloat(row.amount),
    frequency: row.frequency,
    confidence: parseFloat(row.confidence),
    detectedDate: row.last_detected,
  }))

  return {
    bills,
    suggestions,
    totalDue: bills.reduce((sum, bill) => sum + bill.amount, 0),
  }
}

export async function createBill(userId: number, input: CreateBillInput): Promise<Bill> {
  const { name, amount, frequency, nextDueDate, source } = input

  const result = await pool.query(
    `INSERT INTO user_bills 
      (user_id, name, amount, frequency, next_due_date, source, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, name, amount, frequency, next_due_date, source, is_active`,
    [userId, name, amount, frequency || 'monthly', nextDueDate, source || 'manual']
  )

  const bill = result.rows[0]
  const today = new Date()
  const dueDate = new Date(bill.next_due_date)
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: bill.id,
    name: bill.name,
    amount: parseFloat(bill.amount),
    frequency: bill.frequency,
    nextDueDate: bill.next_due_date,
    daysUntil,
    source: bill.source,
    isUserManaged: true,
    isActive: bill.is_active,
  }
}

export async function updateBill(
  billId: number,
  userId: number,
  input: UpdateBillInput
): Promise<Bill> {
  const { amount, nextDueDate, isActive } = input

  // Build dynamic update query
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (amount !== undefined) {
    updates.push(`amount = $${paramIndex}`)
    values.push(amount)
    paramIndex++
  }

  if (nextDueDate !== undefined) {
    updates.push(`next_due_date = $${paramIndex}`)
    values.push(nextDueDate)
    paramIndex++
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`)
    values.push(isActive)
    paramIndex++
  }

  // Always mark as user modified when they update
  updates.push(`user_modified = $${paramIndex}`)
  values.push(true)
  paramIndex++

  updates.push(`updated_at = $${paramIndex}`)
  values.push(new Date())
  paramIndex++

  // Add billId and userId for WHERE clause
  values.push(billId)
  values.push(userId)

  const result = await pool.query(
    `UPDATE user_bills 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING id, name, amount, frequency, next_due_date, source, is_active`,
    values
  )

  const bill = result.rows[0]
  const today = new Date()
  const dueDate = new Date(bill.next_due_date)
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: bill.id,
    name: bill.name,
    amount: parseFloat(bill.amount),
    frequency: bill.frequency,
    nextDueDate: bill.next_due_date,
    daysUntil,
    source: bill.source,
    isUserManaged: true,
    isActive: bill.is_active,
  }
}

export async function ignoreBillSuggestion(suggestionId: number, userId: number): Promise<void> {
  const result = await pool.query(
    `UPDATE detected_bill_patterns 
     SET is_ignored = true 
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [suggestionId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Suggestion not found')
  }
}

export async function verifyBillOwnership(billId: number, userId: number): Promise<boolean> {
  const result = await pool.query('SELECT id FROM user_bills WHERE id = $1 AND user_id = $2', [
    billId,
    userId,
  ])

  return result.rows.length > 0
}
