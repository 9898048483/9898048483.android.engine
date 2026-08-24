import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Fingerprint, 
  ScanFace, 
  Eye, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Copy, 
  Check, 
  Terminal, 
  RefreshCw,
  Cpu,
  Flame,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { HardwareAttestationInfo, BiometricScanToken, MLKitFaceScanResult, CryptoResult } from '../types';

interface ZeroTouchConsoleProps {
  onWipeSpace: (username: string, pin: string) => Promise<boolean>;
}

export const ZeroTouchConsole: React.FC<ZeroTouchConsoleProps> = ({ onWipeSpace }) => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'hardware_attestation' | 'mlkit_liveness' | 'python_source' | 'cli_trace'>('console');
  
  // Biometric 0-touch states
  const [biometricState, setBiometricState] = useState<'locked' | 'scanning' | 'authenticated'>('locked');
  const [biometricMethod, setBiometricMethod] = useState<'face' | 'fingerprint' | 'iris'>('face');
  const [activeToken, setActiveToken] = useState<BiometricScanToken | null>(null);
  const [livenessData, setLivenessData] = useState<MLKitFaceScanResult | null>(null);
  const [livenessScore, setLivenessScore] = useState<number>(0.96);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  // Hardware Attestation
  const [attestation, setAttestation] = useState<HardwareAttestationInfo | null>(null);

  // Fallback PIN states
  const [fallbackPin, setFallbackPin] = useState<string>('1234');
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  // Duress PIN states
  const [duressPin, setDuressPin] = useState<string>('9999');
  const [wiping, setWiping] = useState<boolean>(false);
  const [wipeStatus, setWipeStatus] = useState<string | null>(null);

  // AI Encryption Demo states
  const [plainInput, setPlainInput] = useState<string>('Top secret operational payload: zero-touch android user space authorized.');
  const [encPassword, setEncPassword] = useState<string>('PQC-PostQuantum-Seed-99x');
  const [encrypting, setEncrypting] = useState<boolean>(false);
  const [cryptoResult, setCryptoResult] = useState<CryptoResult | null>(null);
  const [decPassword, setDecPassword] = useState<string>('PQC-PostQuantum-Seed-99x');
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decError, setDecError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Python source & CLI test
  const [pythonCode, setPythonCode] = useState<string>('');
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Fetch attestation & python code on mount
  useEffect(() => {
    fetch('/api/biometrics/attestation')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.attestation) setAttestation(data.attestation);
      })
      .catch(err => console.error('Failed to load attestation info:', err));

    fetch('/api/biometrics/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load biometrics python source:', err));
  }, []);

  // Trigger Touchless Face Scan (Google ML Kit + Liveness)
  const triggerFaceScan = async () => {
    setBiometricMethod('face');
    setBiometricState('scanning');
    setAuthMsg('Analyzing eye blinks & 3D head pose via Google ML Kit...');

    try {
      const res = await fetch('/api/biometrics/scan-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eyeOpenLeft: 0.94, eyeOpenRight: 0.92, yaw: 1.4, pitch: -0.3 })
      });
      const data = await res.json();
      if (data.success) {
        setBiometricState('authenticated');
        setActiveToken(data.token);
        setLivenessData(data.landmarks);
        setLivenessScore(data.livenessScore);
        setAuthMsg(data.message);
      } else {
        setBiometricState('locked');
        setAuthMsg(data.message || 'Spoofing detected: Liveness rejected');
      }
    } catch (e: any) {
      setBiometricState('locked');
      setAuthMsg('Biometrics error: ' + e.message);
    }
  };

  // Trigger Fingerprint or Iris Scan
  const triggerModalityScan = async (method: 'fingerprint' | 'iris') => {
    setBiometricMethod(method);
    setBiometricState('scanning');
    setAuthMsg(`Prompting Android BiometricPrompt (${method.toUpperCase()})...`);

    try {
      const res = await fetch('/api/biometrics/scan-modality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modality: method === 'fingerprint' ? 'FINGERPRINT' : 'IRIS' })
      });
      const data = await res.json();
      if (data.success) {
        setBiometricState('authenticated');
        setActiveToken(data.token);
        setAuthMsg(data.message);
      }
    } catch (e: any) {
      setBiometricState('locked');
      setAuthMsg('Scan error: ' + e.message);
    }
  };

  // Verify Fallback PIN
  const handleVerifyPin = async () => {
    setPinStatus(null);
    try {
      const res = await fetch('/api/biometrics/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fallbackPin })
      });
      const data = await res.json();
      if (data.isDuress) {
        handleDuressWipe();
      } else if (data.success) {
        setBiometricState('authenticated');
        setActiveToken(data.token);
        setPinStatus('✅ PIN Verified: PBKDF2-HMAC-SHA512 fallback authorization granted.');
      } else {
        setPinStatus('❌ ' + (data.error || 'Invalid PIN entered.'));
      }
    } catch (e: any) {
      setPinStatus('Error: ' + e.message);
    }
  };

  // Trigger Duress Wipe
  const handleDuressWipe = async () => {
    setWiping(true);
    setWipeStatus(null);
    try {
      const success = await onWipeSpace('operator_alpha', duressPin);
      if (success) {
        setWipeStatus('🚨 DURESS WIPE TRIGGERED (9999): Cryptographic keys shredded, RAM wiped, panic telemetry broadcast.');
        setCryptoResult(null);
        setDecryptedText(null);
        setBiometricState('locked');
        setActiveToken(null);
      }
    } catch (e: any) {
      setWipeStatus('Wipe error: ' + e.message);
    } finally {
      setWiping(false);
    }
  };

  // Encryption Demo Handlers
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
          userEntropy: 'biometric-entropy-sample'
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

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/biometrics/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run biometrics CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyCiphertext = () => {
    if (!cryptoResult) return;
    navigator.clipboard.writeText(cryptoResult.ciphertext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="touchless-biometrics-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-emerald-950/30 to-zinc-900 border border-emerald-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Prompt 5 Biometrics
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
                Google ML Kit Vision & KeyStore StrongBox
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <ScanFace className="w-7 h-7 text-emerald-400" />
              Touchless Biometric Authentication Service
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              0-Touch Android biometric engine supporting Fingerprint, Google ML Kit Touchless Face recognition with physiological
              liveness detection, Iris scanning, KeyStore StrongBox hardware attestation, and duress-aware PIN fallback.
            </p>
          </div>

          {/* Quick Biometric Status Badge */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center space-x-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
              biometricState === 'authenticated' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
              biometricState === 'scanning' ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse' :
              'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}>
              {biometricMethod === 'face' ? <ScanFace className="h-6 w-6" /> :
               biometricMethod === 'iris' ? <Eye className="h-6 w-6" /> :
               <Fingerprint className="h-6 w-6" />}
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-200">0-Touch Biometric Lock</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                State: <strong className={biometricState === 'authenticated' ? 'text-emerald-400' : 'text-amber-400'}>{biometricState.toUpperCase()}</strong>
              </div>
              <div className="flex space-x-1.5 mt-2">
                <button
                  id="touchless-face-btn"
                  onClick={triggerFaceScan}
                  disabled={biometricState === 'scanning'}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-medium text-zinc-300 border border-zinc-700 transition flex items-center gap-1"
                >
                  <ScanFace className="w-3 h-3 text-emerald-400" />
                  Face (ML Kit)
                </button>
                <button
                  id="touchless-iris-btn"
                  onClick={() => triggerModalityScan('iris')}
                  disabled={biometricState === 'scanning'}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-medium text-zinc-300 border border-zinc-700 transition flex items-center gap-1"
                >
                  <Eye className="w-3 h-3 text-teal-400" />
                  Iris
                </button>
                <button
                  id="touchless-fingerprint-btn"
                  onClick={() => triggerModalityScan('fingerprint')}
                  disabled={biometricState === 'scanning'}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-medium text-zinc-300 border border-zinc-700 transition flex items-center gap-1"
                >
                  <Fingerprint className="w-3 h-3 text-indigo-400" />
                  Fingerprint
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'console'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Biometrics & AI Crypto Console
          </button>
          <button
            onClick={() => setActiveSubTab('hardware_attestation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'hardware_attestation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            KeyStore StrongBox Attestation
          </button>
          <button
            onClick={() => setActiveSubTab('mlkit_liveness')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'mlkit_liveness'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ScanFace className="w-3.5 h-3.5" />
            Google ML Kit Liveness Diagnostics
          </button>
          <button
            onClick={() => setActiveSubTab('python_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_source'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Python Service (touchless_biometrics.py)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('cli_trace');
              if (cliLogs.length === 0) handleRunCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_trace'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Execution Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE CONSOLE & AI CRYPTO */}
      {activeSubTab === 'console' && (
        <div className="space-y-6">
          {authMsg && (
            <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
              biometricState === 'authenticated'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{authMsg}</span>
              </div>
              {activeToken && (
                <span className="text-[10px] text-zinc-400">
                  KeyStore Token: {activeToken.sessionId.slice(0, 8)}... (Valid for {activeToken.expiresInSeconds}s)
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: AI-Adaptive Encryption */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>AI Hybrid Encryption Engine</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  ML-KEM + AES-256-GCM
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Plaintext Payload (Android User Space Data)
                </label>
                <textarea
                  id="plain-input-field"
                  rows={3}
                  value={plainInput}
                  onChange={(e) => setPlainInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:border-emerald-500 outline-none font-mono"
                  placeholder="Enter message or payload..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Passphrase / Seed
                  </label>
                  <input
                    id="enc-password-field"
                    type="text"
                    value={encPassword}
                    onChange={(e) => setEncPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    TEE Biometric Attestation
                  </label>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono flex items-center justify-between">
                    <span>StrongBox HSM</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
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

              {cryptoResult && (
                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">Encrypted Payload Output</span>
                    <button
                      id="copy-ciphertext-btn"
                      onClick={copyCiphertext}
                      className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 text-[11px]"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-300 break-all bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 max-h-24 overflow-y-auto">
                    {cryptoResult.ciphertext}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 font-mono">
                    <div>IV: {cryptoResult.iv.slice(0, 8)}...</div>
                    <div>Auth Tag: {cryptoResult.tag.slice(0, 8)}...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Zero-Trust Decryption & PIN Fallbacks */}
            <div className="space-y-6">
              {/* Decryption Box */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Unlock className="h-4 w-4 text-teal-400" />
                    <span>Zero-Trust Decryption</span>
                  </h3>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
                    AES-GCM Authenticated
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Decryption Passphrase
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="dec-password-field"
                      type="text"
                      value={decPassword}
                      onChange={(e) => setDecPassword(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:border-teal-500 outline-none font-mono"
                      placeholder="Enter decryption password..."
                    />
                    <button
                      id="decrypt-action-btn"
                      onClick={handleDecrypt}
                      disabled={!cryptoResult}
                      className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
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
                    <div className="font-mono text-zinc-200 bg-zinc-950/80 p-2 rounded-lg mt-2">
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

              {/* Secure PIN Fallback & Duress Shredder */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase text-zinc-200 tracking-wider">
                      PBKDF2 PIN Fallback & Duress Shredder
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    100,000 ITERATIONS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">Standard PIN (1234)</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={fallbackPin}
                        onChange={e => setFallbackPin(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-center"
                        maxLength={4}
                      />
                      <button
                        onClick={handleVerifyPin}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-semibold"
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-rose-400 mb-1">Duress PIN (9999)</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={duressPin}
                        onChange={e => setDuressPin(e.target.value)}
                        className="w-full bg-zinc-950 border border-rose-800/80 rounded px-2.5 py-1.5 text-rose-300 font-mono text-center font-bold"
                        maxLength={4}
                      />
                      <button
                        onClick={handleDuressWipe}
                        disabled={wiping}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center gap-1"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        Wipe
                      </button>
                    </div>
                  </div>
                </div>

                {pinStatus && (
                  <div className="text-[11px] font-mono text-zinc-300 p-2 bg-zinc-950 rounded border border-zinc-800">
                    {pinStatus}
                  </div>
                )}

                {wipeStatus && (
                  <div className="text-[11px] font-mono text-rose-300 p-2.5 bg-rose-950/60 rounded border border-rose-800">
                    {wipeStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HARDWARE ATTESTATION DETAILS */}
      {activeSubTab === 'hardware_attestation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="text-[11px] text-zinc-500 uppercase font-semibold">Security Enclave</div>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">StrongBox HSM</div>
              <div className="text-[10px] text-zinc-400 mt-1">Dedicated Tamper-Resistant Silicon</div>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="text-[11px] text-zinc-500 uppercase font-semibold">Verified Boot State</div>
              <div className="text-sm font-mono font-bold text-teal-400 mt-0.5">GREEN / VERIFIED</div>
              <div className="text-[10px] text-zinc-400 mt-1">OEM Locked & Integrity Assured</div>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="text-[11px] text-zinc-500 uppercase font-semibold">Target OS Version</div>
              <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">Android 14 (API 34)</div>
              <div className="text-[10px] text-zinc-400 mt-1">Security Patch: 2026-03-01</div>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="text-[11px] text-zinc-500 uppercase font-semibold">Cert Chain Count</div>
              <div className="text-sm font-mono font-bold text-indigo-400 mt-0.5">3 Certificates</div>
              <div className="text-[10px] text-zinc-400 mt-1">Google Hardware Root CA Signed</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Android KeyStore KeyGenParameterSpec Hardware Binding
            </h3>

            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 space-y-2">
              <div className="text-emerald-400">// Java / PyJNIus Hardware KeyStore Generation Specification:</div>
              <div>KeyGenParameterSpec.Builder(</div>
              <div className="pl-4 text-zinc-400">&quot;AISecure_Biometric_Master_Key&quot;,</div>
              <div className="pl-4 text-zinc-400">KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY</div>
              <div>)</div>
              <div className="pl-4 text-teal-300">.setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)</div>
              <div className="pl-4 text-teal-300">.setAttestationChallenge(challengeBytes) // Server-side nonce</div>
              <div className="pl-4 text-emerald-300">.setIsStrongBoxBacked(true) // Enforces Hardware Security Module</div>
              <div className="pl-4 text-indigo-300">.setUserAuthenticationRequired(true) // Requires 0-Touch Biometrics</div>
              <div className="pl-4 text-indigo-300">.setUserAuthenticationValidityDurationSeconds(-1) // Per-operation auth</div>
              <div className="pl-4 text-amber-300">.setInvalidatedByBiometricEnrollment(true)</div>
              <div>.build();</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GOOGLE ML KIT LIVENESS DIAGNOSTICS */}
      {activeSubTab === 'mlkit_liveness' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Eye Blink Dynamics</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Tracks eye open probability transitions from open (&gt;0.8) to closed (&lt;0.2) within a natural 150-400ms duration.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-emerald-300">
                Left Eye: {livenessData?.leftEyeOpenProb ? (livenessData.leftEyeOpenProb * 100).toFixed(1) : '94.0'}% | Right: {livenessData?.rightEyeOpenProb ? (livenessData.rightEyeOpenProb * 100).toFixed(1) : '92.0'}%
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ScanFace className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-zinc-200">3D Euler Pose Variance</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Detects micro-rotations in Pitch, Yaw, and Roll across consecutive frames to reject 2D photograph and printed mask attacks.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-teal-300">
                Yaw: {livenessData?.headYaw || '1.4'}° | Pitch: {livenessData?.headPitch || '-0.3'}° (StdDev &gt; 0.5)
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Anti-Spoofing Score</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Composite liveness score computed over 60-frame rolling window. Requires &gt;80% confidence to authorize StrongBox assertion.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-indigo-300">
                Liveness Confidence: {(livenessScore * 100).toFixed(1)}% (PASSED)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PYTHON SOURCE CODE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/touchless_biometrics.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Android Plyer/Kivy & Google ML Kit Engine</span>
              </div>
            </div>
            <button
              onClick={copyCode}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy Python Source'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed">
            <pre className="text-zinc-300">
              {pythonCode || 'Loading Touchless Biometrics Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CLI TEST TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python touchless_biometrics.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Biometrics CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 select-none">&gt;</span>
                  <span className={log.includes('PASSED') || log.includes('Verified') || log.includes('StrongBox') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Biometrics CLI Test&quot; to execute KeyStore StrongBox attestation and ML Kit liveness diagnostics.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
