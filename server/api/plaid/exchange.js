import { plaidClient } from "~/server/api/plaid/plaid";
import { defineEventHandler, readBody } from "h3"; // H3 helpers
import { storeToken } from "~/server/utils/tempStorage";

// API for exchanging the public token
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const publicToken = body.publicToken;

  try {
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const tokenData = tokenResponse.data;

    // temporarily store access token and print
    storeToken(tokenData.item_id, tokenData.access_token);
    console.log("Item ID:", tokenData.item_id);
    console.log("Access Token:", tokenData.access_token);


    return { status: "success", itemId: tokenData.item_id, accessToken: tokenData.access_token};
  } catch (error) {
    console.error("Error during token exchange:", error);
    return { status: "error", message: "Token exchange failed" };
  }
});
