import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';

interface TokenBalanceDisplayProps {
  userId: string;
  email?: string;
}

export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({ userId, email }) => {
  const [balance, setBalance] = useState('0.0000');
  const [loading, setLoading] = useState(false);
  
  const refresh = () => {
    if (!userId) return;
    setLoading(true);
    fetch('/api/tokens/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    })
    .then(res => res.json())
    .then(data => {
      if (data.balance) {
        const num = Number(data.balance);
        setBalance(isNaN(num) ? data.balance : num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
      }
    })
    .catch(err => console.error('Failed to fetch balance:', err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [userId, email]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Token Balance</h3>
            <p className="text-xs text-slate-400">Sovereign Clearing Ledger</p>
          </div>
        </div>
        <button 
          onClick={refresh}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="Refresh Balance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>
      <p className="text-3xl sm:text-4xl font-mono text-emerald-400 mt-5 tracking-tight font-extrabold flex items-baseline">
        {balance} 
        <span className="text-xs text-slate-400 ml-2 font-sans font-medium">TOK</span>
      </p>
    </div>
  );
};
