// Mock functions until DB is connected. 
// Once DB is configured, import db from './index' and use Drizzle ORM.

export const fetchBalance = async (userId: string): Promise<string> => {
  // TODO: Implement actual DB query: await db.select().from(UserTokens).where(eq(UserTokens.userId, userId));
  console.log(`[DB] Fetching balance for user: ${userId}`);
  return '0.0000';
};

export const updateBalance = async (userId: string, amount: string): Promise<void> => {
  // TODO: Implement actual DB update ensuring balance + amount >= 0
  const currentBalance = parseFloat(await fetchBalance(userId));
  const newBalance = currentBalance + parseFloat(amount);
  
  if (newBalance < 0) {
    throw new Error('Insufficient funds: balance cannot be negative');
  }

  console.log(`[DB] Updating balance for user ${userId} by ${amount}. New balance: ${newBalance}`);
};
