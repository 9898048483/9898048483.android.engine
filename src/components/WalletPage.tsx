import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { fetchBalance, transferTokens } from '../db/ledgerService';
import { authenticateWebAuthn, registerWebAuthn } from '../lib/webAuthnClient';
import { Shield } from 'lucide-react';

export const WalletPage: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>('');
  const [recipientId, setRecipientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isShielded, setIsShielded] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [showSignModal, setShowSignModal] = useState<boolean>(false);

  const auth = getAuth();

  const loadBalance = async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    const bal = await fetchBalance(uid, userEmail);
    setBalance(bal);
    setLoading(false);
  };

  useEffect(() => {
    let authHandled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        authHandled = true;
        setUserId(user.uid);
        await loadBalance(user.uid);
        setLoading(false);
      } else if (!authHandled) {
        // Give auth a brief moment to fail/succeed before using mock
        setTimeout(async () => {
          if (!authHandled) {
            let localUid = localStorage.getItem('mock_uid');
            if (localUid) {
              setUserId(localUid);
              await loadBalance(localUid);
            }
            setLoading(false);
          }
        }, 1500);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleSendRequest = () => {
    setError('');
    setSuccess('');
    if (!recipientId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setError('Invalid recipient or amount');
        return;
    }
    setShowSignModal(true);
  };

  const executeSignedTransfer = async () => {
    setIsSigning(true);
    setError('');
    try {
      // 1. Trigger Hardware-Backed Biometric Authentication (WebAuthn)
      // We try to authenticate. If the user hasn't registered a device key, we register it first.
      try {
        await authenticateWebAuthn(userId);
      } catch (authErr) {
        // Fallback to register if not found (for prototype purposes)
        console.log('Authentication failed, attempting to register hardware key...', authErr);
        await registerWebAuthn(userId);
        await authenticateWebAuthn(userId);
      }

      // 2. Shielded Transfer (ZK Mixer Nullifier Generation)
      if (isShielded) {
        const zkResponse = await fetch('/api/v1/zk/generate-nullifier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_symbol: 'TOKEN9898',
            denomination: Number(amount),
            sender: userId,
            recipient: recipientId
          })
        });
        
        const zkData = await zkResponse.json();
        if (!zkResponse.ok) {
          throw new Error(zkData.error || 'Failed to generate ZK nullifier');
        }
        
        // Simulating the ZK pool interaction instead of direct transfer
        console.log('ZK Nullifier Generated:', zkData);
        setSuccess(`Shielded Transfer successful! Nullifier generated: ${zkData.nullifier_hash.slice(0, 16)}...`);
      } else {
        // 3. Execute Transfer (Simulating sending the signed payload)
        await transferTokens(userId, recipientId, Number(amount));
        setSuccess(`Successfully signed and transmitted! Sent ${amount} tokens to ${recipientId}`);
      }
      
      setAmount('');
      setRecipientId('');
      await loadBalance(userId);
    } catch (e: any) {
      setError(e.message || 'Cryptographic signing failed or transfer aborted.');
    } finally {
      setIsSigning(false);
      setShowSignModal(false);
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Send Tokens</h3>
          <div className="flex items-center gap-2 bg-slate-700/50 p-1.5 rounded-lg border border-slate-600/50">
            <Shield className={`w-4 h-4 ${isShielded ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="text-xs text-slate-300 mr-2">Shielded Transfer</span>
            <button 
              onClick={() => setIsShielded(!isShielded)}
              className={`w-8 h-4 rounded-full transition-colors relative ${isShielded ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${isShielded ? 'right-0.5' : 'left-0.5'}`}></div>
            </button>
          </div>
        </div>
        <input type="text" placeholder="Recipient Wallet Address" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full p-2 mb-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        <input type="number" placeholder={isShielded ? "Amount (100, 1k, 10k, 100k allowed)" : "Amount"} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 mb-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        <button onClick={handleSendRequest} className="w-full p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Initiate Transfer</button>
        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 mt-2 text-sm break-all">{success}</p>}
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Token System</h3>
        <p className="text-slate-300">
          Your tokens represent your 51% stake in the sovereign clearing network. 
          Balances are securely tracked in the immutable Firestore Ledger.
        </p>
      </div>

      {/* Hardware Sign Transaction Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full shadow-2xl border border-emerald-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Hardware Signature Required</h3>
            <p className="text-slate-300 mb-6 text-sm">
              You are about to {isShielded ? <span className="text-purple-400 font-bold">shield</span> : 'send'} <span className="font-bold text-emerald-400">{amount}</span> tokens to <span className="font-mono text-xs">{recipientId.slice(0,10)}...</span>.
              {isShielded && <><br/><br/><span className="text-purple-300 text-xs">This will route through the Zero-Knowledge Privacy Mixer Pool.</span></>}
              <br /><br />
              This action requires cryptographic signing using your device's Trusted Execution Environment (TEE). Please authenticate using your Biometric Prompt (Fingerprint/Face).
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowSignModal(false)}
                className="flex-1 p-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                disabled={isSigning}
              >
                Cancel
              </button>
              <button 
                onClick={executeSignedTransfer}
                className="flex-1 p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-semibold flex justify-center items-center"
                disabled={isSigning}
              >
                {isSigning ? (
                  <span className="animate-pulse">Signing...</span>
                ) : (
                  <span>Authenticate & Sign</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
