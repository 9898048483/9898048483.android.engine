import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { fetchBalance, transferTokens } from '../db/ledgerService';

export const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>('');
  const [recipientId, setRecipientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const auth = getAuth();

  const loadBalance = async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    const bal = await fetchBalance(uid);
    setBalance(bal);
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadBalance(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleSend = async () => {
    setError('');
    setSuccess('');
    if (!recipientId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setError('Invalid recipient or amount');
        return;
    }
    
    try {
        await transferTokens(userId, recipientId, Number(amount));
        setSuccess(`Successfully sent ${amount} tokens to ${recipientId}`);
        setAmount('');
        setRecipientId('');
        await loadBalance(userId);
    } catch (e: any) {
        setError(e.message || 'Transfer failed');
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Your Wallet</h2>
      
      <div className="bg-slate-800 p-4 rounded-md mb-6">
        <p className="text-sm text-slate-400">Wallet Address (UID)</p>
        <p className="text-md font-mono text-white break-all">{userId || 'Not authenticated'}</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading balance...</p>
      ) : (
        <div className="bg-slate-800 p-4 rounded-md mb-6">
          <p className="text-sm text-slate-400">Total Balance</p>
          <p className="text-4xl font-mono text-emerald-400">{balance.toFixed(4)} Tokens</p>
          <button onClick={() => loadBalance(userId)} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">Refresh</button>
        </div>
      )}

      <div className="bg-slate-800 p-4 rounded-md">
        <h3 className="text-lg font-semibold text-white mb-2">Send Tokens</h3>
        <input type="text" placeholder="Recipient Wallet Address" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full p-2 mb-2 bg-slate-700 text-white rounded"/>
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 mb-2 bg-slate-700 text-white rounded"/>
        <button onClick={handleSend} className="w-full p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Send Tokens</button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
        {success && <p className="text-emerald-400 mt-2">{success}</p>}
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Token System</h3>
        <p className="text-slate-300">
          Your tokens represent your 51% stake in the sovereign clearing network. 
          Balances are securely tracked in the immutable Firestore Ledger.
        </p>
      </div>
    </div>
  );
};
