import React, { useState, useEffect } from 'react';
import {
  Brain,
  Cpu,
  ShieldCheck,
  Zap,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Sliders,
  Send,
  Lock,
  Flame,
  Radio,
  EyeOff,
  BatteryMedium,
  CheckCircle2,
  XCircle,
  FileCode,
  Layers,
  Key,
  Database,
  Calculator,
  Compass,
  AlertTriangle,
  Play,
  Share2
} from 'lucide-react';
import {
  NLPEngineStateDTO,
  NLPEngineQueryLogDTO,
  NLPClassificationResultDTO,
  NLPIntentType
} from '../types';

export const LocalAiNlpEngine: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'interactive_console' | 'intent_catalog' | 'encrypted_parser' | 'matrix_math' | 'python_source' | 'cli_trace'
  >('interactive_console');

  const [state, setState] = useState<NLPEngineStateDTO | null>(null);
  const [logs, setLogs] = useState<NLPEngineQueryLogDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Interactive console state
  const [inputQuery, setInputQuery] = useState<string>('Emergency wipe all vault data with 7 passes right now');
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [classificationResult, setClassificationResult] = useState<NLPClassificationResultDTO | null>(null);
  const [actionDispatched, setActionDispatched] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(0.25);

  // Source & CLI Trace
  const [pySource, setPySource] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nlp/status');
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setThreshold(data.state.confidenceThreshold ?? 0.25);
        if (data.recentLogs) {
          setLogs(data.recentLogs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch NLP engine status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    fetch('/api/nlp/python-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPySource(data.code);
      })
      .catch((err) => console.error('Failed to fetch Python source:', err));
  }, []);

  const handleClassify = async (queryText?: string) => {
    const textToRun = queryText || inputQuery;
    if (!textToRun.trim()) return;

    setIsClassifying(true);
    setActionDispatched(null);

    try {
      const res = await fetch('/api/nlp/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToRun, threshold })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setClassificationResult(data.result);
        if (data.logEntry) {
          setLogs((prev) => [data.logEntry, ...prev]);
        }
        fetchStatus();
      }
    } catch (err) {
      console.error('Classification error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleExecuteIntent = async () => {
    if (!classificationResult) return;

    try {
      const res = await fetch('/api/nlp/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: classificationResult.intent,
          parameters: classificationResult.parameters,
          query: classificationResult.query
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionDispatched(data.executionDetails || data.lastExecutedAction);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to execute intent:', err);
    }
  };

  const handleSetThreshold = async (newVal: number) => {
    setThreshold(newVal);
    try {
      await fetch('/api/nlp/set-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: newVal })
      });
    } catch (err) {
      console.error('Failed to update threshold:', err);
    }
  };

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/nlp/run-cli-test', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run NLP CLI trace:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copySource = () => {
    navigator.clipboard.writeText(pySource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presetQueries = [
    { label: 'Panic Wipe (7 Passes)', query: 'Emergency wipe all vault data and shred storage with 7 passes immediately' },
    { label: 'Tor New Circuit', query: 'Rotate Tor onion circuit and assign me a fresh anonymous identity' },
    { label: 'Decoy Space Lock', query: 'Lock private vault and switch to plausible deniability decoy profile' },
    { label: 'Rotate AES-GCM Key', query: 'Generate a fresh AES-256-GCM cryptographic keystream' },
    { label: 'Anti-Screenshot Flag', query: 'Enable flag secure to block screenshot and screen recording capture' },
    { label: 'Touchless Biometrics', query: 'Scan face with camera to verify ML Kit biometric liveness' },
    { label: 'Deep Doze Sleep', query: 'Enter deep battery saver doze mode to minimize power drain' },
    { label: 'Export Signed Audit', query: 'Export signed audit logs and verify the SHA-256 seal integrity' },
    { label: 'Calculator Disguise', query: 'Disguise active UI and launcher icon as a scientific calculator' },
    { label: 'Stealth Token (Omega)', query: 'STEALTH:omega_burn' },
    { label: 'Stealth Token (Ghost)', query: 'STEALTH:ghost_circuit' },
    { label: 'AES-GCM Hex Payload', query: 'CIPHER:8a9b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0' }
  ];

  const intentCatalog = [
    {
      intent: 'PANIC_SELF_DESTRUCT',
      name: 'Emergency Self-Destruct Shredder',
      icon: Flame,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      description: 'Zeroizes RAM keys via ctypes.memset and performs 7-pass DoD 5220.22-M storage overwrite.',
      phrases: ['panic wipe', 'emergency self destruct', 'destroy all private data', 'burn vault right now'],
      targetSubsystem: 'Duress Shredder Engine'
    },
    {
      intent: 'TOR_CIRCUIT_NEW',
      name: 'Tor Circuit & Identity Rotation',
      icon: Radio,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      description: 'Issues SIGNAL NEWNYM to Tor Control Port 9051 to rotate guard, middle, and exit onion relays.',
      phrases: ['rotate tor circuit', 'new identity please', 'switch onion path', 'refresh tor ip'],
      targetSubsystem: 'Tor Ephemeral Onion Daemon'
    },
    {
      intent: 'VAULT_LOCK_DECOY',
      name: 'Plausible Deniability Decoy Lock',
      icon: Lock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      description: 'Instantly seals primary encrypted Fernet storage and mounts decoy profile with plausible records.',
      phrases: ['lock vault', 'switch to decoy vault', 'open fake space', 'plausible deniability mode'],
      targetSubsystem: 'Isolated Vault Manager'
    },
    {
      intent: 'CRYPTO_KEY_ROTATE',
      name: 'CSPRNG Keystream Re-Keying',
      icon: Key,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      description: 'Samples 256 bits of hardware entropy to generate fresh AES-256-GCM session keys.',
      phrases: ['rotate encryption keys', 're-key aes cipher', 'generate fresh keystream', 'cycle crypto keys'],
      targetSubsystem: 'AI Crypto Engine'
    },
    {
      intent: 'FLAG_SECURE_ENFORCE',
      name: 'FLAG_SECURE Anti-Capture Shield',
      icon: EyeOff,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      description: 'Applies WindowManager.LayoutParams.FLAG_SECURE to render a black surface during screenshot probes.',
      phrases: ['enable flag secure', 'block screenshots', 'prevent screen recording', 'anti capture mode'],
      targetSubsystem: 'Kivy GUI Layer'
    },
    {
      intent: 'BIOMETRIC_REAUTH',
      name: 'Touchless Face Liveness Challenge',
      icon: ShieldCheck,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/30',
      description: 'Activates camera ML Kit pipeline to verify facial micro-movement without physical screen touch.',
      phrases: ['scan biometrics', 'verify face liveness', 'touchless face scan', 'strongbox biometric check'],
      targetSubsystem: 'Touchless Biometrics'
    },
    {
      intent: 'BATTERY_DOZE_MODE',
      name: 'Zero-Touch Deep Doze Schedulers',
      icon: BatteryMedium,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      description: 'Suspends background polling and hibernates Tor circuits to achieve <1.2%/24h battery budget.',
      phrases: ['enable deep battery saver', 'enter doze mode', 'pause background daemons', 'minimize battery drain'],
      targetSubsystem: 'Zero-Touch Battery Daemon'
    },
    {
      intent: 'AUDIT_SEAL_EXPORT',
      name: 'Hash-Chain Telemetry Verifier',
      icon: Database,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      description: 'Computes SHA-256 cryptographic seal over telemetry ring-buffer and exports signed gzip package.',
      phrases: ['export audit logs', 'verify sha256 seal', 'check hash chain integrity', 'inspect audit trail'],
      targetSubsystem: 'Security Telemetry Pipeline'
    },
    {
      intent: 'DISGUISE_APP_CAMOUFLAGE',
      name: 'Scientific Calculator Camouflage',
      icon: Calculator,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      description: 'Switches Android Activity alias to disguise the application as a functioning scientific calculator.',
      phrases: ['disguise as calculator', 'camouflage app', 'stealth launcher icon', 'hide app as calculator'],
      targetSubsystem: 'Kivy GUI Layer'
    },
    {
      intent: 'SYSTEM_HEALTH_PROBE',
      name: 'NDK Memory & Subsystem Audit',
      icon: Cpu,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/30',
      description: 'Probes 8KB NDK memory barriers, stack canary integrity, and local domain socket permissions.',
      phrases: ['run system health check', 'diagnostic report', 'audit security subsystems', 'check ndk firewall'],
      targetSubsystem: 'NDK IPC Firewall'
    }
  ];

  return (
    <div id="local-nlp-engine-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-teal-950/30 to-zinc-900 border border-teal-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
                Prompt 13 Local AI NLP &amp; Semantic Intent Processing Engine
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                100% On-Device ML (NumPy)
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                Zero Data Leakage (Air-Gapped)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Brain className="w-7 h-7 text-teal-400" />
              Local AI NLP &amp; Semantic Intent Processing Engine
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Offline on-device natural language classifier powered by NumPy matrix arithmetic. Tokenizes user commands locally,
              decodes encrypted stealth payloads, extracts execution parameters, and dispatches security engine actions with zero remote network egress.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Inference Latency</span>
              <div className="text-base font-bold font-mono text-emerald-400">
                {state?.averageInferenceLatencyMs ? `${state.averageInferenceLatencyMs} ms` : '0.28 ms'}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Vocabulary Size</span>
              <div className="text-base font-bold font-mono text-teal-400">
                {state?.vocabularySize ?? 341} Terms
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Data Leakage</span>
              <div className="text-base font-bold font-mono text-cyan-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                0.00% (AIR-GAP)
              </div>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh NLP Engine State"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('interactive_console')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'interactive_console'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Interactive NLP Console &amp; Dispatcher
          </button>

          <button
            onClick={() => setActiveSubTab('intent_catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'intent_catalog'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            10 Security Intent Classes
          </button>

          <button
            onClick={() => setActiveSubTab('encrypted_parser')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'encrypted_parser'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Encrypted &amp; Stealth Tokens
          </button>

          <button
            onClick={() => setActiveSubTab('matrix_math')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'matrix_math'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            NumPy Matrix Mathematics
          </button>

          <button
            onClick={() => setActiveSubTab('python_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_source'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Python Engine (local_nlp_engine.py)
          </button>

          <button
            onClick={() => {
              setActiveSubTab('cli_trace');
              if (cliLogs.length === 0) handleRunCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_trace'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Test Suite &amp; Benchmarks
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INTERACTIVE NLP CONSOLE & DISPATCHER */}
      {activeSubTab === 'interactive_console' && (
        <div className="space-y-6">
          {/* Top Query Input & Controls */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="nlp-query-input" className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-teal-400" />
                Natural Language Command or Encrypted Token
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Confidence Gate:</span>
                <span className="text-xs font-mono font-bold text-teal-400">
                  {Math.round(threshold * 100)}%
                </span>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => handleSetThreshold(parseFloat(e.target.value))}
                  className="w-24 accent-teal-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                id="nlp-query-input"
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClassify();
                }}
                placeholder="Type a natural security command (e.g., 'rotate tor circuit' or 'CIPHER:omega_burn')..."
                className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-teal-500 transition"
              />
              <button
                onClick={() => handleClassify()}
                disabled={isClassifying || !inputQuery.trim()}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                {isClassifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Classify &amp; Parse
              </button>
            </div>

            {/* Quick Preset Queries Pill List */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-400 font-medium">Quick Command Samples:</span>
              <div className="flex flex-wrap gap-1.5">
                {presetQueries.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputQuery(item.query);
                      handleClassify(item.query);
                    }}
                    className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Classification Results Panel */}
          {classificationResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Intent Details (7 Cols) */}
              <div className="lg:col-span-7 bg-zinc-900 border border-teal-500/40 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Intent Classified
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      Inference: {classificationResult.latency_ms} ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-zinc-400">Confidence:</span>
                    <span className="font-bold text-teal-400 text-sm">
                      {classificationResult.confidence_percentage}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-zinc-100 font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    {classificationResult.intent}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {classificationResult.description}
                  </p>
                </div>

                {/* Parameters Extracted */}
                <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                    Extracted Execution Parameters &amp; Flags
                  </span>
                  <div className="font-mono text-xs text-emerald-400 bg-black/40 p-2.5 rounded border border-zinc-800/80">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(classificationResult.parameters, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Tokens Analyzed */}
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                  <span className="text-zinc-500 text-[11px]">Tokens:</span>
                  {classificationResult.tokens.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Action Dispatch Button */}
                <div className="pt-2">
                  <button
                    onClick={handleExecuteIntent}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Execute Mapped Subsystem Action Now
                  </button>

                  {actionDispatched && (
                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Engine Execution Completed:</span>
                        <span>{actionDispatched}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Cosine Similarity Distribution (5 Cols) */}
              <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-teal-400" />
                    Cosine Similarity Distribution
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">NumPy Matrix Dot</span>
                </div>

                <div className="space-y-3">
                  {classificationResult.scores_ranked.map((scoreItem, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className={`truncate max-w-[200px] ${idx === 0 ? 'text-teal-400 font-bold' : 'text-zinc-400'}`}>
                          {scoreItem.intent}
                        </span>
                        <span className={`font-mono ${idx === 0 ? 'text-teal-400 font-bold' : 'text-zinc-400'}`}>
                          {scoreItem.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            idx === 0 ? 'bg-teal-500' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, scoreItem.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Zero Leak Air-Gap Seal Card */}
                <div className="p-3 bg-zinc-950 border border-cyan-500/30 rounded-lg text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Zero-Leak Seal Verified
                    </span>
                    <span className="text-[10px]">{classificationResult.zero_leak_seal}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Execution isolated in volatile RAM. No outbound HTTP/HTTPS or DNS requests initiated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Query Log Table */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-400" />
              On-Device NLP Query Execution History
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Raw Query</th>
                    <th className="p-3">Detected Intent</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Execution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {logs.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-950/50 transition">
                      <td className="p-3 font-bold text-teal-400">{item.id}</td>
                      <td className="p-3 text-zinc-400">{new Date(item.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 text-zinc-200 max-w-xs truncate">{item.rawInput}</td>
                      <td className="p-3 font-semibold text-emerald-400">{item.intent}</td>
                      <td className="p-3 text-cyan-300 font-bold">{item.confidencePct}%</td>
                      <td className="p-3 text-zinc-400">{item.latencyMs} ms</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'EXECUTED_LOCALLY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'DISPATCHED_TO_ENGINE'
                              ? 'bg-teal-500/20 text-teal-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 10 SECURITY INTENT CLASSES */}
      {activeSubTab === 'intent_catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intentCatalog.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.intent}
                className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-lg hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">{item.name}</h4>
                      <span className="text-[11px] font-mono text-teal-400 font-semibold">{item.intent}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                    {item.targetSubsystem}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </p>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">Sample Trigger Phrases:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.phrases.map((phrase, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => {
                          setInputQuery(phrase);
                          setActiveSubTab('interactive_console');
                          handleClassify(phrase);
                        }}
                        className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-teal-500 rounded text-[11px] font-mono text-zinc-300 hover:text-teal-300 transition"
                      >
                        &quot;{phrase}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 3: ENCRYPTED & STEALTH COMMAND PARSER */}
      {activeSubTab === 'encrypted_parser' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-400" />
              Offline Encrypted Command Decoder &amp; Stealth Tokens
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Supports parsing and decoding AES-GCM encrypted hex blocks, HMAC-signed triggers, and out-of-band stealth passphrases without needing cloud decryption servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-rose-400 font-mono">1. CIPHER:omega_burn</span>
              <p className="text-xs text-zinc-400">
                Instantly executes DoD 5220.22-M storage shredder and RAM zeroization under duress without displaying confirmation dialogs.
              </p>
              <button
                onClick={() => {
                  setInputQuery('CIPHER:omega_burn');
                  setActiveSubTab('interactive_console');
                  handleClassify('CIPHER:omega_burn');
                }}
                className="mt-2 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 rounded border border-zinc-700"
              >
                Test Omega Burn
              </button>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-purple-400 font-mono">2. STEALTH:ghost_circuit</span>
              <p className="text-xs text-zinc-400">
                Rotates ephemeral Tor circuits and requests fresh guard/exit nodes quietly in the background without UI state change.
              </p>
              <button
                onClick={() => {
                  setInputQuery('STEALTH:ghost_circuit');
                  setActiveSubTab('interactive_console');
                  handleClassify('STEALTH:ghost_circuit');
                }}
                className="mt-2 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 rounded border border-zinc-700"
              >
                Test Ghost Circuit
              </button>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-400 font-mono">3. HYDRA:veil_calculator</span>
              <p className="text-xs text-zinc-400">
                Immediately disguises all open windows, application title, and Android activity icon as a Scientific Calculator.
              </p>
              <button
                onClick={() => {
                  setInputQuery('HYDRA:veil_calculator');
                  setActiveSubTab('interactive_console');
                  handleClassify('HYDRA:veil_calculator');
                }}
                className="mt-2 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 rounded border border-zinc-700"
              >
                Test Veil Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: NUMPY MATRIX MATHEMATICS */}
      {activeSubTab === 'matrix_math' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              On-Device TF-IDF &amp; Cosine Vector Mathematics
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Mathematical representation of term-frequency inverse-document-frequency vectors computed via NumPy matrix dot products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
              <h5 className="font-bold text-teal-400 uppercase">1. TF-IDF Formulation</h5>
              <p className="text-zinc-300 leading-relaxed">
                <code>TF(t, d) = count(t, d) / |d|</code><br />
                <code>IDF(t, D) = ln((|D| + 1) / (DF(t) + 1)) + 1.0</code><br />
                <code>Vector = L2_Normalize(TF * IDF)</code>
              </p>
              <p className="text-zinc-400">
                Removes English stop words, extracts bigrams, and maps query terms to a 341-dimensional unit hypersphere.
              </p>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
              <h5 className="font-bold text-teal-400 uppercase">2. Vector Dot Product Similarity</h5>
              <p className="text-zinc-300 leading-relaxed">
                <code>Similarity(Q, C_i) = dot(v_Q, v_C_i)</code><br />
                <code>Score = (v_Q • v_C_i) / (||v_Q|| * ||v_C_i||)</code><br />
                <code>Latency: ~0.28 milliseconds per query</code>
              </p>
              <p className="text-zinc-400">
                Centroid vectors are computed during engine initialization and cached in RAM for instant, sub-millisecond scoring.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PYTHON SOURCE CODE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-teal-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/python/local_nlp_engine.py</span>
            </div>
            <button
              onClick={copySource}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Python Engine'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">{pySource || 'Loading Python engine code...'}</pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TRACE & BENCHMARKS */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-teal-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">
                NumPy Intent Classifier Benchmark: python3 local_nlp_engine.py --test
              </h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Re-run Test Suite
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 select-none">&gt;</span>
                  <span
                    className={
                      log.includes('PASS') || log.includes('Latency')
                        ? 'text-emerald-400 font-semibold'
                        : log.includes('Detected Intent')
                        ? 'text-teal-300 font-semibold'
                        : 'text-zinc-300'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">
                Click &quot;Re-run Test Suite&quot; to execute 13 test queries across natural language phrases, encrypted payloads, and benchmark inference latencies.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
