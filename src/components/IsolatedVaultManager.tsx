import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  HardDrive, 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  Plus, 
  FolderPlus, 
  Upload, 
  FileText, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Terminal, 
  FileCode, 
  Copy, 
  Check, 
  Flame, 
  Globe, 
  Eye, 
  EyeOff, 
  Cpu, 
  Database,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { VaultPartitionInfo, VaultFileItem } from '../types';

export const IsolatedVaultManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'partitions' | 'file_explorer' | 'deniable_vault' | 'python_source' | 'cli_trace'>('partitions');
  
  // Partitions state
  const [partitions, setPartitions] = useState<VaultPartitionInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Selected / Active Mounted Partition
  const [selectedPartitionId, setSelectedPartitionId] = useState<string>('part_operator_alpha_01');
  const [mountPassword, setMountPassword] = useState<string>('MasterVaultPassword2026!');
  const [customMountPath, setCustomMountPath] = useState<string>('');
  const [mountedFiles, setMountedFiles] = useState<VaultFileItem[]>([]);
  const [activeMountInfo, setActiveMountInfo] = useState<{ mountPoint: string; onionAddress: string; fernetKeyPreview: string } | null>(null);

  // New Partition Form
  const [newTenant, setNewTenant] = useState<string>('operator_bravo');
  const [newPass, setNewPass] = useState<string>('BravoSecurePass2026!');
  const [newMount, setNewMount] = useState<string>('/mnt/vault/operator_bravo');
  const [newIterations, setNewIterations] = useState<number>(120000);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Deniable Pair Wizard
  const [deniableTenant, setDeniableTenant] = useState<string>('operator_stealth');
  const [decoyPass, setDecoyPass] = useState<string>('DecoyStandardPass123!');
  const [hiddenPass, setHiddenPass] = useState<string>('TopSecretClassifiedPass999!');
  const [isCreatingDeniable, setIsCreatingDeniable] = useState<boolean>(false);

  // File I/O
  const [newFilePath, setNewFilePath] = useState<string>('/configs/network_proxy.json');
  const [newFileContent, setNewFileContent] = useState<string>('{\n  "proxy_type": "Tor_v3_SOCKS5",\n  "port": 9050,\n  "auto_scramble": true\n}');
  const [isWritingFile, setIsWritingFile] = useState<boolean>(false);
  const [selectedFileForRead, setSelectedFileForRead] = useState<string | null>(null);
  const [readResult, setReadResult] = useState<{ content: string; sha256: string; fernetToken: string } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  // Python Source & CLI Logs
  const [pythonCode, setPythonCode] = useState<string>('');
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Fetch partitions on mount
  const loadPartitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault/partitions');
      const data = await res.json();
      if (data.success && data.partitions) {
        setPartitions(data.partitions);
      }
    } catch (err) {
      console.error('Failed to load partitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartitions();

    fetch('/api/vault/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load vault python code:', err));
  }, []);

  // Mount Partition
  const handleMountPartition = async (partitionId: string, passOverride?: string) => {
    setActionMsg(null);
    try {
      const res = await fetch('/api/vault/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partitionId,
          password: passOverride || mountPassword,
          customMountPoint: customMountPath || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`✅ Partition mounted at ${data.mountPoint} (Fernet Key Derived via PBKDF2)`);
        setActiveMountInfo({
          mountPoint: data.mountPoint,
          onionAddress: data.onionAddress,
          fernetKeyPreview: data.fernetKeyPreview
        });
        setMountedFiles(data.files || []);
        setSelectedPartitionId(partitionId);
        loadPartitions();
      } else {
        setActionMsg(`❌ Mount failed: ${data.error}`);
      }
    } catch (e: any) {
      setActionMsg(`❌ Mount error: ${e.message}`);
    }
  };

  // Unmount Partition
  const handleUnmountPartition = async (partitionId: string) => {
    setActionMsg(null);
    try {
      const res = await fetch('/api/vault/unmount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`🔒 ${data.message}`);
        setActiveMountInfo(null);
        setMountedFiles([]);
        loadPartitions();
      }
    } catch (e: any) {
      setActionMsg(`❌ Unmount error: ${e.message}`);
    }
  };

  // Create Partition
  const handleCreatePartition = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/vault/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newTenant,
          password: newPass,
          mountPoint: newMount,
          kdfIterations: newIterations
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`✨ Partition created for '${newTenant}' with mapped onion ${data.partition.onionAddress}`);
        loadPartitions();
        setSelectedPartitionId(data.partition.partitionId);
      }
    } catch (e: any) {
      setActionMsg(`❌ Creation error: ${e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Create Deniable Pair
  const handleCreateDeniablePair = async () => {
    setIsCreatingDeniable(true);
    try {
      const res = await fetch('/api/vault/create-deniable-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: deniableTenant,
          decoyPassword: decoyPass,
          hiddenPassword: hiddenPass
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`🎭 Plausible Deniability Pair Provisioned: Decoy (${data.decoyPartition.partitionId}) & Hidden (${data.hiddenPartition.partitionId})`);
        loadPartitions();
      }
    } catch (e: any) {
      setActionMsg(`❌ Deniable pair creation error: ${e.message}`);
    } finally {
      setIsCreatingDeniable(false);
    }
  };

  // Write File to Mounted Partition
  const handleWriteFile = async () => {
    if (!newFilePath || !newFileContent) return;
    setIsWritingFile(true);
    try {
      const res = await fetch('/api/vault/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partitionId: selectedPartitionId,
          virtualPath: newFilePath,
          content: newFileContent,
          contentType: newFilePath.endsWith('.json') ? 'application/json' : 'text/plain'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`📄 Encrypted and wrote '${newFilePath}' (${data.file.fileSizeBytes} bytes, Fernet token bound)`);
        // Refresh files
        fetchMountedFiles(selectedPartitionId);
        loadPartitions();
      } else {
        setActionMsg(`❌ Write failed: ${data.error}`);
      }
    } catch (e: any) {
      setActionMsg(`❌ Write error: ${e.message}`);
    } finally {
      setIsWritingFile(false);
    }
  };

  // Fetch mounted files list
  const fetchMountedFiles = async (partitionId: string) => {
    try {
      const res = await fetch(`/api/vault/files/${partitionId}`);
      const data = await res.json();
      if (data.success && data.files) {
        setMountedFiles(data.files);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Read / Decrypt File
  const handleReadFile = async (virtualPath: string) => {
    setSelectedFileForRead(virtualPath);
    setReadResult(null);
    setReadError(null);
    try {
      const res = await fetch('/api/vault/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partitionId: selectedPartitionId,
          virtualPath
        })
      });
      const data = await res.json();
      if (data.success) {
        setReadResult({
          content: data.content,
          sha256: data.sha256Checksum,
          fernetToken: data.fernetToken
        });
      } else {
        setReadError(data.error);
      }
    } catch (e: any) {
      setReadError(e.message);
    }
  };

  // Emergency Duress Shred
  const handleWipePartition = async (partitionId: string) => {
    if (!confirm(`Are you sure you want to trigger emergency cryptographic shredding on partition ${partitionId}? This is irreversible.`)) {
      return;
    }
    try {
      const res = await fetch('/api/vault/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`🚨 ${data.message}`);
        setActiveMountInfo(null);
        setMountedFiles([]);
        loadPartitions();
      }
    } catch (e: any) {
      setActionMsg(`❌ Wipe error: ${e.message}`);
    }
  };

  // Run CLI Test
  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/vault/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run vault CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activePartition = partitions.find(p => p.partitionId === selectedPartitionId);

  return (
    <div id="isolated-vault-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border border-amber-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Prompt 6 Isolated Storage
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                PBKDF2-HMAC-SHA256 & Fernet File System Layer
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <FolderLock className="w-7 h-7 text-amber-400" />
              Isolated User Space & Deniable Vault Manager
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Multi-tenant encrypted partition engine supporting dynamic virtual mount points, PBKDF2-HMAC-SHA256 key stretching,
              RFC-compliant Fernet key derivation, plausible deniability (decoy vs hidden vault), and per-partition .onion mapping.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadPartitions}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Partitions
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('partitions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'partitions'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Tenant Partitions ({partitions.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('file_explorer');
              if (selectedPartitionId) fetchMountedFiles(selectedPartitionId);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'file_explorer'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Virtual Encrypted File Explorer
          </button>
          <button
            onClick={() => setActiveSubTab('deniable_vault')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'deniable_vault'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Plausible Deniability Architecture
          </button>
          <button
            onClick={() => setActiveSubTab('python_source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_source'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Python Service (isolated_vault.py)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('cli_trace');
              if (cliLogs.length === 0) handleRunCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_trace'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Lifecycle CLI Test
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
          actionMsg.includes('✅') || actionMsg.includes('✨')
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : actionMsg.includes('🚨')
            ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
        }`}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-zinc-400 hover:text-zinc-200 ml-4">✕</button>
        </div>
      )}

      {/* SUB-TAB 1: PARTITIONS & DYNAMIC MOUNT POINTS */}
      {activeSubTab === 'partitions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Partitions Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  Active Tenant Partitions
                </h3>
                <span className="text-xs text-zinc-400">
                  {partitions.filter(p => p.status === 'MOUNTED').length} Mounted / {partitions.length} Total
                </span>
              </div>

              <div className="space-y-3">
                {partitions.map((part) => (
                  <div
                    key={part.partitionId}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedPartitionId === part.partitionId
                        ? 'bg-zinc-900 border-amber-500/50 shadow-md'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-zinc-100">
                            {part.partitionId}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-semibold uppercase ${
                            part.status === 'MOUNTED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : part.status === 'SHREDDED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {part.status}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            part.tier === 'DENIABLE_HIDDEN_VAULT'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-800'
                              : part.tier === 'DENIABLE_DECOY'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {part.tier}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-zinc-400">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">Tenant</span>
                            <strong className="text-zinc-200 font-mono">{part.tenantId}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">Mount Point</span>
                            <strong className="text-amber-300 font-mono text-[11px] truncate block">{part.mountPoint}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">Files / Size</span>
                            <span className="text-zinc-300 font-mono">{part.fileCount} files ({part.totalBytes} B)</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">KDF Stretched</span>
                            <span className="text-emerald-400 font-mono">{part.kdfIterations.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-zinc-400">
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Onion ID: <strong className="text-indigo-300">{part.onionAddress}</strong></span>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        {part.status === 'MOUNTED' ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPartitionId(part.partitionId);
                                setActiveSubTab('file_explorer');
                                fetchMountedFiles(part.partitionId);
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Browse Files
                            </button>
                            <button
                              onClick={() => handleUnmountPartition(part.partitionId)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition"
                            >
                              <Unlock className="w-3.5 h-3.5 text-amber-400" />
                              Unmount
                            </button>
                          </>
                        ) : part.status !== 'SHREDDED' ? (
                          <button
                            onClick={() => {
                              setSelectedPartitionId(part.partitionId);
                              handleMountPartition(part.partitionId);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Mount Vault
                          </button>
                        ) : null}

                        {part.status !== 'SHREDDED' && (
                          <button
                            onClick={() => handleWipePartition(part.partitionId)}
                            className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded text-[11px] font-semibold border border-rose-800/60 flex items-center gap-1 transition"
                          >
                            <Flame className="w-3 h-3" />
                            Shred
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Mount & Create Partition Controls */}
            <div className="space-y-6">
              {/* Quick Mount Box */}
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Dynamic Mount Authorization
                </h3>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Target Partition</label>
                  <select
                    value={selectedPartitionId}
                    onChange={(e) => setSelectedPartitionId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  >
                    {partitions.map(p => (
                      <option key={p.partitionId} value={p.partitionId}>
                        {p.partitionId} ({p.tenantId} - {p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Passphrase (PBKDF2-HMAC-SHA256)</label>
                  <input
                    type="password"
                    value={mountPassword}
                    onChange={(e) => setMountPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                    placeholder="Enter partition passphrase..."
                  />
                </div>

                <button
                  onClick={() => handleMountPartition(selectedPartitionId)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Lock className="w-4 h-4" />
                  Derive Fernet Key & Mount
                </button>
              </div>

              {/* Create Partition Box */}
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  Create Multi-Tenant Partition
                </h3>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    value={newTenant}
                    onChange={(e) => {
                      setNewTenant(e.target.value);
                      setNewMount(`/mnt/vault/${e.target.value}`);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Partition Password</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">KDF Iterations</label>
                    <input
                      type="number"
                      value={newIterations}
                      onChange={(e) => setNewIterations(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Mount Path</label>
                    <input
                      type="text"
                      value={newMount}
                      onChange={(e) => setNewMount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreatePartition}
                  disabled={isCreating}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Format & Encrypt New Partition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VIRTUAL ENCRYPTED FILE EXPLORER */}
      {activeSubTab === 'file_explorer' && (
        <div className="space-y-6">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Active Mount Target:</div>
                <div className="text-sm font-mono font-bold text-zinc-100">
                  {activePartition ? `${activePartition.partitionId} (${activePartition.mountPoint})` : 'No Partition Selected'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                activePartition?.status === 'MOUNTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {activePartition?.status === 'MOUNTED' ? 'STATUS: MOUNTED & DECRYPTING' : 'STATUS: UNMOUNTED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Col: File List in Mounted Partition */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Encrypted Virtual Filesystem Catalog
                </h3>
                <span className="text-xs text-zinc-400">{mountedFiles.length} file entries</span>
              </div>

              {mountedFiles.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {mountedFiles.map((file) => (
                    <div
                      key={file.virtualPath}
                      onClick={() => handleReadFile(file.virtualPath)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedFileForRead === file.virtualPath
                          ? 'bg-amber-950/30 border-amber-500/50'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-xs font-semibold text-zinc-200">{file.virtualPath}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {file.fileSizeBytes} Bytes
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-zinc-500 truncate">
                        SHA256: {file.sha256Checksum}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-500">
                  {activePartition?.status === 'MOUNTED'
                    ? 'No files yet in this partition. Use the form on the right to write encrypted files.'
                    : 'Partition is unmounted. Please mount it with your passphrase to browse files.'}
                </div>
              )}

              {/* Decrypted Payload Preview */}
              {readResult && (
                <div className="p-4 bg-zinc-950 border border-emerald-500/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Decrypted File Payload ({selectedFileForRead})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Fernet AES-CBC Validated</span>
                  </div>
                  <pre className="p-3 bg-zinc-900 rounded font-mono text-xs text-zinc-200 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {readResult.content}
                  </pre>
                </div>
              )}

              {readError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300 font-mono">
                  Read Error: {readError}
                </div>
              )}
            </div>

            {/* Right Col: Write New Encrypted File */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Write Encrypted File to Vault
              </h3>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Virtual Path</label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                  placeholder="/directory/filename.ext"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Plaintext Content (Fernet Encrypted On-the-fly)</label>
                <textarea
                  rows={6}
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 font-mono outline-none"
                  placeholder="Enter file text or JSON payload..."
                />
              </div>

              <button
                onClick={handleWriteFile}
                disabled={isWritingFile || activePartition?.status !== 'MOUNTED'}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition"
              >
                {isWritingFile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Encrypt & Commit File to Partition</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PLAUSIBLE DENIABILITY WIZARD */}
      {activeSubTab === 'deniable_vault' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-purple-400" />
              Plausible Deniability & Decoy Vault Architecture
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
              Under coercion or forced disclosure, an operator cannot simply be compelled to give up their key without proof of whether
              other partitions exist. The Plausible Deniability Engine creates two cryptographically indistinguishable partitions bound
              to the same storage footprint:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-zinc-950 rounded-lg border border-blue-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Decoy Partition (Passcode A)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Entering standard decoy password mounts a fully working file system with plausible mundane documents (e.g. schedules, dummy logs).
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-purple-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Hidden True Vault (Passcode B)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Entering the hidden master password derives an entirely distinct Fernet key from high-entropy PBKDF2 iterations, revealing classified operational secrets.
                </p>
              </div>
            </div>
          </div>

          {/* Create Plausible Pair Form */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Provision Linked Decoy + Hidden Vault Pair
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tenant Prefix</label>
                <input
                  type="text"
                  value={deniableTenant}
                  onChange={(e) => setDeniableTenant(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-400 mb-1">Decoy Passcode</label>
                <input
                  type="password"
                  value={decoyPass}
                  onChange={(e) => setDecoyPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-blue-800/80 rounded-lg px-3 py-2 text-xs text-blue-300 font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-400 mb-1">Hidden Master Passcode</label>
                <input
                  type="password"
                  value={hiddenPass}
                  onChange={(e) => setHiddenPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-purple-800/80 rounded-lg px-3 py-2 text-xs text-purple-300 font-mono outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCreateDeniablePair}
              disabled={isCreatingDeniable}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              <span>Generate Deniable Dual-Vault Partitions</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PYTHON SOURCE CODE */}
      {activeSubTab === 'python_source' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/isolated_vault.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Storage Security Specialist Engine</span>
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
              {pythonCode || 'Loading Isolated Vault Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CLI TEST TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python isolated_vault.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Vault Lifecycle CLI Test
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 select-none">&gt;</span>
                  <span className={log.includes('OK') || log.includes('MATCHED') || log.includes('MOUNTED') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Vault Lifecycle CLI Test&quot; to execute PBKDF2 stretching, Fernet mounting, and file system encryption.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
