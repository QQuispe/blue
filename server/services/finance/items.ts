import { getItemsByUserId, getItemById, deleteItem } from '~/server/db/queries/items.js'
import { getAccountsByUserId } from '~/server/db/queries/accounts.js'
import { plaidClient } from './plaid.js'
import { decrypt } from '~/server/utils/crypto.js'
import type { Item } from '~/types/database.js'

export interface SafeItem {
  id: number
  plaid_item_id: string
  plaid_institution_id?: string
  institution_name?: string
  status: string
  error?: any
  created_at: Date
  updated_at: Date
  last_synced_at: Date
}

export interface ItemsData {
  items: SafeItem[]
}

export async function getItems(userId: number): Promise<ItemsData> {
  // Get all items for this user
  const items = await getItemsByUserId(userId)

  // Get accounts to extract institution names
  const accounts = await getAccountsByUserId(userId)

  // Create a map of item_id to institution_name
  const institutionMap: Record<number, string> = {}
  accounts.forEach((account: any) => {
    if (account.institution_name && !institutionMap[account.item_id]) {
      institutionMap[account.item_id] = account.institution_name
    }
  })

  // Don't return the encrypted access tokens to the frontend
  const safeItems: SafeItem[] = items.map((item: Item) => ({
    id: item.id,
    plaid_item_id: item.plaid_item_id,
    plaid_institution_id: item.plaid_institution_id,
    institution_name: institutionMap[item.id] || item.plaid_institution_id,
    status: item.status,
    error: item.error || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
    last_synced_at: item.updated_at, // Using updated_at as proxy for last sync
  }))

  return { items: safeItems }
}

export async function disconnectItem(itemId: number, userId: number): Promise<void> {
  // Get the item
  const item = await getItemById(itemId)

  if (!item) {
    throw new Error('Item not found')
  }

  // Verify ownership
  if (item.user_id !== userId) {
    throw new Error('Access denied')
  }

  try {
    // Try to unlink from Plaid (optional - don't fail if Plaid errors)
    const accessToken = decrypt(item.plaid_access_token!)
    if (accessToken) {
      await plaidClient.itemRemove({
        access_token: accessToken,
      })
    }
  } catch (plaidError: any) {
    // Continue - we still want to delete from our DB
  }

  // Delete from our database
  await deleteItem(itemId, userId)
}
