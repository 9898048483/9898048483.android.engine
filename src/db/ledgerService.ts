export interface TransactionItem {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  type: 'transfer' | 'genesis' | 'mint' | 'shielded';
  timestamp: string;
  txHash: string;
  status: 'confirmed';
}

export const fetchBalance = async (userId: string, email?: string): Promise<number> => {
  if (!userId) return 0;
  
  try {
    const response = await fetch('/api/tokens/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    });
    const data = await response.json();
    if (data.balance !== undefined && !isNaN(Number(data.balance))) {
      return Number(data.balance);
    }
    // Fallback based on admin email
    const isAdmin = (email && email.toLowerCase() === 'india9898048483@gmail.com') || userId.includes('india9898048483') || userId === 'operator_alpha';
    return isAdmin ? 504799047233 : 1000;
  } catch (error: any) {
    console.warn("[LedgerService] Fetch balance fallback:", error.message);
    const localKey = `ledger_${userId}`;
    const stored = localStorage.getItem(localKey);
    if (stored !== null) return Number(stored);
    const isAdmin = (email && email.toLowerCase() === 'india9898048483@gmail.com') || userId.includes('india9898048483') || userId === 'operator_alpha';
    return isAdmin ? 504799047233 : 1000;
  }
};

export const updateBalance = async (userId: string, amount: number): Promise<number> => {
  if (!userId) throw new Error('User ID is required to update balance');
  
  try {
    const response = await fetch('/api/tokens/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, actionType: 'build' })
    });
    const data = await response.json();
    if (data.newBalance !== undefined) return Number(data.newBalance);
  } catch (_) {}

  const localKey = `ledger_${userId}`;
  const stored = localStorage.getItem(localKey);
  const currentBalance = stored ? Number(stored) : 1000;
  const newBalance = currentBalance + amount;
  localStorage.setItem(localKey, newBalance.toString());
  return newBalance;
};

export const transferTokens = async (
  senderId: string, 
  receiverId: string, 
  amount: number, 
  senderEmail?: string
): Promise<{ success: boolean; senderBalance: number; receiverBalance: number; tx?: TransactionItem }> => {
  if (!senderId || !receiverId) throw new Error('Sender and Receiver Wallet Addresses are required');
  if (senderId.trim() === receiverId.trim()) throw new Error('Cannot send tokens to your own wallet address');
  if (amount <= 0 || isNaN(amount)) throw new Error('Amount must be greater than 0');
  
  const response = await fetch('/api/tokens/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, receiverId, amount, senderEmail })
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Transfer failed on sovereign ledger');
  }
  return data;
};

export const fetchTransactionHistory = async (userId: string): Promise<TransactionItem[]> => {
  if (!userId) return [];
  try {
    const response = await fetch(`/api/tokens/history?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch (err) {
    console.warn('[LedgerService] Failed to load history:', err);
    return [];
  }
};
