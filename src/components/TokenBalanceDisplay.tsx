import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

interface TokenBalanceDisplayProps {
  userId: string;
}

export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({ userId }) => {
  const [balance, setBalance] = useState('0.0000');
  
  useEffect(() => {
    fetch('/api/tokens/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.balance) setBalance(data.balance);
    })
    .catch(err => console.error('Failed to fetch balance:', err));
  }, [userId]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <Wallet className="text-blue-400" size={24} />
        <h3 className="text-lg font-bold text-slate-100">Token Balance</h3>
      </div>
      <p className="text-4xl font-mono text-slate-100 mt-6 tracking-tight">
        {balance} 
        <span className="text-sm text-slate-400 ml-2 font-sans font-medium">TOK</span>
      </p>
    </div>
  );
};
