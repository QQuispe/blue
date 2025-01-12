import { plaidClient } from "~/server/api/plaid/plaid";
//import { getLoggedInUserId } from "~/server/api/plaid/utils";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const userId = "user"; //getLoggedInUserId(event); // Replace with your user identification logic

    const userObject = { client_user_id: userId };
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: userObject,
      products: ["transactions"],
      client_name: "Blue",
      language: "en",
      country_codes: ["US"],
    });

    return tokenResponse.data;
  } catch (error) {
    console.error("Error generating link token:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Link token creation failed",
    });
  }
});
