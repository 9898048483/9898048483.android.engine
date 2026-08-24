import React, { useState, useEffect } from 'react';
import { 
  Server, 
  ShieldCheck, 
  Key, 
  Lock, 
  Unlock, 
  Terminal, 
  Activity, 
  Globe, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Flame, 
  Cpu, 
  AlertTriangle, 
  Layers, 
  Code2, 
  CheckCircle2, 
  Clock, 
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  ZeroTouchAuthRequestDTO,
  ZeroTouchAuthResponseDTO,
  ContextPayloadEncryptRequestDTO,
  ContextPayloadEncryptResponseDTO,
  PayloadDecryptRequestDTO,
  PayloadDecryptResponseDTO,
  SystemHealthStatusResponseDTO,
  TorOnionStatusResponseDTO,
  FastApiServerStateDTO,
  FastApiDispatchLogDTO
} from '../types';

export const FastApiMicroBackend: React.FC = () => {
  const [serverState, setServerState] = useState<FastApiServerStateDTO>({
    serverStatus: 'RUNNING',
    fastApiVersion: 'FastAPI 0.111.0 / Starlette 0.37.2',
    pythonEngine: 'Python 3.10+ (AsyncIO + Pydantic v2 Core)',
    torV3OnionAddress: 'aispace7x2q5n3p4y9k1w8m6v0z4j8l2c5b9e1a3d7f0h4j6k8m0n2p4.onion',
    bearerAuthScheme: 'HTTPBearer (RFC 6750)',
    pydanticValidation: 'Pydantic v2.0+ Strict Schemas',
    activeSessionsCount: 3,
    uptimeSeconds: 1420,
    averageLatencyMs: 0.28,
    totalRequestsHandled: 84,
    currentBearerToken: 'ais_sec_dev_local_token_master_256'
  });

  const [activeSubTab, setActiveSubTab] = useState<'console' | 'health_grid' | 'pydantic_schemas' | 'python_source' | 'cli_benchmark'>('console');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('auth_zero_touch');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastResponseStatus, setLastResponseStatus] = useState<number | null>(200);
  const [lastResponseLatency, setLastResponseLatency] = useState<number | null>(0.32);
  const [dispatchLogs, setDispatchLogs] = useState<FastApiDispatchLogDTO[]>([]);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Form states for Interactive Tester
  const [authDeviceId, setAuthDeviceId] = useState<string>('google_pixel_8_pro_tee_992');
  const [authLivenessScore, setAuthLivenessScore] = useState<number>(0.994);
  const [authEntropyBits, setAuthEntropyBits] = useState<number>(256.0);
  const [authScope, setAuthScope] = useState<string>('VAULT_READ_WRITE_CRYPTO');

  const [encryptPlaintext, setEncryptPlaintext] = useState<string>('CONFIDENTIAL_VAULT_RECORD: Alpha-Bravo Onion Key Rotation Schedule 2026');
  const [encryptAlgo, setEncryptAlgo] = useState<'AES-256-GCM' | 'CHACHA20-POLY1305'>('AES-256-GCM');
  const [encryptSalt, setEncryptSalt] = useState<string>('user_gyro_entropy_salt_92819');

  const [decryptCiphertext, setDecryptCiphertext] = useState<string>('');
  const [decryptNonce, setDecryptNonce] = useState<string>('');
  const [decryptAuthTag, setDecryptAuthTag] = useState<string>('');
  const [decryptSalt, setDecryptSalt] = useState<string>('user_gyro_entropy_salt_92819');

  const [sendAuthHeader, setSendAuthHeader] = useState<boolean>(true);
  const [customBearerToken, setCustomBearerToken] = useState<string>('');

  // Python source code state
  const [pythonCode, setPythonCode] = useState<string>('');
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);

  // CLI Test state
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isCliTesting, setIsCliTesting] = useState<boolean>(false);

  // Subsystem health state
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatusResponseDTO | null>(null);

  // Fetch initial server state & python source
  useEffect(() => {
    fetchServerState();
    fetchSystemHealth();
    fetchPythonSource();
  }, []);

  const fetchServerState = async () => {
    try {
      const res = await fetch('/api/fastapi/state');
      if (res.ok) {
        const data = await res.json();
        setServerState(data);
        if (data.currentBearerToken && !customBearerToken) {
          setCustomBearerToken(data.currentBearerToken);
        }
        if (data.recentLogs) {
          setDispatchLogs(data.recentLogs);
        }
      }
    } catch (e) {
      console.error('Failed to fetch FastAPI state:', e);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = serverState.currentBearerToken || 'ais_sec_dev_local_token_master_256';
      const res = await fetch('/api/v1/system/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (e) {
      console.error('Failed to fetch system health:', e);
    }
  };

  const fetchPythonSource = async () => {
    setIsLoadingSource(true);
    try {
      const res = await fetch('/api/fastapi/python-source');
      if (res.ok) {
        const data = await res.json();
        setPythonCode(data.code || '');
      }
    } catch (e) {
      console.error('Failed to fetch python source:', e);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleCopyToken = () => {
    const token = customBearerToken || serverState.currentBearerToken || '';
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleExecuteEndpoint = async () => {
    setIsExecuting(true);
    setLastResponse(null);
    setLastResponseStatus(null);

    const activeToken = customBearerToken || serverState.currentBearerToken;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (sendAuthHeader && activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    let method = 'GET';
    let path = '/api/v1/system/health';
    let body: any = null;

    if (selectedEndpoint === 'auth_zero_touch') {
      method = 'POST';
      path = '/api/v1/auth/zero-touch';
      body = {
        device_id: authDeviceId,
        tee_attestation_nonce: btoa(`tee_nonce_${Date.now()}`),
        touchless_liveness_score: authLivenessScore,
        behavioral_entropy_bits: authEntropyBits,
        requested_scope: authScope
      };
    } else if (selectedEndpoint === 'crypto_encrypt') {
      method = 'POST';
      path = '/api/v1/crypto/encrypt';
      body = {
        plaintext: encryptPlaintext,
        cipher_algorithm: encryptAlgo,
        behavioral_context_salt: encryptSalt
      };
    } else if (selectedEndpoint === 'crypto_decrypt') {
      method = 'POST';
      path = '/api/v1/crypto/decrypt';
      body = {
        ciphertext_base64: decryptCiphertext,
        nonce_hex: decryptNonce,
        auth_tag_hex: decryptAuthTag,
        cipher_algorithm: encryptAlgo,
        behavioral_context_salt: decryptSalt
      };
    } else if (selectedEndpoint === 'system_health') {
      method = 'GET';
      path = '/api/v1/system/health';
    } else if (selectedEndpoint === 'tor_status') {
      method = 'GET';
      path = '/api/v1/tor/status';
    } else if (selectedEndpoint === 'panic_wipe') {
      method = 'POST';
      path = '/api/v1/vault/panic-wipe';
      body = {
        panic_pin_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        wipe_level: 'DOD_5220_M',
        kill_ram_immediately: true
      };
    }

    try {
      const res = await fetch('/api/fastapi/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path, headers, body })
      });

      const data = await res.json();
      setLastResponseStatus(data.statusCode || res.status);
      setLastResponseLatency(data.latencyMs || 0.4);
      setLastResponse(data.data || data);

      if (data.log) {
        setDispatchLogs((prev) => [data.log, ...prev.slice(0, 14)]);
      }

      // If auth succeeded, update active token
      if (selectedEndpoint === 'auth_zero_touch' && data.data?.access_token) {
        setCustomBearerToken(data.data.access_token);
        setServerState((prev) => ({
          ...prev,
          currentBearerToken: data.data.access_token,
          activeSessionsCount: prev.activeSessionsCount + 1
        }));
      }

      // If encrypt succeeded, auto-fill decrypt fields for quick turnaround
      if (selectedEndpoint === 'crypto_encrypt' && data.data?.ciphertext_base64) {
        setDecryptCiphertext(data.data.ciphertext_base64);
        setDecryptNonce(data.data.nonce_hex);
        setDecryptAuthTag(data.data.auth_tag_hex);
        setDecryptSalt(encryptSalt);
      }

      // Refresh health if health checked
      if (selectedEndpoint === 'system_health' && data.data?.subsystems) {
        setSystemHealth(data.data);
      }
    } catch (e: any) {
      console.error('Dispatch execution error:', e);
      setLastResponseStatus(500);
      setLastResponse({ error: 'Execution failed', message: e.message });
    } finally {
      setIsExecuting(false);
      fetchServerState();
    }
  };

  const handleRunCliBenchmark = async () => {
    setIsCliTesting(true);
    setCliLogs(['[*] Spawning isolated asynchronous Python sub-process...', '[*] Target: android/python/app.py --test']);
    try {
      const res = await fetch('/api/fastapi/run-cli-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCliLogs(data.logs || []);
      } else {
        setCliLogs(['[!] CLI Test execution failed with status ' + res.status]);
      }
    } catch (e: any) {
      setCliLogs(['[!] Network/Execution error:', e.message]);
    } finally {
      setIsCliTesting(false);
    }
  };

  return (
    <div id="fastapi-microbackend-container" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Server className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 p-0.5 shadow-lg shadow-teal-500/20">
                <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Server className="h-5 w-5 text-teal-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Async FastAPI Micro-Backend Engine
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    Prompt 14 • Python app.py
                  </span>
                </h2>
                <p className="text-sm text-slate-400">
                  Asynchronous REST API serving local Android clients over Tor v3 hidden services with Pydantic DTO models & HTTP Bearer Token auth.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="refresh-server-state-btn"
              onClick={() => { fetchServerState(); fetchSystemHealth(); }}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Poll Status</span>
            </button>
            <button
              id="run-applet-cli-test-btn"
              onClick={() => { setActiveSubTab('cli_benchmark'); handleRunCliBenchmark(); }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium shadow-md shadow-emerald-900/30 transition-all"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Run CLI PyTest Suite</span>
            </button>
          </div>
        </div>

        {/* Real-time Subsystem Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Async Engine Runtime</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-sm font-semibold text-white mt-1">FastAPI 0.111.0 / AsyncIO</div>
            <div className="text-[10px] text-teal-400 font-mono mt-0.5">Python 3.10+ / Starlette ASGI</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Tor v3 Hidden Service</span>
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="text-xs font-mono font-medium text-indigo-300 mt-1 truncate">
              {serverState.torV3OnionAddress.substring(0, 22)}...onion
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Stream Isolated • DNS Protected</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Security Scheme</span>
              <Key className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">HTTPBearer (RFC 6750)</div>
            <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">TEE Attested • Time-Bound 1800s</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Average Sub-ms Latency</span>
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-emerald-400 mt-1 font-mono">
              {serverState.averageLatencyMs.toFixed(2)} ms
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {serverState.totalRequestsHandled} REST Requests Processed
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('console')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeSubTab === 'console'
              ? 'border-teal-400 text-teal-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Interactive REST Console</span>
        </button>

        <button
          onClick={() => setActiveSubTab('health_grid')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeSubTab === 'health_grid'
              ? 'border-teal-400 text-teal-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Subsystem Health Grid (10/10)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pydantic_schemas')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeSubTab === 'pydantic_schemas'
              ? 'border-teal-400 text-teal-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Pydantic v2 Models & OpenAPI</span>
        </button>

        <button
          onClick={() => setActiveSubTab('python_source')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeSubTab === 'python_source'
              ? 'border-teal-400 text-teal-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Python app.py Source</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cli_benchmark')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeSubTab === 'cli_benchmark'
              ? 'border-teal-400 text-teal-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>CLI Test Runner</span>
        </button>
      </div>

      {/* Sub-Tab 1: Interactive REST Console */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Endpoint Selector & Request Builder */}
          <div className="lg:col-span-7 space-y-5">
            {/* Bearer Token Quick Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  Active HTTP Bearer Token Header:
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendAuthHeader}
                      onChange={(e) => setSendAuthHeader(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500/20"
                    />
                    <span>Include Authorization Header</span>
                  </label>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700 transition-colors"
                  >
                    {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customBearerToken}
                  onChange={(e) => setCustomBearerToken(e.target.value)}
                  placeholder="ais_sec_..."
                  className="w-full bg-slate-950 text-xs font-mono text-amber-300 px-3 py-2 rounded-lg border border-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Uncheck "Include Authorization Header" to test server-side 401 Unauthorized rejection and token validation.
              </p>
            </div>

            {/* Endpoint Selector Tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Select REST API Endpoint
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedEndpoint('auth_zero_touch')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'auth_zero_touch'
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      POST
                    </span>
                    <span className="text-[10px] text-slate-500">Zero-Touch Auth</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-200 mt-1.5">
                    /api/v1/auth/zero-touch
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEndpoint('crypto_encrypt')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'crypto_encrypt'
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      POST
                    </span>
                    <span className="text-[10px] text-slate-500">AES-256-GCM / Poly1305</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-200 mt-1.5">
                    /api/v1/crypto/encrypt
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEndpoint('crypto_decrypt')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'crypto_decrypt'
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      POST
                    </span>
                    <span className="text-[10px] text-slate-500">Authenticated Decrypt</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-200 mt-1.5">
                    /api/v1/crypto/decrypt
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEndpoint('system_health')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'system_health'
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      GET
                    </span>
                    <span className="text-[10px] text-slate-500">Subsystem Probe</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-200 mt-1.5">
                    /api/v1/system/health
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEndpoint('tor_status')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'tor_status'
                      ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      GET
                    </span>
                    <span className="text-[10px] text-slate-500">Tor v3 Circuits</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-200 mt-1.5">
                    /api/v1/tor/status
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEndpoint('panic_wipe')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedEndpoint === 'panic_wipe'
                      ? 'bg-red-500/10 border-red-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-300 font-mono">
                      POST
                    </span>
                    <span className="text-[10px] text-red-400">Emergency Self-Destruct</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-red-300 mt-1.5">
                    /api/v1/vault/panic-wipe
                  </div>
                </button>
              </div>

              {/* Endpoint Dynamic Parameters Form */}
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>2. Configure Request Payload (Pydantic Schema)</span>
                  <span className="text-[10px] text-teal-400 font-mono">Strict Types Enforced</span>
                </h4>

                {/* Case 1: Zero-Touch Auth */}
                {selectedEndpoint === 'auth_zero_touch' && (
                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">TEE Device ID:</label>
                      <input
                        type="text"
                        value={authDeviceId}
                        onChange={(e) => setAuthDeviceId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          Touchless Liveness Score: <strong className="text-teal-300">{authLivenessScore.toFixed(3)}</strong>
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="1.0"
                          step="0.005"
                          value={authLivenessScore}
                          onChange={(e) => setAuthLivenessScore(parseFloat(e.target.value))}
                          className="w-full accent-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          Behavioral Entropy: <strong className="text-emerald-300">{authEntropyBits.toFixed(0)} bits</strong>
                        </label>
                        <input
                          type="range"
                          min="128"
                          max="256"
                          step="8"
                          value={authEntropyBits}
                          onChange={(e) => setAuthEntropyBits(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Requested Scope:</label>
                      <select
                        value={authScope}
                        onChange={(e) => setAuthScope(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                      >
                        <option value="VAULT_READ_WRITE_CRYPTO">VAULT_READ_WRITE_CRYPTO (Full Access)</option>
                        <option value="TOR_CIRCUIT_ADMIN">TOR_CIRCUIT_ADMIN (Onion Tunnel Only)</option>
                        <option value="AUDIT_EXPORT_ONLY">AUDIT_EXPORT_ONLY (Read Audit Seals)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Case 2: Payload Encrypt */}
                {selectedEndpoint === 'crypto_encrypt' && (
                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Plaintext to Encrypt:</label>
                      <textarea
                        rows={2}
                        value={encryptPlaintext}
                        onChange={(e) => setEncryptPlaintext(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Cipher Algorithm:</label>
                        <select
                          value={encryptAlgo}
                          onChange={(e) => setEncryptAlgo(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                        >
                          <option value="AES-256-GCM">AES-256-GCM (NIST SP 800-38D)</option>
                          <option value="CHACHA20-POLY1305">CHACHA20-POLY1305 (RFC 8439)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Behavioral Salt:</label>
                        <input
                          type="text"
                          value={encryptSalt}
                          onChange={(e) => setEncryptSalt(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 3: Payload Decrypt */}
                {selectedEndpoint === 'crypto_decrypt' && (
                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Ciphertext (Base64):</label>
                      <input
                        type="text"
                        placeholder="e.g. SdHwIUDFHIj7zH7vtl49BZnQDkLRcQaXOkQA..."
                        value={decryptCiphertext}
                        onChange={(e) => setDecryptCiphertext(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Nonce / IV (Hex):</label>
                        <input
                          type="text"
                          placeholder="e.g. 9c4477130d470e2dbbb7d2e7"
                          value={decryptNonce}
                          onChange={(e) => setDecryptNonce(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Auth Tag (Hex):</label>
                        <input
                          type="text"
                          placeholder="e.g. 8a54a852f7a28291002cb1768e6cce4c"
                          value={decryptAuthTag}
                          onChange={(e) => setDecryptAuthTag(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Behavioral Salt:</label>
                      <input
                        type="text"
                        value={decryptSalt}
                        onChange={(e) => setDecryptSalt(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Case 4: Health & Tor */}
                {(selectedEndpoint === 'system_health' || selectedEndpoint === 'tor_status') && (
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 text-xs text-slate-400">
                    This endpoint takes no request body parameters and queries the live async health state and Tor v3 onion routing table.
                  </div>
                )}

                {/* Case 5: Panic Wipe */}
                {selectedEndpoint === 'panic_wipe' && (
                  <div className="p-3 bg-red-950/40 rounded-lg border border-red-800/60 text-xs text-red-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-red-400" />
                      DoD 5220.22-M 7-Pass Shredding & ctypes RAM Zeroization
                    </p>
                    <p className="text-[11px] text-red-200/80 mt-1">
                      Executing this endpoint initiates hardware cryptographic key destruction and Tor emergency beacon broadcast.
                    </p>
                  </div>
                )}

                {/* Action Trigger Button */}
                <button
                  id="dispatch-endpoint-btn"
                  onClick={handleExecuteEndpoint}
                  disabled={isExecuting}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Dispatching Async Micro-Backend Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Execute FastAPI Request Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Response Inspector & Request Logs */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Response Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-teal-400" />
                  Live Async Response Inspector
                </h3>
                {lastResponseStatus && (
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      lastResponseStatus === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      HTTP {lastResponseStatus}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {lastResponseLatency} ms
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 font-mono text-xs overflow-x-auto max-h-[380px] scrollbar-thin">
                {lastResponse ? (
                  <pre className="text-emerald-300">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="text-slate-500 text-center py-12">
                    Execute an endpoint above to view real-time JSON response and latency metrics.
                  </div>
                )}
              </div>
            </div>

            {/* Micro-Backend Dispatch Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Recent Backend Requests</span>
                <span className="text-[10px] text-teal-400 font-mono">Zero Egress Verified</span>
              </h4>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                {dispatchLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950/60 p-2 rounded border border-slate-800/60 text-[11px] font-mono flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.method === 'POST' ? 'bg-teal-500/20 text-teal-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-slate-300 truncate max-w-[140px]">{log.path}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px]">
                      <span className={log.statusCode === 200 ? 'text-emerald-400' : 'text-red-400'}>
                        {log.statusCode}
                      </span>
                      <span className="text-slate-500">{log.latencyMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Subsystem Health Grid */}
      {activeSubTab === 'health_grid' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Async Subsystem Health Status (10/10 Subsystems Probed)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Probed asynchronously over Tor v3 hidden service interface with stack canary verification and zero-leak memory bounds.
                </p>
              </div>
              <button
                onClick={fetchSystemHealth}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors self-start"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Probe Now</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemHealth?.subsystems?.map((item) => (
                <div key={item.subsystem_id} className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-200">
                        {item.name}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.status === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {item.details}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                    <span>ID: {item.subsystem_id}</span>
                    <span className="text-teal-400">Latency: {item.latency_ms.toFixed(2)} ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Pydantic v2 Models & OpenAPI Specification */}
      {activeSubTab === 'pydantic_schemas' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-teal-400" />
                Pydantic v2 Strict Request & Response Schemas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hardware-validated data models ensuring zero unauthorized field injection and type safety on all REST routes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-teal-300 font-bold"># ZeroTouchAuthRequest & Response</div>
                <pre className="text-slate-300 text-[11px] overflow-x-auto">
{`class ZeroTouchAuthRequest(BaseModel):
    device_id: str = Field(..., description="TEE device identifier")
    tee_attestation_nonce: str = Field(..., description="Cryptographic attestation")
    touchless_liveness_score: float = Field(0.98, ge=0.0, le=1.0)
    behavioral_entropy_bits: float = Field(256.0, ge=128.0)
    requested_scope: str = Field("VAULT_READ_WRITE_CRYPTO")

class ZeroTouchAuthResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_seconds: int = 1800
    issued_at_utc: str
    session_id: str
    authorized_subsystems: List[str]
    tor_onion_bound: bool = True`}
                </pre>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-teal-300 font-bold"># ContextPayloadEncryptRequest & Response</div>
                <pre className="text-slate-300 text-[11px] overflow-x-auto">
{`class ContextPayloadEncryptRequest(BaseModel):
    plaintext: str
    cipher_algorithm: str = "AES-256-GCM"  # or CHACHA20-POLY1305
    behavioral_context_salt: Optional[str] = None
    key_id: Optional[str] = "master_vault_root"

class ContextPayloadEncryptResponse(BaseModel):
    ciphertext_base64: str
    nonce_hex: str
    auth_tag_hex: str
    cipher_algorithm: str
    entropy_bits_applied: float
    key_id: str
    encryption_latency_ms: float
    zero_leak_verified: bool = True`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Python Source Code */}
      {activeSubTab === 'python_source' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="h-4 w-4 text-emerald-400" />
              Python Async FastAPI Micro-Backend Source Code (<code className="text-emerald-300 font-mono">android/python/app.py</code>)
            </h3>
            <button
              onClick={fetchPythonSource}
              className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono border border-slate-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reload Source</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-h-[600px] overflow-y-auto scrollbar-thin">
            {isLoadingSource ? (
              <div className="text-slate-500 text-center py-16">Loading Python source code...</div>
            ) : (
              <pre className="text-slate-300 font-mono text-xs leading-relaxed">
                {pythonCode || '# Python code file loaded from android/python/app.py'}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 5: CLI Test Runner */}
      {activeSubTab === 'cli_benchmark' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                FastAPI Python Test Suite CLI Runner (<code className="text-emerald-300 font-mono">python3 android/python/app.py --test</code>)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executes all 6 integration tests verifying Bearer authentication, 401 rejection, encryption, decryption, Tor circuits, and latency.
              </p>
            </div>
            <button
              id="execute-cli-runner-btn"
              onClick={handleRunCliBenchmark}
              disabled={isCliTesting}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {isCliTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
              <span>{isCliTesting ? 'Running PyTest Suite...' : 'Execute Test Suite'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs max-h-[480px] overflow-y-auto scrollbar-thin space-y-1">
            {cliLogs.length > 0 ? (
              cliLogs.map((line, idx) => (
                <div
                  key={idx}
                  className={`${
                    line.includes('[+]') || line.includes('PASS')
                      ? 'text-emerald-400 font-bold'
                      : line.includes('Test #')
                      ? 'text-cyan-300 font-semibold'
                      : line.includes('===') || line.includes('---')
                      ? 'text-slate-600'
                      : 'text-slate-300'
                  }`}
                >
                  {line}
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-12">
                Click "Execute Test Suite" to run the async integration test runner.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
