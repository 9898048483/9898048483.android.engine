import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Flame, 
  KeyRound, 
  Cpu, 
  RefreshCw, 
  Terminal, 
  FileCode, 
  Copy, 
  Check, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Radio, 
  EyeOff, 
  Sparkles, 
  Trash2, 
  ShieldCheck, 
  Database,
  Layers,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  FileCheck
} from 'lucide-react';
import { DuressSecurityProfileDTO, PanicExecutionAuditDTO } from '../types';

export const DuressShredderExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'keypad' | 'memory_zeroizer' | 'profile_config' | 'audit_trail' | 'python_source' | 'cli_trace'>('keypad');
  
  // Profile State
  const [profile, setProfile] = useState<DuressSecurityProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<PanicExecutionAuditDTO[]>([]);

  // Keypad & PIN Evaluation
  const [inputPin, setInputPin] = useState<string>('');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<{
    action: string;
    mode: string;
    message: string;
    accessGranted: boolean;
    isDecoy?: boolean;
    audit?: PanicExecutionAuditDTO;
    remainingAttempts?: number;
    error?: string;
  } | null>(null);

  // Configuration Form
  const [configMaster, setConfigMaster] = useState<string>('7789');
  const [configDuress, setConfigDuress] = useState<string>('9911');
  const [configDecoy, setConfigDecoy] = useState<string>('1234');
  const [configMaxFails, setConfigMaxFails] = useState<number>(3);
  const [configAutoShred, setConfigAutoShred] = useState<boolean>(true);
  const [configOnion, setConfigOnion] = useState<string>('panic9x4torv3defensealert77.onion');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);

  // Manual Wipe Controls
  const [shredMethod, setShredMethod] = useState<'ZERO_FILL' | 'DOD_5220_22_M' | 'GUTMANN_LITE'>('DOD_5220_22_M');
  const [wiping, setWiping] = useState<boolean>(false);

  // Python Code & CLI trace
  const [pythonCode, setPythonCode] = useState<string>('');
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Load Profile and Audit Logs
  const loadProfileAndAudits = async () => {
    setLoadingProfile(true);
    try {
      const [resProfile, resAudits] = await Promise.all([
        fetch('/api/duress/profile?userId=operator_alpha'),
        fetch('/api/duress/audit-log')
      ]);

      const dataProfile = await resProfile.json();
      if (dataProfile.success && dataProfile.profile) {
        setProfile(dataProfile.profile);
      }

      const dataAudits = await resAudits.json();
      if (dataAudits.success && dataAudits.logs) {
        setAuditLogs(dataAudits.logs);
      }
    } catch (err) {
      console.error('Failed to load duress data:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfileAndAudits();

    fetch('/api/duress/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load python source:', err));
  }, []);

  // Handle PIN Keypad Click
  const handleKeypadPress = (val: string) => {
    if (inputPin.length < 8) {
      setInputPin(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setInputPin(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setInputPin('');
    setAuthResult(null);
  };

  // Submit PIN for Duress Evaluation
  const handleEvaluatePin = async (pinToTest?: string) => {
    const pin = pinToTest || inputPin;
    if (!pin) return;
    setEvaluating(true);
    setAuthResult(null);
    try {
      const res = await fetch('/api/duress/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'operator_alpha', inputPin: pin })
      });
      const data = await res.json();
      setAuthResult(data);
      loadProfileAndAudits();
    } catch (err: any) {
      setAuthResult({
        action: 'ERROR',
        mode: 'NETWORK_ERROR',
        message: err.message,
        accessGranted: false
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Save Configuration
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg(null);
    try {
      const res = await fetch('/api/duress/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'operator_alpha',
          masterPin: configMaster,
          duressPanicPin: configDuress,
          decoyPin: configDecoy,
          failedAttemptsAllowed: configMaxFails,
          autoShredOnMaxFails: configAutoShred,
          torPanicBeaconOnion: configOnion
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfigMsg('✅ Duress security policy updated successfully.');
        loadProfileAndAudits();
      } else {
        setConfigMsg(`❌ Update failed: ${data.error}`);
      }
    } catch (e: any) {
      setConfigMsg(`❌ Error: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Trigger Manual Panic Self-Destruct
  const handleManualPanic = async () => {
    if (!confirm('⚠️ CRITICAL EMERGENCY WARNING: Triggering Hardware Cryptographic Self-Destruct will zeroize all RAM keys (ctypes.memset), wipe filesystem inodes, and transmit out-of-band Tor panic beacons. Proceed?')) {
      return;
    }
    setWiping(true);
    try {
      const res = await fetch('/api/duress/manual-shred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'operator_alpha',
          shredMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuthResult({
          action: 'PANIC_FULL_SHRED',
          mode: 'MANUAL_DESTRUCT',
          message: data.message,
          accessGranted: false,
          audit: data.audit
        });
        loadProfileAndAudits();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWiping(false);
    }
  };

  // Run CLI Test
  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/duress/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run duress CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div id="duress-shredder-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-rose-950/40 to-zinc-900 border border-rose-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                Prompt 7 Cyber Defense & Anti-Forensics
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                ctypes.memset RAM Zeroizer & Self-Destruct
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-rose-400" />
              Duress PIN & Hardware Cryptographic Self-Destruct Wipe
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Fail-safe coercion defense engine that detects secondary panic PINs, zeroes master encryption keys in memory via low-level
              <code className="text-rose-300 font-mono mx-1">ctypes.memset</code>, purges cryptographic contexts, and performs multi-pass anti-forensic storage shredding.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProfileAndAudits}
              disabled={loadingProfile}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProfile ? 'animate-spin' : ''}`} />
              Refresh Security State
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('keypad')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'keypad'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Duress Keypad & Auth Discrimination
          </button>
          <button
            onClick={() => setActiveSubTab('memory_zeroizer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'memory_zeroizer'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            ctypes.memset RAM Sanitizer
          </button>
          <button
            onClick={() => setActiveSubTab('profile_config')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'profile_config'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            3-Tier PIN Profiles & Policy
          </button>
          <button
            onClick={() => setActiveSubTab('audit_trail')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'audit_trail'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Panic Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('python_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_source'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Python Service (duress_shredder.py)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('cli_trace');
              if (cliLogs.length === 0) handleRunCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_trace'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Anti-Forensics CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DURESS KEYPAD & PIN DISCRIMINATOR */}
      {activeSubTab === 'keypad' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Interactive Anti-Coercion PIN Keypad */}
          <div className="lg:col-span-5 p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-400" />
                  Terminal Auth Discriminator
                </h3>
                <span className="text-xs text-zinc-400">Constant-time PBKDF2 verification</span>
              </div>
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                profile?.isLockoutImminent
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-zinc-800 text-zinc-300'
              }`}>
                Fails: {profile?.failedAttemptsCurrent || 0}/{profile?.failedAttemptsAllowed || 3}
              </span>
            </div>

            {/* PIN Display */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center space-y-1.5">
              <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                Protected PIN Entry
              </div>
              <div className="text-3xl font-mono font-bold tracking-[0.3em] text-zinc-100 min-h-[44px] flex items-center justify-center">
                {inputPin ? '•'.repeat(inputPin.length) : <span className="text-zinc-600 font-normal text-sm tracking-normal">Enter Passcode</span>}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Supports Standard PIN (7789), Decoy PIN (1234), Panic PIN (9911)
              </div>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className="py-3.5 bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-700 text-lg font-mono font-bold text-zinc-200 rounded-xl border border-zinc-800 hover:border-zinc-700 transition"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleKeypadClear}
                className="py-3.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-mono font-semibold text-zinc-400 rounded-xl border border-zinc-800 transition"
              >
                CLEAR
              </button>
              <button
                onClick={() => handleKeypadPress('0')}
                className="py-3.5 bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-700 text-lg font-mono font-bold text-zinc-200 rounded-xl border border-zinc-800 transition"
              >
                0
              </button>
              <button
                onClick={handleKeypadBackspace}
                className="py-3.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-mono font-semibold text-zinc-400 rounded-xl border border-zinc-800 transition"
              >
                DEL
              </button>
            </div>

            {/* Evaluate Button */}
            <button
              onClick={() => handleEvaluatePin()}
              disabled={evaluating || !inputPin}
              className="w-full py-3 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition"
            >
              {evaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Authenticate PIN</span>
            </button>

            {/* Preset Test Buttons for Quick Evaluation */}
            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Simulate Trigger Scenarios:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setInputPin('7789');
                    handleEvaluatePin('7789');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-lg text-[11px] font-mono font-semibold transition text-center truncate"
                >
                  Master: 7789
                </button>
                <button
                  onClick={() => {
                    setInputPin('1234');
                    handleEvaluatePin('1234');
                  }}
                  className="px-2.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded-lg text-[11px] font-mono font-semibold transition text-center truncate"
                >
                  Decoy: 1234
                </button>
                <button
                  onClick={() => {
                    setInputPin('9911');
                    handleEvaluatePin('9911');
                  }}
                  className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-[11px] font-mono font-semibold transition text-center truncate animate-pulse"
                >
                  Panic: 9911
                </button>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Real-Time Panic Evaluation & Execution Terminal */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Status Card */}
            <div className={`p-6 rounded-xl border transition-all shadow-xl ${
              authResult?.action === 'PANIC_FULL_SHRED'
                ? 'bg-rose-950/30 border-rose-500 shadow-rose-950/40'
                : authResult?.action === 'DECOY_AUTH'
                ? 'bg-blue-950/30 border-blue-500 shadow-blue-950/40'
                : authResult?.action === 'STANDARD_AUTH'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-emerald-950/40'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {authResult?.action === 'PANIC_FULL_SHRED' ? (
                    <Flame className="w-6 h-6 text-rose-400 animate-bounce" />
                  ) : authResult?.action === 'DECOY_AUTH' ? (
                    <EyeOff className="w-6 h-6 text-blue-400" />
                  ) : authResult?.action === 'STANDARD_AUTH' ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Radio className="w-6 h-6 text-zinc-400" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">
                      {authResult?.action === 'PANIC_FULL_SHRED'
                        ? 'CRITICAL DEFENSE: CRYPTOGRAPHIC SELF-DESTRUCT ENGAGED'
                        : authResult?.action === 'DECOY_AUTH'
                        ? 'PLAUSIBLE DENIABILITY DECOY MODE ACTIVE'
                        : authResult?.action === 'STANDARD_AUTH'
                        ? 'OPERATIONAL CLEARANCE GRANTED'
                        : 'Awaiting PIN Verification'}
                    </h4>
                    <span className="text-xs text-zinc-400 font-mono">
                      Target Identity: operator_alpha
                    </span>
                  </div>
                </div>

                {authResult && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                    authResult.action === 'PANIC_FULL_SHRED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : authResult.action === 'DECOY_AUTH'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : authResult.action === 'STANDARD_AUTH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {authResult.mode || authResult.action}
                  </span>
                )}
              </div>

              {authResult ? (
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 font-mono text-xs text-zinc-200">
                    {authResult.message || authResult.error}
                  </div>

                  {authResult.audit && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block uppercase">RAM Keys Overwritten</span>
                        <strong className="text-rose-400 text-sm">{authResult.audit.memoryKeysZeroized} Contexts</strong>
                        <span className="text-[10px] text-zinc-500 block">via ctypes.memset</span>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block uppercase">Files Shredded</span>
                        <strong className="text-amber-400 text-sm">{authResult.audit.storageFilesShredded} Inodes</strong>
                        <span className="text-[10px] text-zinc-500 block">DoD 5220.22-M</span>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block uppercase">Tor Beacon</span>
                        <strong className="text-indigo-400 text-sm">Dispatched</strong>
                        <span className="text-[10px] text-zinc-500 block truncate">v3 Onion</span>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block uppercase">Destruct Time</span>
                        <strong className="text-emerald-400 text-sm">{authResult.audit.durationMs} ms</strong>
                        <span className="text-[10px] text-zinc-500 block">Instant Purge</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs text-zinc-500">
                  Use the Keypad on the left or click one of the preset scenario triggers to evaluate the anti-forensics engine.
                </div>
              )}
            </div>

            {/* Quick Manual Self-Destruct Trigger */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Hardware Manual Panic Wipe Trigger
                </h4>
                <select
                  value={shredMethod}
                  onChange={(e) => setShredMethod(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-300 font-mono outline-none"
                >
                  <option value="DOD_5220_22_M">DoD 5220.22-M (3-Pass: 0x00, 0xFF, CSPRNG)</option>
                  <option value="ZERO_FILL">Zero Fill (1-Pass 0x00)</option>
                  <option value="GUTMANN_LITE">Gutmann-Lite (4-Pass Overwrite)</option>
                </select>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Emergency manual panic button immediately zeroes all in-memory cryptographic handles, overrides active TEE attestation sessions, and truncates file tables.
              </p>

              <button
                onClick={handleManualPanic}
                disabled={wiping}
                className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-700 to-red-800 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Flame className="w-4 h-4" />
                <span>Execute Emergency Self-Destruct</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CTYPES.MEMSET RAM SANITIZER */}
      {activeSubTab === 'memory_zeroizer' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              Low-Level Memory Clearing via ctypes.memset
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
              Standard Python object deallocation does not guarantee memory sanitization due to garbage collection delays and memory fragmentation.
              The anti-forensics engine invokes low-level C runtime memory primitives (`ctypes.memset`, `ctypes.memmove`, and `malloc_trim`) to
              physically overwrite raw RAM buffers with multi-pass noise before reclaiming memory addresses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                <span className="text-xs font-bold text-amber-400">Pass 1: Zeroize (0x00)</span>
                <p className="text-[11px] text-zinc-400">
                  <code className="text-zinc-300 font-mono text-[10px]">ctypes.memset(addr, 0x00, size)</code> zeroes out active key pointers.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                <span className="text-xs font-bold text-rose-400">Pass 2: CSPRNG Noise</span>
                <p className="text-[11px] text-zinc-400">
                  Overwrites bytes with TRNG / CSPRNG entropy to prevent cold-boot remanence attacks.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                <span className="text-xs font-bold text-emerald-400">Pass 3: Heap Trim</span>
                <p className="text-[11px] text-zinc-400">
                  Executes <code className="text-zinc-300 font-mono text-[10px]">malloc_trim(0)</code> &amp; multi-generation GC sweeps.
                </p>
              </div>
            </div>
          </div>

          {/* Active RAM Key Buffer Registry */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Active In-Memory Cryptographic Contexts
              </h3>
              <span className="text-xs text-zinc-400">
                {profile?.activeMemoryContexts?.length || 0} Monitored Memory Buffers
              </span>
            </div>

            <div className="space-y-3">
              {profile?.activeMemoryContexts && profile.activeMemoryContexts.length > 0 ? (
                profile.activeMemoryContexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-amber-400" />
                        <span className="font-mono font-bold text-xs text-zinc-200">{ctx.id}</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                          ACTIVE IN RAM
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 font-mono">
                        Buffer Allocation: {ctx.sizeBytes} Bytes • Created: {new Date(ctx.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-xs font-mono text-zinc-400">
                      Protected via <strong className="text-rose-300">ctypes.memset Hook</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-500 font-mono">
                  All active cryptographic RAM buffers have been zeroized and purged.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 3-TIER PIN PROFILES & POLICY */}
      {activeSubTab === 'profile_config' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Configure 3-Tier Duress PIN Discriminator
            </h3>

            {configMsg && (
              <div className={`p-3 rounded-lg border text-xs font-mono ${
                configMsg.includes('✅')
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {configMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-800/60 space-y-2">
                <label className="block text-xs font-bold text-emerald-400">1. Master Access PIN</label>
                <input
                  type="password"
                  value={configMaster}
                  onChange={(e) => setConfigMaster(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  placeholder="e.g. 7789"
                />
                <span className="text-[10px] text-zinc-500 block">Grants full operational clearance.</span>
              </div>

              <div className="p-4 bg-zinc-950 rounded-xl border border-blue-800/60 space-y-2">
                <label className="block text-xs font-bold text-blue-400">2. Decoy PIN (Plausible Deniability)</label>
                <input
                  type="password"
                  value={configDecoy}
                  onChange={(e) => setConfigDecoy(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  placeholder="e.g. 1234"
                />
                <span className="text-[10px] text-zinc-500 block">Mounts harmless decoy files &amp; silent beacon.</span>
              </div>

              <div className="p-4 bg-zinc-950 rounded-xl border border-rose-800/60 space-y-2">
                <label className="block text-xs font-bold text-rose-400">3. Duress Panic PIN (Self-Destruct)</label>
                <input
                  type="password"
                  value={configDuress}
                  onChange={(e) => setConfigDuress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  placeholder="e.g. 9911"
                />
                <span className="text-[10px] text-zinc-500 block">Instant zeroization &amp; filesystem shred.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Max Failed Attempts Before Auto-Shred</label>
                <input
                  type="number"
                  value={configMaxFails}
                  onChange={(e) => setConfigMaxFails(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tor Out-of-Band Panic Beacon Onion Address</label>
                <input
                  type="text"
                  value={configOnion}
                  onChange={(e) => setConfigOnion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autoShredCheckbox"
                checked={configAutoShred}
                onChange={(e) => setConfigAutoShred(e.target.checked)}
                className="w-4 h-4 accent-rose-500"
              />
              <label htmlFor="autoShredCheckbox" className="text-xs text-zinc-300 select-none">
                Enable Fail-Safe: Automatically trigger Level-3 Full Shred if maximum failed attempts are exceeded.
              </label>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Duress PIN Security Policy</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PANIC AUDIT TRAIL */}
      {activeSubTab === 'audit_trail' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Emergency Duress &amp; Anti-Forensics Audit Trail
            </h3>
            <span className="text-xs text-zinc-400">{auditLogs.length} events logged</span>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        log.severity === 'PANIC_FULL_SHRED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : log.severity === 'DECOY_AUTH'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {log.severity}
                      </span>
                      <strong className="text-xs font-mono text-zinc-200">{log.triggerSource}</strong>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                    <div>
                      <span className="text-zinc-500">RAM Overwrite: </span>
                      <strong className="text-rose-400">{log.memoryKeysZeroized} keys (ctypes.memset)</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Files Shredded: </span>
                      <strong className="text-amber-400">{log.storageFilesShredded} files ({log.totalBytesShredded} B)</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Tor Beacon: </span>
                      <strong className="text-indigo-400">{log.torBeaconDispatched ? 'Sent' : 'None'}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Duration: </span>
                      <strong className="text-emerald-400">{log.durationMs} ms</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                No panic self-destruct events recorded in current audit session.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PYTHON SOURCE CODE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-rose-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/duress_shredder.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Cyber Defense &amp; Anti-Forensics Engine</span>
              </div>
            </div>
            <button
              onClick={copyCode}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy Python Source'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed">
            <pre className="text-zinc-300">
              {pythonCode || 'Loading Duress Shredder Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TEST TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-rose-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python duress_shredder.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Anti-Forensics CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-rose-400 select-none">&gt;</span>
                  <span className={log.includes('DESTROYED') || log.includes('TRIGGERED') ? 'text-rose-400 font-semibold' : log.includes('SUCCESSFULLY') || log.includes('STANDARD_AUTH') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Anti-Forensics CLI Test&quot; to execute duress discrimination, ctypes.memset RAM wiping, and disk shredding.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
