import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  BatteryMedium,
  Cpu,
  ShieldCheck,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Sliders,
  Terminal,
  FileCode,
  Copy,
  Check,
  Activity,
  Layers,
  Clock,
  Radio,
  KeyRound,
  AlertCircle,
  Wifi,
  Moon,
  Sun,
  ShieldAlert
} from 'lucide-react';
import { ZeroTouchStateDTO, HeartbeatLogDTO, DozeModeState, StandbyBucket } from '../types';

export const ZeroTouchBatteryManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'doze_matrix' | 'heartbeat_logs' | 'python_source' | 'java_service' | 'cli_trace'>('dashboard');

  const [state, setState] = useState<ZeroTouchStateDTO | null>(null);
  const [logs, setLogs] = useState<HeartbeatLogDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Simulation Controls
  const [simBatteryLevel, setSimBatteryLevel] = useState<number>(88);
  const [simCharging, setSimCharging] = useState<boolean>(false);
  const [simSaver, setSimSaver] = useState<boolean>(false);
  const [simBucket, setSimBucket] = useState<StandbyBucket>('ACTIVE');

  // Source code viewer state
  const [pySource, setPySource] = useState<string>('');
  const [javaSource, setJavaSource] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // CLI trace state
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/zerotouch/status');
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setSimBatteryLevel(data.state.batteryLevelPct);
        setSimCharging(data.state.isCharging);
        setSimSaver(data.state.isBatterySaver);
        setSimBucket(data.state.standbyBucket);
      }
    } catch (err) {
      console.error('Failed to fetch zero touch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/zerotouch/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    fetch('/api/zerotouch/python-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPySource(data.code);
      })
      .catch((err) => console.error('Failed to fetch Python source:', err));

    fetch('/api/zerotouch/service-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setJavaSource(data.code);
      })
      .catch((err) => console.error('Failed to fetch Java source:', err));
  }, []);

  const handleToggleService = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/zerotouch/toggle-service', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to toggle service:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDozeState = async (dozeState: DozeModeState) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/zerotouch/set-doze-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dozeState })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to set Doze state:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBatteryParams = async (
    level?: number,
    charging?: boolean,
    saver?: boolean,
    bucket?: StandbyBucket
  ) => {
    try {
      const res = await fetch('/api/zerotouch/set-battery-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batteryLevel: level !== undefined ? level : simBatteryLevel,
          charging: charging !== undefined ? charging : simCharging,
          batterySaver: saver !== undefined ? saver : simSaver,
          standbyBucket: bucket || simBucket
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to update battery params:', err);
    }
  };

  const handleTriggerHeartbeat = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/zerotouch/trigger-heartbeat', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to trigger heartbeat:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReauthBiometrics = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/zerotouch/reauth-biometrics', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to reauth biometrics:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/zerotouch/run-cli-test', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDozeBadge = (dozeState: DozeModeState) => {
    switch (dozeState) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> ACTIVE (UNRESTRICTED)</span>;
      case 'DOZE_LIGHT':
        return <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> LIGHT DOZE (3m BATCH)</span>;
      case 'DOZE_DEEP':
        return <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> DEEP DOZE (DORMANT TOR)</span>;
      case 'MAINTENANCE_WINDOW':
        return <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> MAINTENANCE WINDOW (BURST)</span>;
      case 'CHARGING_UNCONSTRAINED':
        return <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center gap-1.5"><BatteryCharging className="w-3.5 h-3.5" /> CHARGING (MAX BANDWIDTH)</span>;
    }
  };

  return (
    <div id="zero-touch-battery-manager-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-emerald-950/30 to-zinc-900 border border-emerald-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Prompt 11 Zero-Touch Background Service &amp; Battery Manager
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Doze Mode &amp; Standby Buckets
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                &lt; 1.2% / 24h Drain Budget
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <BatteryMedium className="w-7 h-7 text-emerald-400" />
              Zero-Touch Background Service &amp; Battery Manager
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Autonomous, ultra-low-power daemon managing continuous Tor network tunnels, passive touchless biometric auto-reauthentication,
              and low-overhead heartbeat checks while strictly adhering to Android Doze Mode battery constraints.
            </p>
          </div>

          {/* Quick Stat Pill Cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Heartbeat Cadence</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {state?.heartbeatIntervalSeconds ?? 30}s
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Daily Drain Est.</span>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {state?.dailyDrainRateEstPct ?? 1.05}%
              </div>
            </div>

            <button
              onClick={() => {
                fetchStatus();
                fetchLogs();
              }}
              disabled={loading}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh Battery State"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Power &amp; Daemon Dashboard
          </button>

          <button
            onClick={() => setActiveSubTab('doze_matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'doze_matrix'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Android Doze Mode Simulation Matrix
          </button>

          <button
            onClick={() => setActiveSubTab('heartbeat_logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'heartbeat_logs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            WakeLock &amp; Heartbeat Stream ({logs.length})
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
            Python Daemon (zero_touch_service.py)
          </button>

          <button
            onClick={() => setActiveSubTab('java_service')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'java_service'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Android Service (ZeroTouchService.java)
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
            Daemon CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE POWER & DAEMON DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Daemon Master State */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  ZeroTouch Daemon State
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${
                    state?.isRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {state?.isRunning ? 'RUNNING (START_STICKY)' : 'STOPPED'}
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Foreground Channel:</span>
                  <span className="text-zinc-200">AISecureZeroTouchChannel</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>WakeLock Duty:</span>
                  <span className="text-emerald-400">{state?.activeWakeLockDutyPct ?? 0.12}% active</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total Heartbeats:</span>
                  <span className="text-indigo-400">{state?.totalHeartbeatsExecuted ?? 0}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleToggleService}
                  disabled={actionLoading}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    state?.isRunning
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {state?.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {state?.isRunning ? 'Pause Daemon' : 'Start Daemon'}
                </button>

                <button
                  onClick={handleTriggerHeartbeat}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  title="Execute Immediate Burst Heartbeat"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Burst Sync
                </button>
              </div>
            </div>

            {/* Card 2: Tor Onion Tunnel & Dormance */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Tor Ephemeral Tunnel
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${
                    state?.torCircuitStatus === 'ACTIVE'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {state?.torCircuitStatus ?? 'ACTIVE'}
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Active Onion:</span>
                  <span className="text-purple-300 truncate max-w-[140px]">{state?.torActiveOnion}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Circuit Latency:</span>
                  <span className="text-emerald-400">{state?.torLatencyMs ?? 174} ms</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Active Circuits:</span>
                  <span className="text-zinc-200">{state?.torCircuitsCount ?? 3} circuits</span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500">
                Tor circuits transition to <strong>DORMANT mode</strong> during Deep Doze to achieve 0 packet wakeups.
              </div>
            </div>

            {/* Card 3: Touchless Biometrics Passive Re-Auth */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Biometric Session Guardian
                </span>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full">
                  STRONG_BOX TEE
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>TTL Window:</span>
                  <span className="text-cyan-400 font-bold">{state?.biometricTtlRemainingSeconds ?? 284}s remaining</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Auto-Reauths:</span>
                  <span className="text-zinc-200">{state?.biometricReauthCount ?? 18} executions</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Last Re-auth:</span>
                  <span className="text-zinc-500 text-[10px]">
                    {state?.lastReauthTimestampUtc ? new Date(state.lastReauthTimestampUtc).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleReauthBiometrics}
                disabled={actionLoading}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Force Passive Touchless Re-Auth
              </button>
            </div>
          </div>

          {/* Battery State & Power Management Diagnostics */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  Battery Budget Diagnostics &amp; Android Standby Buckets
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Adjust simulated battery levels, charging status, and Android 9+ App Standby Buckets to observe adaptive throttling.
                </p>
              </div>

              {state && getDozeBadge(state.dozeState)}
            </div>

            {/* Daily Drain Target Progress Bar */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Estimated 24-Hour Battery Drain:</span>
                <span className="text-emerald-400 font-bold">
                  {state?.dailyDrainRateEstPct ?? 1.05}% / 1.20% Max Target
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (state?.dailyDrainRateEstPct ?? 1.05) > 1.2 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, ((state?.dailyDrainRateEstPct ?? 1.05) / 1.2) * 100)}%` }}
                />
              </div>
            </div>

            {/* Interactive Sliders & Knobs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Battery Level Slider */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Battery Level:</span>
                  <span className="font-mono font-bold text-emerald-400">{simBatteryLevel}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={simBatteryLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimBatteryLevel(val);
                    handleUpdateBatteryParams(val);
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Charging Toggle */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <BatteryCharging className="w-4 h-4 text-cyan-400" />
                  Charging Plugged:
                </span>
                <button
                  onClick={() => {
                    const next = !simCharging;
                    setSimCharging(next);
                    handleUpdateBatteryParams(undefined, next);
                  }}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md border ${
                    simCharging
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {simCharging ? 'YES (FAST)' : 'NO'}
                </button>
              </div>

              {/* Battery Saver Toggle */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Battery Saver:
                </span>
                <button
                  onClick={() => {
                    const next = !simSaver;
                    setSimSaver(next);
                    handleUpdateBatteryParams(undefined, undefined, next);
                  }}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md border ${
                    simSaver
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {simSaver ? 'ENABLED (20m)' : 'DISABLED'}
                </button>
              </div>

              {/* Standby Bucket Dropdown */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-xs text-zinc-400 block">Standby Bucket:</span>
                <select
                  value={simBucket}
                  onChange={(e) => {
                    const bucket = e.target.value as StandbyBucket;
                    setSimBucket(bucket);
                    handleUpdateBatteryParams(undefined, undefined, undefined, bucket);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none"
                >
                  <option value="ACTIVE">ACTIVE (No limits)</option>
                  <option value="WORKING_SET">WORKING_SET (2h deferral)</option>
                  <option value="FREQUENT">FREQUENT (8h deferral)</option>
                  <option value="RARE">RARE (24h deferral)</option>
                  <option value="RESTRICTED">RESTRICTED (Strict limits)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ANDROID DOZE MODE SIMULATION MATRIX */}
      {activeSubTab === 'doze_matrix' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Moon className="w-5 h-5 text-emerald-400" />
                Android Doze Mode State Machine &amp; Adaptive Throttling
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Click any Doze Mode below to simulate Android system broadcasts (<code>ACTION_DEVICE_IDLE_MODE_CHANGED</code>) and inspect how the background daemon dynamically scales packet frequencies.
              </p>
            </div>

            {/* Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* State 1: Active */}
              <div
                onClick={() => handleSetDozeState('ACTIVE')}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                  state?.dozeState === 'ACTIVE'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-emerald-400" />
                    1. ACTIVE (Unconstrained)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    30s Cadence
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Device is in active user motion or screen is on. Full 3-hop Tor circuits open with 30s heartbeat intervals.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tor: <strong>ACTIVE</strong> • Est. Drain: <strong>1.05%/day</strong>
                </div>
              </div>

              {/* State 2: Light Doze */}
              <div
                onClick={() => handleSetDozeState('DOZE_LIGHT')}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                  state?.dozeState === 'DOZE_LIGHT'
                    ? 'bg-amber-950/40 border-amber-500 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-amber-400" />
                    2. LIGHT DOZE (Screen Off)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    180s (3m)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Screen has turned off while stationary. Jobs and network access are batched into periodic maintenance cycles.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tor: <strong>ACTIVE (BATCHED)</strong> • Est. Drain: <strong>0.58%/day</strong>
                </div>
              </div>

              {/* State 3: Deep Doze */}
              <div
                onClick={() => handleSetDozeState('DOZE_DEEP')}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                  state?.dozeState === 'DOZE_DEEP'
                    ? 'bg-purple-950/40 border-purple-500 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-purple-400" />
                    3. DEEP DOZE (Stationary)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                    900s (15m)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Full deep sleep. Tor circuits enter dormant state (zero background packets), waking strictly during system windows.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tor: <strong>DORMANT (0 pkts)</strong> • Est. Drain: <strong>0.22%/day</strong>
                </div>
              </div>

              {/* State 4: Maintenance Window */}
              <div
                onClick={() => handleSetDozeState('MAINTENANCE_WINDOW')}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                  state?.dozeState === 'MAINTENANCE_WINDOW'
                    ? 'bg-blue-950/40 border-blue-500 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-400" />
                    4. MAINTENANCE WINDOW
                  </span>
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    20s Burst
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Android briefly opens a maintenance window. Daemon executes fast burst packet sync and rolls over cryptographic keys.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tor: <strong>BURST FLUSH</strong> • WakeLock: <strong>110ms</strong>
                </div>
              </div>

              {/* State 5: Charging */}
              <div
                onClick={() => handleSetDozeState('CHARGING_UNCONSTRAINED')}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-3 col-span-1 md:col-span-2 ${
                  state?.dozeState === 'CHARGING_UNCONSTRAINED'
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-cyan-400" />
                    5. CHARGING (Unconstrained Power)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    15s Fast Sync
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Power connected via AC/USB. All battery deferrals lifted; high-frequency telemetry sync and onion routing active.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tor: <strong>MAX BANDWIDTH</strong> • Drain: <strong>0.00% (Charging)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HEARTBEAT & WAKELOCK EXECUTION STREAM */}
      {activeSubTab === 'heartbeat_logs' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Live Heartbeat Stream &amp; PowerManager WakeLock Audit
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time log of background execution bursts, WakeLock hold durations (milliseconds), and Tor circuit latencies.
              </p>
            </div>

            <button
              onClick={handleTriggerHeartbeat}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Trigger Burst Heartbeat
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950">
                  <th className="p-3">Seq #</th>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3">Doze State</th>
                  <th className="p-3">Cadence</th>
                  <th className="p-3">Tor Status</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">WakeLock</th>
                  <th className="p-3">Energy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log.sequence} className="hover:bg-zinc-950/50 transition">
                    <td className="p-3 font-bold text-indigo-400">#{log.sequence}</td>
                    <td className="p-3 text-zinc-300">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        {log.dozeState}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">{log.intervalSeconds}s</td>
                    <td className="p-3">
                      <span
                        className={`font-semibold ${
                          log.torStatus === 'CIRCUIT_HEALTHY'
                            ? 'text-emerald-400'
                            : log.torStatus === 'DORMANT_SKIP'
                            ? 'text-purple-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {log.torStatus}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">{log.torLatencyMs > 0 ? `${log.torLatencyMs} ms` : '—'}</td>
                    <td className="p-3 text-amber-300">{log.wakeLockMs} ms</td>
                    <td className="p-3 text-emerald-400">{log.batteryDrainMah} mAh</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PYTHON SOURCE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/python/zero_touch_service.py</span>
            </div>
            <button
              onClick={() => copyToClipboard(pySource, 'py')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'py' ? 'Copied' : 'Copy Python Source'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">
              {pySource || 'Loading Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: JAVA SERVICE SOURCE */}
      {activeSubTab === 'java_service' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/service/ZeroTouchService.java</span>
            </div>
            <button
              onClick={() => copyToClipboard(javaSource, 'java')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode === 'java' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'java' ? 'Copied' : 'Copy Java Service'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">
              {javaSource || 'Loading Java service source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Daemon CLI Output: python zero_touch_service.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Daemon CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 select-none">&gt;</span>
                  <span className={log.includes('OPERATIONAL') || log.includes('Succeeded') ? 'text-emerald-400 font-semibold' : log.includes('DOZE') ? 'text-amber-300 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Daemon CLI Test&quot; to execute real-time Doze mode state transitions, WakeLock duty cycle audits, and Tor circuit heartbeat verifications.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
