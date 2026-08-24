import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Fingerprint, 
  ScanFace, 
  Sparkles, 
  ShieldAlert, 
  KeyRound, 
  Copy, 
  Check, 
  Terminal, 
  RefreshCw,
  Cpu,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { CryptoResult } from '../types';

interface ZeroTouchConsoleProps {
  onWipeSpace: (username: string, pin: string) => Promise<boolean>;
}

export const ZeroTouchConsole: React.FC<ZeroTouchConsoleProps> = ({ onWipeSpace }) => {
  // Biometric 0-touch states
  const [biometricState, setBiometricState] = useState<'locked' | 'scanning' | 'authenticated'>('locked');
  const [biometricMethod, setBiometricMethod] = useState<'fingerprint' | 'face'>('face');
  
  // AI Encryption states
  const [plainInput, setPlainInput] = useState<string>('Top secret operational payload: zero-touch android user space authorized.');
  const [encPassword, setEncPassword] = useState<string>('PQC-PostQuantum-Seed-99x');
  const [userEntropy, setUserEntropy] = useState<string>('');
  const [encrypting, setEncrypting] = useState<boolean>(false);
  const [cryptoResult, setCryptoResult] = useState<CryptoResult | null>(null);
  
  // Decryption states
  const [decPassword, setDecPassword] = useState<string>('PQC-PostQuantum-Seed-99x');
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decError, setDecError] = useState<string | null>(null);

  // Duress PIN Wipe states
  const [duressPin, setDuressPin] = useState<string>('9999');
  const [wiping, setWiping] = useState<boolean>(false);
  const [wipeStatus, setWipeStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Simulate 0-Touch Biometric Authentication (Face / Fingerprint)
  const triggerBiometricScan = (method: 'face' | 'fingerprint') => {
    setBiometricMethod(method);
    setBiometricState('scanning');
    setTimeout(() => {
      setBiometricState('authenticated');
    }, 1200);
  };

  // Perform AI Context-Aware Hybrid Encryption
  const handleEncrypt = async () => {
    if (!plainInput || !encPassword) return;
    setEncrypting(true);
    setDecryptedText(null);
    setDecError(null);

    try {
      const res = await fetch('/api/crypto/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainInput,
          password: encPassword,
          activity: 'typing',
          userEntropy: userEntropy || 'keystroke-entropy-sample'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCryptoResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEncrypting(false);
    }
  };

  // Perform Decryption
  const handleDecrypt = async () => {
    if (!cryptoResult || !decPassword) return;
    setDecError(null);
    setDecryptedText(null);

    try {
      const res = await fetch('/api/crypto/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: cryptoResult.ciphertext,
          iv: cryptoResult.iv,
          tag: cryptoResult.tag,
          password: decPassword,
          contextDigest: cryptoResult.contextDigest,
        })
      });
      const data = await res.json();
      if (data.success) {
        setDecryptedText(data.plaintext);
      } else {
        setDecError(data.error || 'Authentication failed: Invalid key or tampered ciphertext');
      }
    } catch (e: any) {
      setDecError('Decryption error: ' + e.message);
    }
  };

  // Trigger Duress PIN Instant Cryptographic Wipe
  const handleDuressWipe = async () => {
    if (!duressPin) return;
    setWiping(true);
    setWipeStatus(null);
    try {
      const success = await onWipeSpace('operator_alpha', duressPin);
      if (success) {
        setWipeStatus('⚠️ DURESS WIPE EXECUTED: All cryptographic keys, local caches, and .onion state shredded in memory and disk.');
        setCryptoResult(null);
        setDecryptedText(null);
        setBiometricState('locked');
      }
    } catch (e: any) {
      setWipeStatus('Wipe error: ' + e.message);
    } finally {
      setWiping(false);
    }
  };

  const copyCiphertext = () => {
    if (!cryptoResult) return;
    navigator.clipboard.writeText(cryptoResult.ciphertext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: 0-Touch Android Biometrics & AI Hybrid Crypto */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                0-Touch Android Biometrics & AI Post-Quantum Cryptography
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                FIPS 203 Hybrid
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Simulates touchless Android unlocking using Google ML Kit face recognition and Keystore-bound biometric tokens, paired with an AI-adaptive hybrid encryption engine (X25519 + ML-KEM + AES-256-GCM) and a duress PIN emergency partition wipe.
            </p>
          </div>

          {/* 0-Touch Biometric Sensor Simulator */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
              biometricState === 'authenticated' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
              biometricState === 'scanning' ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse' :
              'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              {biometricMethod === 'face' ? <ScanFace className="h-6 w-6" /> : <Fingerprint className="h-6 w-6" />}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-200">0-Touch Biometric Lock</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Status: <strong className={biometricState === 'authenticated' ? 'text-emerald-400' : 'text-amber-400'}>{biometricState.toUpperCase()}</strong>
              </div>
              <div className="flex space-x-2 mt-2">
                <button
                  id="touchless-face-btn"
                  onClick={() => triggerBiometricScan('face')}
                  disabled={biometricState === 'scanning'}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 border border-slate-700 transition-colors"
                >
                  Touchless Face
                </button>
                <button
                  id="touchless-fingerprint-btn"
                  onClick={() => triggerBiometricScan('fingerprint')}
                  disabled={biometricState === 'scanning'}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 border border-slate-700 transition-colors"
                >
                  Fingerprint
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: AI Encrypt (Left) & AI Decrypt (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: AI-Adaptive Encryption */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>AI Hybrid Encryption Engine</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              ML-KEM + AES-GCM
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Plaintext Payload (Android User Space Data)
            </label>
            <textarea
              id="plain-input-field"
              rows={3}
              value={plainInput}
              onChange={(e) => {
                setPlainInput(e.target.value);
                setUserEntropy(prev => (prev + e.target.value.length).slice(-32));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              placeholder="Enter message or payload..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Passphrase / Seed
              </label>
              <input
                id="enc-password-field"
                type="text"
                value={encPassword}
                onChange={(e) => setEncPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                AI Entropy Dynamic
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono flex items-center justify-between">
                <span>94.6% Quality</span>
                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
          </div>

          <button
            id="encrypt-action-btn"
            onClick={handleEncrypt}
            disabled={encrypting || !plainInput}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all cursor-pointer"
          >
            {encrypting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            <span>Execute AI Hybrid Encryption</span>
          </button>

          {/* Ciphertext Output */}
          {cryptoResult && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">Encrypted Payload Output</span>
                <button
                  id="copy-ciphertext-btn"
                  onClick={copyCiphertext}
                  className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 text-[11px]"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 p-2.5 rounded-lg border border-slate-800 max-h-24 overflow-y-auto">
                {cryptoResult.ciphertext}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                <div>IV / Nonce: {cryptoResult.iv.slice(0, 8)}...</div>
                <div>Auth Tag: {cryptoResult.tag.slice(0, 8)}...</div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Hybrid Decryption & Duress PIN Emergency Wipe */}
        <div className="space-y-6">
          {/* Decryption Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Unlock className="h-4 w-4 text-cyan-400" />
                <span>Zero-Trust Decryption</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                AES-GCM Authenticated
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Decryption Passphrase
              </label>
              <div className="flex space-x-2">
                <input
                  id="dec-password-field"
                  type="text"
                  value={decPassword}
                  onChange={(e) => setDecPassword(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none font-mono"
                  placeholder="Enter decryption password..."
                />
                <button
                  id="decrypt-action-btn"
                  onClick={handleDecrypt}
                  disabled={!cryptoResult}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Decrypt
                </button>
              </div>
            </div>

            {decryptedText && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Decryption Verified (0-Touch Keystore Bound)</span>
                </div>
                <div className="font-mono text-slate-200 bg-slate-950/80 p-2 rounded-lg mt-2">
                  {decryptedText}
                </div>
              </div>
            )}

            {decError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300">
                {decError}
              </div>
            )}
          </div>

          {/* Duress PIN Wipe Card */}
          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-rose-400 tracking-wider flex items-center space-x-2">
                <Flame className="h-4 w-4 text-rose-400" />
                <span>Duress PIN Emergency Partition Wipe</span>
              </h3>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                DOD 5220.22-M
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Entering the duress PIN triggers instant cryptographic wiping of user space keys, on-device caches, and Tor .onion tunnels, sending a silent panic beacon to the monitoring center.
            </p>

            <div className="flex space-x-2">
              <input
                id="duress-pin-field"
                type="password"
                value={duressPin}
                onChange={(e) => setDuressPin(e.target.value)}
                className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-rose-300 focus:border-rose-500 outline-none font-mono text-center font-bold tracking-widest"
                placeholder="PIN"
                maxLength={6}
              />
              <button
                id="trigger-duress-wipe-btn"
                onClick={handleDuressWipe}
                disabled={wiping}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Execute Emergency Duress Wipe</span>
              </button>
            </div>

            {wipeStatus && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs font-mono text-rose-300">
                {wipeStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
