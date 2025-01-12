import { plaidClient } from "~/server/api/plaid/plaid";
import { defineEventHandler, readBody } from 'h3';

// Function to fetch transactions from Plaid
const fetchTransactions = async (accessToken, cursor = null) => {
  const allData = { added: [], removed: [], modified: [], nextCursor: cursor };

  try {
    let keepGoing = false;
    do {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        //options: { cursor: allData.nextCursor },
      });

      const data = response.data;
      allData.added.push(...data.added);
      allData.modified.push(...data.modified);
      allData.removed.push(...data.removed);
      allData.nextCursor = data.next_cursor;
      keepGoing = data.has_more;

      console.log(
        `Added: ${data.added.length}, Modified: ${data.modified.length}, Removed: ${data.removed.length}`
      );
    } while (keepGoing);

    return allData;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

// Nuxt API route to handle transaction fetching
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accessToken } = body;

  if (!accessToken) {
    return { statusCode: 400, message: 'Missing access token' };
  }

  try {
    const transactions = await fetchTransactions(accessToken);
    return { transactions: transactions.added };
  } catch (error) {
    return { statusCode: 500, message: 'Failed to fetch transactions' };
  }
});