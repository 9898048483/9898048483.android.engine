import { updateBalance } from '../../src/db/tokenUtils.js';
import { auditLogger } from './token_audit_logger.js';

// Basic idempotency tracker (in-memory for this example, 
// in production replace with a DB table check for processed action IDs)
const processedActions = new Set<string>();

export const ActionRewardService = {
  async processAction(userId: string, actionType: string, rewardAmount: string, actionId: string) {
    const idempotencyKey = `${userId}:${actionType}:${actionId}`;

    if (processedActions.has(idempotencyKey)) {
      console.warn(`[ActionRewards] Attempted double-mint for key: ${idempotencyKey}`);
      return { success: false, reason: 'Already processed' };
    }

    try {
      // 1. Log the audit event and ensure uniqueness
      auditLogger.recordEvent('MINT_REWARD', userId, {
        actionType,
        rewardAmount,
        actionId,
        idempotencyKey,
      });

      // 2. Perform the minting
      await updateBalance(userId, rewardAmount);

      processedActions.add(idempotencyKey);
      console.log(`[ActionRewards] Minted ${rewardAmount} tokens for ${userId} (Action: ${actionType})`);
      return { success: true };
    } catch (error) {
      console.error(`[ActionRewards] Failed to process reward:`, error);
      throw error;
    }
  }
};
