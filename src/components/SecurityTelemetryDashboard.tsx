import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  Link,
  Archive,
  Terminal,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Lock,
  Cpu,
  Database,
  ArrowDownUp,
  Share2,
  Sliders,
  Send,
  Zap,
  Play,
  FileCheck
} from 'lucide-react';
import { TelemetryEventDTO, LogArchiveManifestDTO, TelemetryMetricsDTO } from '../types';

export const SecurityTelemetryDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'live_feed' | 'hash_chain' | 'buffer_metrics' | 'log_archives' | 'python_source' | 'cli_trace'>('live_feed');

  // Telemetry Data State
  const [events, setEvents] = useState<TelemetryEventDTO[]>([]);
  const [archives, setArchives] = useState<LogArchiveManifestDTO[]>([]);
  const [metrics, setMetrics] = useState<TelemetryMetricsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Event Details Modal
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEventDTO | null>(null);

  // Chain Verification State
  const [verifyingChain, setVerifyingChain] = useState<boolean>(false);
  const [chainVerificationResult, setChainVerificationResult] = useState<{
    isValid: boolean;
    verifiedCount: number;
    headHash?: string;
    error?: string;
  } | null>(null);

  // Manual Event Emission State
  const [emitCategory, setEmitCategory] = useState<string>('AUTH_FAILURE');
  const [emitSeverity, setEmitSeverity] = useState<TelemetryEventDTO['severity']>('WARNING');
  const [emitAction, setEmitAction] = useState<string>('FAILED_BIOMETRIC_TOUCHLESS_LIVENESS');
  const [emitComponent, setEmitComponent] = useState<string>('Google_MLKit_Vision');
  const [emitActor, setEmitActor] = useState<string>('unauthorized_operator');
  const [emitResource, setEmitResource] = useState<string>('/sensor/camera/face');
  const [emitStatus, setEmitStatus] = useState<TelemetryEventDTO['status']>('FAILED');
  const [emitEncrypted, setEmitEncrypted] = useState<boolean>(false);
  const [isEmitting, setIsEmitting] = useState<boolean>(false);

  // Rotation State
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [rotationResult, setRotationResult] = useState<string | null>(null);

  // Python Source & CLI Trace
  const [pythonCode, setPythonCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  // Fetch Telemetry Events & Metrics
  const loadTelemetryData = async () => {
    setLoading(true);
    try {
      const [eventsRes, metricsRes, archivesRes] = await Promise.all([
        fetch(`/api/telemetry/events?category=${filterCategory}&severity=${filterSeverity}&limit=150`),
        fetch('/api/telemetry/metrics'),
        fetch('/api/telemetry/archives')
      ]);

      const eventsData = await eventsRes.json();
      const metricsData = await metricsRes.json();
      const archivesData = await archivesRes.json();

      if (eventsData.success) setEvents(eventsData.events);
      if (metricsData.success) setMetrics(metricsData.metrics);
      if (archivesData.success) setArchives(archivesData.archives);
    } catch (err) {
      console.error('Failed to fetch telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetryData();

    fetch('/api/telemetry/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load python source:', err));
  }, [filterCategory, filterSeverity]);

  // Handle Event Emission
  const handleEmitEvent = async () => {
    setIsEmitting(true);
    try {
      const payload = {
        category: emitCategory,
        severity: emitSeverity,
        sourceComponent: emitComponent,
        actorId: emitActor,
        action: emitAction,
        targetResource: emitResource,
        status: emitStatus,
        metadata: {
          simulated_at: new Date().toISOString(),
          ip_origin: '192.168.1.189',
          session_token: `tok_${Math.random().toString(36).substring(2, 9)}`,
          cpu_load: '14.2%',
          memory_rss_mb: 28.5
        },
        encryptPayload: emitEncrypted
      };

      const res = await fetch('/api/telemetry/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        loadTelemetryData();
      }
    } catch (err) {
      console.error('Failed to emit event:', err);
    } finally {
      setIsEmitting(false);
    }
  };

  // Quick Simulation Trigger
  const handleQuickSim = async (type: 'auth_fail' | 'tor_egress' | 'duress' | 'strongbox' | 'vault_mount') => {
    let preset: any = {};
    if (type === 'auth_fail') {
      preset = {
        category: 'AUTH_FAILURE',
        severity: 'WARNING',
        sourceComponent: 'Duress_PIN_Discriminator',
        actorId: 'operator_alpha',
        action: 'INVALID_PIN_THRESHOLD_EXCEEDED',
        targetResource: '/auth/terminal',
        status: 'FAILED',
        metadata: { attemptCount: 3, maxAllowed: 3, lockoutSeconds: 60 }
      };
    } else if (type === 'tor_egress') {
      preset = {
        category: 'NETWORK_EGRESS',
        severity: 'NOTICE',
        sourceComponent: 'Tor_v3_Daemon',
        actorId: 'tor_onion_client',
        action: 'DISPATCH_ANONYMOUS_BEACON',
        targetResource: 'onion://7t9p...torv3.onion:9050',
        status: 'SUCCESS',
        metadata: { hops: 3, circuitId: '0x88F11C', payloadBytes: 2048 }
      };
    } else if (type === 'duress') {
      preset = {
        category: 'SELF_DESTRUCT_INVOCATION',
        severity: 'DURESS_TRIGGERED',
        sourceComponent: 'DuressShredderEngine',
        actorId: 'duress_trigger',
        action: 'EXECUTE_CTYPES_MEMSET_ZEROIZE',
        targetResource: 'RAM://0x7FFF0000-0x7FFFFFFF',
        status: 'SUCCESS',
        metadata: { passes: 3, wipePattern: 'DoD_5220_22_M', ramZeroedBytes: 10485760 }
      };
    } else if (type === 'strongbox') {
      preset = {
        category: 'KEYSTORE_ATTESTATION',
        severity: 'INFO',
        sourceComponent: 'Android_TEE_KeyStore',
        actorId: 'system_daemon',
        action: 'GENERATE_TEE_ATTESTATION_CERT',
        targetResource: 'TEE://StrongBox_Enclave',
        status: 'SUCCESS',
        metadata: { attestationLevel: 'STRONGBOX', keyAlgorithm: 'EC_secp256r1', validDays: 365 }
      };
    } else if (type === 'vault_mount') {
      preset = {
        category: 'STORAGE_ENCRYPT_DECRYPT',
        severity: 'INFO',
        sourceComponent: 'Isolated_Vault_Manager',
        actorId: 'operator_alpha',
        action: 'MOUNT_ENCRYPTED_PARTITION',
        targetResource: 'vault://secure_intel',
        status: 'SUCCESS',
        metadata: { cipher: 'AES-128-CBC', saltHex: '9f8e7d6c5b4a', iterations: 200000 },
        encryptPayload: true
      };
    }

    try {
      await fetch('/api/telemetry/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset)
      });
      loadTelemetryData();
    } catch (err) {
      console.error('Quick sim failed:', err);
    }
  };

  // Verify Hash Chain
  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    setChainVerificationResult(null);
    try {
      const res = await fetch('/api/telemetry/verify-chain', { method: 'POST' });
      const data = await res.json();
      setChainVerificationResult(data);
    } catch (err) {
      console.error('Chain verification failed:', err);
    } finally {
      setVerifyingChain(false);
    }
  };

  // Trigger Log Rotation
  const handleRotateLogs = async () => {
    setIsRotating(true);
    setRotationResult(null);
    try {
      const res = await fetch('/api/telemetry/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'DEVOPS_OPERATOR_MANUAL_TRIGGER' })
      });
      const data = await res.json();
      if (data.success && data.manifest) {
        setRotationResult(`Archive generated: ${data.manifest.archiveFilename} (SHA-256 Seal: ${data.manifest.sha256Checksum.substring(0, 16)}...)`);
        loadTelemetryData();
      }
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setIsRotating(false);
    }
  };

  // Run CLI Test
  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/telemetry/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run telemetry CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered Events with Search
  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.action.toLowerCase().includes(s) ||
      e.sourceComponent.toLowerCase().includes(s) ||
      e.actorId.toLowerCase().includes(s) ||
      e.targetResource.toLowerCase().includes(s) ||
      e.eventHash.toLowerCase().includes(s)
    );
  });

  const getSeverityBadge = (sev: TelemetryEventDTO['severity']) => {
    switch (sev) {
      case 'DURESS_TRIGGERED':
      case 'CRITICAL_BREACH':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'SECURITY_ALERT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'NOTICE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'INFO':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div id="security-telemetry-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Prompt 9 Real-Time Security Audit Pipeline
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                SHA-256 Hash Chain Immutability
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-blue-500/20 text-blue-300 border-blue-500/30 rounded-full">
                Ring Buffer (5,000 Capacity)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-indigo-400" />
              Real-Time Security Audit &amp; Telemetry Pipeline
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Immutable audit logging engine for Android security events featuring continuous cryptographic hash-chaining,
              in-memory ring-buffer caching, automated gzip log rotation, and encrypted DevOps egress broadcasting.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Buffer Size</span>
              <div className="text-lg font-bold text-indigo-400 font-mono">
                {metrics?.currentBufferSize ?? 0} <span className="text-xs text-zinc-500 font-normal">/ {metrics?.ringBufferCapacity ?? 5000}</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Total Events</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {metrics?.totalPushedCount ?? 0}
              </div>
            </div>

            <button
              onClick={loadTelemetryData}
              disabled={loading}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('live_feed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'live_feed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Audit Stream ({filteredEvents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('hash_chain')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'hash_chain'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            Hash-Chain Immutability Verifier
          </button>
          <button
            onClick={() => setActiveSubTab('buffer_metrics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'buffer_metrics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Ring Buffer &amp; Anomaly Metrics
          </button>
          <button
            onClick={() => setActiveSubTab('log_archives')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'log_archives'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Rotated Archives ({archives.length})
          </button>
          <button
            onClick={() => setActiveSubTab('python_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_source'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Python Module (security_telemetry_pipeline.py)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('cli_trace');
              if (cliLogs.length === 0) handleRunCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_trace'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Telemetry Engine CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE AUDIT FEED & QUICK EMISSION */}
      {activeSubTab === 'live_feed' && (
        <div className="space-y-6">
          {/* Quick Simulation Bar */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Security Event Simulators
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Click to inject realistic security events into the live hash chain
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickSim('auth_fail')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-amber-950/30 text-amber-300 border border-amber-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Simulate Auth Failure (PIN Breach)
              </button>

              <button
                onClick={() => handleQuickSim('tor_egress')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-blue-950/30 text-blue-300 border border-blue-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                Simulate Tor v3 Out-of-Band Beacon
              </button>

              <button
                onClick={() => handleQuickSim('strongbox')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-emerald-950/30 text-emerald-300 border border-emerald-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Simulate TEE StrongBox Attestation
              </button>

              <button
                onClick={() => handleQuickSim('vault_mount')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-indigo-950/30 text-indigo-300 border border-indigo-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Simulate Encrypted Partition Mount
              </button>

              <button
                onClick={() => handleQuickSim('duress')}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-red-950/30 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Simulate Duress Self-Destruct Wipe
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search action, source, actor, hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 font-mono"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-400">Category:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="AUTH_FAILURE">AUTH_FAILURE</option>
                  <option value="BIOMETRIC_ATTEMPT">BIOMETRIC_ATTEMPT</option>
                  <option value="KEYSTORE_ATTESTATION">KEYSTORE_ATTESTATION</option>
                  <option value="NETWORK_EGRESS">NETWORK_EGRESS</option>
                  <option value="STORAGE_ENCRYPT_DECRYPT">STORAGE_ENCRYPT_DECRYPT</option>
                  <option value="SELF_DESTRUCT_INVOCATION">SELF_DESTRUCT_INVOCATION</option>
                  <option value="PIPELINE_DEVOPS">PIPELINE_DEVOPS</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400">Severity:</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none"
                >
                  <option value="ALL">ALL SEVERITIES</option>
                  <option value="INFO">INFO</option>
                  <option value="NOTICE">NOTICE</option>
                  <option value="WARNING">WARNING</option>
                  <option value="SECURITY_ALERT">SECURITY_ALERT</option>
                  <option value="CRITICAL_BREACH">CRITICAL_BREACH</option>
                  <option value="DURESS_TRIGGERED">DURESS_TRIGGERED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Telemetry Stream List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                Immutable Telemetry Event Ledger
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Showing {filteredEvents.length} events (Ring Buffer capacity: 5000)
              </span>
            </div>

            <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No security telemetry events match your active filters.
                </div>
              ) : (
                filteredEvents.map((evt) => (
                  <div
                    key={evt.eventId}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-4 hover:bg-zinc-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          #{evt.sequenceNum}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border ${getSeverityBadge(evt.severity)}`}>
                          {evt.severity}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                          {evt.category}
                        </span>
                        {evt.isEncrypted && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Encrypted Payload
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(evt.timestampUtc).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-zinc-200 truncate">
                        {evt.action}
                      </div>

                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-3 flex-wrap">
                        <span>Source: <strong className="text-zinc-300">{evt.sourceComponent}</strong></span>
                        <span>Actor: <strong className="text-zinc-300">{evt.actorId}</strong></span>
                        <span>Resource: <strong className="text-zinc-300">{evt.targetResource}</strong></span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {evt.status}
                      </span>
                      <span className="text-zinc-500 text-[10px]" title={evt.eventHash}>
                        Hash: {evt.eventHash.substring(0, 12)}...
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Event Details Inspector Modal */}
          {selectedEvent && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-zinc-100">
                      Telemetry Event #{selectedEvent.sequenceNum} ({selectedEvent.eventId})
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 bg-zinc-800 rounded-lg"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 block">Category</span>
                      <strong className="text-zinc-200">{selectedEvent.category}</strong>
                    </div>
                    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 block">Severity</span>
                      <strong className="text-amber-300">{selectedEvent.severity}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block">Action &amp; Resource</span>
                    <div className="text-zinc-200 font-bold">{selectedEvent.action}</div>
                    <div className="text-zinc-400">{selectedEvent.targetResource}</div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block">Event SHA-256 Hash</span>
                    <div className="text-emerald-400 break-all">{selectedEvent.eventHash}</div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block">Previous Node Hash (Chain Link)</span>
                    <div className="text-indigo-400 break-all">{selectedEvent.prevEventHash}</div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block">HMAC-SHA256 Signature MAC</span>
                    <div className="text-purple-400 break-all">{selectedEvent.signatureMac}</div>
                  </div>

                  {selectedEvent.encryptedPayloadB64 && (
                    <div className="p-3 bg-zinc-950 rounded-lg border border-purple-900/50 space-y-1">
                      <span className="text-purple-400 block font-bold">Encrypted Token Payload (AES-256-GCM / ChaCha20)</span>
                      <div className="text-purple-300 break-all">{selectedEvent.encryptedPayloadB64}</div>
                    </div>
                  )}

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 block">Payload Metadata</span>
                    <pre className="text-zinc-300 text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: HASH-CHAIN IMMUTABILITY VERIFIER */}
      {activeSubTab === 'hash_chain' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Link className="w-5 h-5 text-indigo-400" />
                  Continuous Cryptographic Hash-Chain Verification
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Validates unbroken SHA-256 cryptographic linkage and HMAC-SHA256 signatures across all nodes in the audit ledger.
                </p>
              </div>

              <button
                onClick={handleVerifyChain}
                disabled={verifyingChain}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
              >
                <CheckCircle2 className={`w-4 h-4 ${verifyingChain ? 'animate-spin' : ''}`} />
                {verifyingChain ? 'Verifying Cryptographic Ledger...' : 'Verify Full Hash-Chain Integrity'}
              </button>
            </div>

            {/* Verification Result Banner */}
            {chainVerificationResult && (
              <div className={`p-4 rounded-xl border font-mono text-xs ${
                chainVerificationResult.isValid
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  {chainVerificationResult.isValid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      HASH CHAIN IS 100% VALID &amp; TAMPER-FREE
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      CHAIN INTEGRITY FAILURE DETECTED
                    </>
                  )}
                </div>
                <div>Verified {chainVerificationResult.verifiedCount} consecutive audit records without tampering.</div>
                {chainVerificationResult.headHash && (
                  <div className="mt-1 text-[11px] text-zinc-400 truncate">
                    Chain Head: {chainVerificationResult.headHash}
                  </div>
                )}
                {chainVerificationResult.error && (
                  <div className="mt-1 text-red-400 font-bold">{chainVerificationResult.error}</div>
                )}
              </div>
            )}

            {/* Hash Chain Visual Trace */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                Live Hash-Chain Nodes (Sequential Order)
              </span>

              <div className="space-y-2">
                {events.slice(0, 8).map((evt, idx) => (
                  <div
                    key={evt.eventId}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold">
                        #{evt.sequenceNum}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-200">{evt.action}</div>
                        <div className="text-[11px] text-zinc-500">
                          {evt.sourceComponent} • {evt.category}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 sm:text-right">
                      <div className="text-emerald-400 text-[11px] truncate max-w-xs">
                        Hash: {evt.eventHash}
                      </div>
                      <div className="text-zinc-500 text-[10px] truncate max-w-xs">
                        Prev: {evt.prevEventHash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RING BUFFER & ANOMALY METRICS */}
      {activeSubTab === 'buffer_metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 shadow-lg">
            <span className="text-xs font-mono text-zinc-500 uppercase block">Buffer Utilization</span>
            <div className="text-2xl font-bold text-indigo-400 font-mono">
              {metrics ? Math.round((metrics.currentBufferSize / metrics.ringBufferCapacity) * 100) : 0}%
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{ width: `${metrics ? (metrics.currentBufferSize / metrics.ringBufferCapacity) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500 font-mono block">
              {metrics?.currentBufferSize} / {metrics?.ringBufferCapacity} items cached
            </span>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 shadow-lg">
            <span className="text-xs font-mono text-zinc-500 uppercase block">Auth Failures Tracked</span>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {metrics?.authFailures ?? 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-mono block">
              Duress PIN / Biometric mismatch alerts
            </span>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 shadow-lg">
            <span className="text-xs font-mono text-zinc-500 uppercase block">Network Egress Events</span>
            <div className="text-2xl font-bold text-blue-400 font-mono">
              {metrics?.networkEgress ?? 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-mono block">
              Tor v3 Onion &amp; WebSocket pushes
            </span>
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 shadow-lg">
            <span className="text-xs font-mono text-zinc-500 uppercase block">Rotated Gzip Archives</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {metrics?.totalRotatedArchives ?? 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-mono block">
              SHA-256 sealed log packages
            </span>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ROTATED ARCHIVES & COMPRESSION */}
      {activeSubTab === 'log_archives' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-400" />
                Automated Log Rotation &amp; Compressed Archival
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Rotates audit logs into `.gz` packages sealed with deterministic SHA-256 checksums for long-term immutable preservation.
              </p>
            </div>

            <button
              onClick={handleRotateLogs}
              disabled={isRotating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
            >
              <Archive className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
              {isRotating ? 'Rotating & Compressing...' : 'Trigger Immediate Log Rotation'}
            </button>
          </div>

          {rotationResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono">
              {rotationResult}
            </div>
          )}

          <div className="space-y-3 pt-2">
            {archives.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
                No rotated archives created yet. Click &quot;Trigger Immediate Log Rotation&quot; to archive current ring buffer.
              </div>
            ) : (
              archives.map((arch) => (
                <div
                  key={arch.archiveId}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs font-mono shadow-md"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      {arch.archiveFilename}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(arch.createdAtUtc).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                      <span className="text-zinc-500 block">Events Stored</span>
                      <strong className="text-zinc-200">{arch.eventCount} items</strong>
                    </div>
                    <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                      <span className="text-zinc-500 block">Raw / Gzip Size</span>
                      <strong className="text-zinc-200">{arch.fileSizeBytes} B / {arch.compressedSizeBytes} B</strong>
                    </div>
                    <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                      <span className="text-zinc-500 block">Seq Range</span>
                      <strong className="text-indigo-300">#{arch.startSequence} - #{arch.endSequence}</strong>
                    </div>
                    <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                      <span className="text-zinc-500 block">Compression Ratio</span>
                      <strong className="text-emerald-400">
                        {Math.round((1 - arch.compressedSizeBytes / Math.max(1, arch.fileSizeBytes)) * 100)}%
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 truncate pt-1">
                    SHA-256 Seal: <span className="text-emerald-400">{arch.sha256Checksum}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PYTHON SOURCE CODE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/security_telemetry_pipeline.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Async Cryptographic Telemetry Engine</span>
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
              {pythonCode || 'Loading Security Telemetry Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python security_telemetry_pipeline.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Security Telemetry CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-400 select-none">&gt;</span>
                  <span className={log.includes('PASSED') || log.includes('SUCCESSFULLY') ? 'text-emerald-400 font-semibold' : log.includes('Step') ? 'text-indigo-300 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Security Telemetry CLI Test&quot; to execute real-time event simulation, hash-chain verification, and automated gzip rotation.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
