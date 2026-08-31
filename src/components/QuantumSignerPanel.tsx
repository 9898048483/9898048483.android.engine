import React, { useState } from 'react';
import { Fingerprint, Shield, Cpu, Activity, ShieldAlert, Key } from 'lucide-react';

export const QuantumSignerPanel: React.FC = () => {
  const [message, setMessage] = useState('');
  const [signatureData, setSignatureData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSignature = async (algorithm: 'ML-DSA-87' | 'Falcon-1024') => {
    setLoading(true);
    setError('');
    setSignatureData(null);
    try {
      const response = await fetch('/api/v1/quantum/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          algorithm, 
          message: message || 'Default Post-Quantum Message'
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate signature');
      setSignatureData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-emerald-900/50 rounded-xl overflow-hidden shadow-lg mb-8">
      <div className="bg-emerald-950/30 border-b border-emerald-900/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/50 rounded-lg text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-emerald-300">Quantum Signer Bridge</h3>
            <p className="text-xs text-emerald-400/70">Connects Node.js to Python PQC Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-900/50">
          <Activity className="w-4 h-4" />
          <span>PORT: 8000 (FastAPI)</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Payload to Sign</label>
          <input 
            type="text" 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            placeholder="Enter message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => generateSignature('ML-DSA-87')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Shield className="w-5 h-5" />
            {loading ? 'Generating...' : 'Generate ML-DSA-87 Signature'}
          </button>
          
          <button
            onClick={() => generateSignature('Falcon-1024')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Fingerprint className="w-5 h-5" />
            {loading ? 'Generating...' : 'Test Falcon-1024 Bridge'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}

        {signatureData && (
          <div className="bg-gray-950 rounded-lg border border-gray-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-2 border-b border-gray-800 pb-3">
              <Key className="w-4 h-4" />
              <span className="font-semibold">{signatureData.algorithm} Generated Successfully</span>
            </div>
            
            {signatureData.public_key_hex && (
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Public Key</span>
                <p className="font-mono text-xs text-indigo-300 break-all bg-gray-900 p-3 rounded">{signatureData.public_key_hex}</p>
              </div>
            )}
            
            {signatureData.signature_hex && (
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Signature</span>
                <p className="font-mono text-xs text-emerald-300 break-all bg-gray-900 p-3 rounded">{signatureData.signature_hex}</p>
              </div>
            )}
            
            {signatureData.transaction_id && (
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Transaction ID</span>
                <p className="font-mono text-xs text-purple-300 break-all bg-gray-900 p-3 rounded">{signatureData.transaction_id}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
