import { defineEventHandler, readBody, createError } from 'h3';
import { plaidClient } from "~/server/api/plaid/plaid";
import { requireAuth } from '~/server/utils/auth.js';
import { createItem, getItemByPlaidItemId } from '~/server/db/queries/items.js';
import { encrypt } from '~/server/utils/crypto.js';

// API for exchanging the public token and persisting to database
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);
  
  const body = await readBody(event);
  const publicToken = body.publicToken;

  if (!publicToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing public token",
    });
  }

  try {
    // Step 1: Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const tokenData = tokenResponse.data;
    const { access_token, item_id } = tokenData;

    // Step 2: Get institution details from Plaid
    const itemResponse = await plaidClient.itemGet({
      access_token: access_token,
    });
    const institutionId = itemResponse.data.item.institution_id || 'unknown';

    // Step 3: Get institution name
    let institutionName = 'Unknown Institution';
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      institutionName = instResponse.data.institution.name;
    } catch (instError) {
      console.warn('Could not fetch institution name:', instError.message);
    }

    // Step 4: Encrypt the access token before storing
    const encryptedAccessToken = encrypt(access_token);

    // Step 5: Save to database with authenticated user ID
    const item = await createItem(
      user.id, // Use authenticated user ID
      encryptedAccessToken,
      item_id,
      institutionId,
      'active',
      institutionName
    );

    console.log("Item created successfully:", {
      userId: user.id,
      id: item.id,
      plaidItemId: item.plaid_item_id,
      institutionId: item.plaid_institution_id,
    });

    // Step 5: Return item info (do NOT return access token for security)
    return {
      status: "success",
      itemId: item.plaid_item_id,
      internalId: item.id,
      institutionId: item.plaid_institution_id,
    };
  } catch (error) {
    console.error("Error during token exchange:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Token exchange failed",
    });
  }
});
