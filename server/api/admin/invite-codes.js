import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { createInviteCode, listInviteCodes } from '~/server/db/queries/users.ts';
import crypto from 'crypto';

// Generate a random invite code
function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

export default defineEventHandler(async (event) => {
  // Ensure user is authenticated and is admin
  const user = await requireAuth(event);
  
  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    });
  }

  const method = event.node.req.method;

  try {
    if (method === 'POST') {
      // Create new invite code
      const code = generateInviteCode();
      const invite = await createInviteCode(code, user.id);
      
      return {
        statusCode: 201,
        message: 'Invite code created',
        invite: {
          code: invite.code,
          createdAt: invite.created_at
        }
      };
    } 
    else if (method === 'GET') {
      // List all invite codes
      const codes = await listInviteCodes();
      
      return {
        statusCode: 200,
        codes: codes.map(c => ({
          id: c.id,
          code: c.code,
          isUsed: c.is_used,
          createdBy: c.created_by_username,
          usedBy: c.used_by_username,
          createdAt: c.created_at,
          usedAt: c.used_at
        }))
      };
    }
    else {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Invite code error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to manage invite codes'
    });
  }
});
