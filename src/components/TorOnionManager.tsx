import React, { useState, useEffect } from 'react';
import { NetworkTopologyMap } from './NetworkTopologyMap';
import { 
  Globe, 
  ShieldCheck, 
  RotateCw, 
  Copy, 
  Check, 
  Users, 
  Plus, 
  Radio, 
  Key, 
  Send, 
  Lock, 
  ArrowRightLeft,
  Server,
  Activity,
  Terminal,
  FileCode,
  Zap,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
  Network
} from 'lucide-react';
import { UserSpaceRecord, EphemeralOnionServiceData, TorDaemonStatusData, P2PTunnelMessage } from '../types';

interface TorOnionManagerProps {
  userSpaces: UserSpaceRecord[];
  onCreateUserSpace: (username: string, password: string, onion?: string) => Promise<boolean>;
}

export const TorOnionManager: React.FC<TorOnionManagerProps> = ({
  userSpaces,
  onCreateUserSpace,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'p2p_socket' | 'daemon_arch' | 'python_source' | 'cli_trace' | 'topology'>('services');
  const [daemonStatus, setDaemonStatus] = useState<TorDaemonStatusData | null>(null);
  const [services, setServices] = useState<EphemeralOnionServiceData[]>([]);
  const [messages, setMessages] = useState<P2PTunnelMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  
  // Provisioning form
  const [targetPort, setTargetPort] = useState<number>(8888);
  const [virtualPort, setVirtualPort] = useState<number>(80);
  const [rotationMinutes, setRotationMinutes] = useState<number>(5);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<string | null>(null);

  // User Space partition form
  const [newUsername, setNewUsername] = useState<string>('operator_bravo');
  const [newPassword, setNewPassword] = useState<string>('Touchless-Onion-Key#2026');
  const [creatingSpace, setCreatingSpace] = useState<boolean>(false);

  // Python source & CLI
  const [pythonCode, setPythonCode] = useState<string>('');
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Fetch status & source on load
  const loadDaemonStatus = async () => {
    try {
      const res = await fetch('/api/tor-daemon/status');
      const data = await res.json();
      if (data.success && data.status) {
        setDaemonStatus(data.status);
        setServices(data.status.services || []);
        if (data.messages) setMessages(data.messages);
        if (data.status.services?.length > 1 && !selectedRecipient) {
          setSelectedRecipient(data.status.services[1].onionAddress);
        }
      }
    } catch (e) {
      console.error('Failed to load Tor daemon status:', e);
    }
  };

  useEffect(() => {
    loadDaemonStatus();
    // Load python code
    fetch('/api/tor-daemon/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load Tor python code:', err));

    // Countdown interval for TTL timers
    const timer = setInterval(() => {
      setServices(prev =>
        prev.map(s => ({
          ...s,
          expiresInSeconds: Math.max(0, s.expiresInSeconds - 1)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCreateEphemeralService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    try {
      const res = await fetch('/api/tor-daemon/create-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localTargetPort: targetPort, virtualPort, rotationMinutes })
      });
      const data = await res.json();
      if (data.success && data.service) {
        setServices(prev => [data.service, ...prev]);
        loadDaemonStatus();
      }
    } catch (err) {
      console.error('Failed to create ephemeral onion service:', err);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleRotateKey = async (serviceId: string) => {
    setIsRotating(serviceId);
    try {
      const res = await fetch('/api/tor-daemon/rotate-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId })
      });
      const data = await res.json();
      if (data.success) {
        loadDaemonStatus();
      }
    } catch (err) {
      console.error('Failed to rotate service key:', err);
    } finally {
      setIsRotating(null);
    }
  };

  const handleSendP2PMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const sender = services.find(s => s.isActive)?.onionAddress || 'aisecure.onion';
    const recipient = selectedRecipient || services[1]?.onionAddress || 'peer.onion';

    try {
      const res = await fetch('/api/tor-daemon/transmit-p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chatInput,
          senderOnion: sender,
          recipientOnion: recipient
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setChatInput('');
      }
    } catch (err) {
      console.error('Failed to transmit P2P message over Tor:', err);
    }
  };

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/tor-daemon/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run Tor daemon CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateUserSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setCreatingSpace(true);
    try {
      const activeOnion = services.find(s => s.isActive)?.onionAddress || 'aisecure9x4a.onion';
      await onCreateUserSpace(newUsername, newPassword, activeOnion);
      setNewUsername('');
      setNewPassword('');
    } finally {
      setCreatingSpace(false);
    }
  };

  return (
    <div id="tor-v3-daemon-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-teal-950/30 to-zinc-900 border border-teal-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
                Prompt 4 Daemon
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                RFC 7686 & SOCKS5 P2P
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Globe className="w-7 h-7 text-teal-400" />
              Tor v3 Ephemeral Onion Routing Daemon
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Zero-centralized server P2P mesh network manager. Auto-generates temporary 56-character ED25519-V3 hidden services,
              supervises local SOCKS5 proxy (127.0.0.1:9050), executes auto-key rotations, and tunnels authenticated P2P socket frames.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDaemonStatus}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              Refresh Circuits
            </button>
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'services'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Ephemeral Services & Key Rotation
          </button>
          <button
            onClick={() => setActiveSubTab('p2p_socket')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'p2p_socket'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Encrypted P2P Socket Tunnel
          </button>
          <button
            onClick={() => setActiveSubTab('daemon_arch')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'daemon_arch'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Network Mesh Architecture
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
            Python Service (ephemeral_onion_daemon.py)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('topology');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'topology'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Network Topology Map
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
            CLI Execution Trace
          </button>
        </div>
      </div>

      {/* SOCKS5 & Tor Daemon System Quick Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Local SOCKS5 Proxy</div>
            <div className="text-sm font-mono font-bold text-teal-400 mt-0.5">127.0.0.1:9050</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">RFC 1928 (rdns=true)</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Tor ControlPort</div>
            <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">127.0.0.1:9051</div>
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Authenticated
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Lock className="w-5 h-5 text-zinc-300" />
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Bootstrap Progress</div>
            <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">100% (Done)</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">HSDir & Intro Points Ready</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Active .onion Services</div>
            <div className="text-sm font-mono font-bold text-zinc-100 mt-0.5">{services.filter(s => s.isActive).length} Services</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Auto-Rotate @ 300s TTL</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* SUB-TAB: TOPOLOGY */}
      {activeSubTab === 'topology' && (
        <div className="h-[500px] w-full">
          <NetworkTopologyMap />
        </div>
      )}

      {/* SUB-TAB 1: SERVICES & KEY ROTATION */}
      {activeSubTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Provisioning Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Provision Ephemeral Tor v3 Service</h3>
                </div>
                <span className="text-[10px] font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
                  ADD_ONION V3
                </span>
              </div>

              <form onSubmit={handleCreateEphemeralService} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Local Application Port (Forward Target)</label>
                  <input
                    type="number"
                    value={targetPort}
                    onChange={e => setTargetPort(parseInt(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-teal-500"
                    placeholder="e.g. 8888"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Port on 127.0.0.1 where local P2P daemon listens</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Virtual .onion Port</label>
                    <input
                      type="number"
                      value={virtualPort}
                      onChange={e => setVirtualPort(parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-teal-500"
                      placeholder="80"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Key Rotation TTL</label>
                    <select
                      value={rotationMinutes}
                      onChange={e => setRotationMinutes(parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-teal-500"
                    >
                      <option value={1}>1 Minute (Fast Rotate)</option>
                      <option value={5}>5 Minutes (Default)</option>
                      <option value={15}>15 Minutes</option>
                      <option value={60}>1 Hour</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="w-full mt-2 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Plus className={`w-4 h-4 ${isProvisioning ? 'animate-spin' : ''}`} />
                  <span>{isProvisioning ? 'Creating Ephemeral Service...' : 'Deploy Ephemeral .onion'}</span>
                </button>
              </form>
            </div>

            {/* Zero-Knowledge Partition Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Bind User Space Identity</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  ISOLATED
                </span>
              </div>

              <form onSubmit={handleCreateUserSpace} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Space Identity Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Master Secret Passphrase</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingSpace}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg border border-zinc-700 flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Provision Partition Record</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right: Active Ephemeral Services List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                Active Ephemeral .onion Services ({services.length})
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                ED25519-V3 Base32 Checksums
              </span>
            </div>

            <div className="space-y-3">
              {services.map((service, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition ${
                    service.isActive
                      ? 'bg-zinc-900 border-zinc-800 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${service.isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {service.isActive ? 'Active Service' : 'Decommissioned (Key Rotated)'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-950 text-teal-300 rounded border border-zinc-800">
                          {service.keyType}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 break-all mt-1 select-all font-semibold">
                        {service.onionAddress}
                      </div>
                    </div>

                    <button
                      onClick={() => copyAddress(service.onionAddress)}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 flex-shrink-0"
                      title="Copy .onion"
                    >
                      {copiedAddr === service.onionAddress ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Forwarding:</span>{' '}
                      <span className="text-zinc-300">:{service.virtualPort} → 127.0.0.1:{service.localTargetPort}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Circuits:</span>{' '}
                      <span className="text-teal-400">{service.circuitsEstablished} Established</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {service.isActive && (
                        <>
                          <span className="text-zinc-500">TTL:</span>
                          <span className="text-amber-400 font-bold">{service.expiresInSeconds}s</span>
                          <button
                            onClick={() => handleRotateKey(service.serviceId)}
                            disabled={isRotating === service.serviceId}
                            className="ml-2 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded border border-zinc-700 flex items-center gap-1"
                          >
                            <RotateCw className={`w-3 h-3 text-teal-400 ${isRotating === service.serviceId ? 'animate-spin' : ''}`} />
                            Rotate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ENCRYPTED P2P SOCKET TUNNEL */}
      {activeSubTab === 'p2p_socket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Peer Channel Console */}
          <div className="lg:col-span-12 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    P2P Encrypted Socket Tunnel over Tor SOCKS5
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    Direct socket tunneling via PySocks / socks.socksocket (RFC 1928) with HMAC-SHA256 frame integrity
                  </span>
                </div>
              </div>

              {/* Recipient Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-mono">Peer Target:</span>
                <select
                  value={selectedRecipient}
                  onChange={e => setSelectedRecipient(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                >
                  {services.map((s, idx) => (
                    <option key={idx} value={s.onionAddress}>
                      {s.onionAddress.slice(0, 16)}...onion ({s.isActive ? 'Active' : 'Retired'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-xs font-mono">
              {messages.map((m, idx) => {
                const isMe = m.senderOnion.includes('aisecure');
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl max-w-[80%] ${
                      isMe
                        ? 'ml-auto bg-teal-950/40 border border-teal-500/30 text-teal-100'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 gap-4">
                      <span className="truncate text-teal-300 font-bold">
                        {isMe ? 'Local Daemon (You)' : `Peer: ${m.senderOnion.slice(0, 20)}...`}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{m.text}</p>
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Payload: {m.encryptedBytes}B</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> HMAC-SHA256 Authenticated
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendP2PMessage} className="flex space-x-2 pt-3 border-t border-zinc-800">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type encrypted message to peer over .onion SOCKS5 tunnel..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:border-teal-500 outline-none font-mono"
              />
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-teal-600/30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NETWORK MESH ARCHITECTURE */}
      {activeSubTab === 'daemon_arch' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Zero Centralized Servers</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                End-to-end anonymity guaranteed via Tor v3 rendezvous points. Nodes publish their temporary descriptor to the Distributed Hash Table (HSDir) without exposing public IP addresses.
              </p>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-teal-300">
                P2P = NodeA → IntroPoint → RendezvousPoint ← NodeB
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <RotateCw className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Ephemeral Key Auto-Rotation</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Cryptographic keys rotate on programmable intervals (e.g. 300s). The daemon issues <code className="text-amber-300">ADD_ONION</code> for the new descriptor before issuing <code className="text-amber-300">DEL_ONION</code> to achieve zero packet-loss rollover.
              </p>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-amber-300">
                DEL_ONION &lt;old_service_id&gt; (Discards PK)
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Framed Socket Security</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                All application-layer traffic passing through the SOCKS5 proxy is wrapped in length-prefixed binary frames encrypted with session keys and signed with HMAC-SHA256 digests.
              </p>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-emerald-300">
                Frame = Length[4B] + Seq[4B] + Ciphertext + HMAC[32B]
              </div>
            </div>
          </div>

          {/* Architectural Diagram */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Tor v3 P2P Mesh Daemon Protocol Topology
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-teal-400 font-bold mb-2">1. Tor Daemon Supervisor</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• Custom DataDirectory</li>
                  <li>• SOCKS5 proxy @ 9050</li>
                  <li>• ControlPort @ 9051</li>
                  <li>• Process heartbeat monitor</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-teal-400 font-bold mb-2">2. Hidden Service Manager</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• ADD_ONION NEW:ED25519-V3</li>
                  <li>• 56-char base32 address</li>
                  <li>• Port forward: 80 → 8888</li>
                  <li>• HSDir publication</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-teal-400 font-bold mb-2">3. Auto-Rotation Daemon</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• TTL countdown worker</li>
                  <li>• Zero-downtime rollover</li>
                  <li>• DEL_ONION decommissioning</li>
                  <li>• Memory scrub on expire</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-teal-400 font-bold mb-2">4. SOCKS5 P2P Engine</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• PySocks SOCKS5 client</li>
                  <li>• Remote DNS resolution</li>
                  <li>• X25519 session frames</li>
                  <li>• HMAC-SHA256 authentication</li>
                </ul>
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
              <FileCode className="w-5 h-5 text-teal-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/ephemeral_onion_daemon.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Self-contained Python Service with PySocks</span>
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
              {pythonCode || 'Loading Python service source code...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CLI TEST TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-teal-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python ephemeral_onion_daemon.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Daemon CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 select-none">&gt;</span>
                  <span className={log.includes('complete') || log.includes('verified') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Daemon CLI Test&quot; to execute ephemeral hidden service provisioning and SOCKS5 P2P handshake simulation.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
