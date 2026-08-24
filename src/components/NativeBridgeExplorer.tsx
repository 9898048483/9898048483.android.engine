import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  Globe2, 
  Terminal, 
  Play, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code2, 
  Zap, 
  Activity, 
  Database, 
  HardDrive, 
  RefreshCw,
  FolderTree,
  FileCode,
  ShieldCheck,
  Languages,
  Radio
} from 'lucide-react';
import { NativeFile, NativeTelemetryStats } from '../types';

export const NativeBridgeExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'source' | 'jni_sim' | 'shm_ipc' | 'allocator' | 'locale'>('source');
  const [files, setFiles] = useState<NativeFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('bridge_h');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Telemetry state
  const [stats, setStats] = useState<NativeTelemetryStats>({
    totalJniCalls: 1428,
    totalPythonDispatches: 864,
    totalIpcPackets: 5920,
    totalBytesTransferred: 48920140,
    avgJniLatencyMicros: 3.42,
    allocatedSlabBytes: 3840000,
    peakAllocatedBytes: 8192000,
    fragmentationRatio: 0.018,
    currentLocale: {
      bcp47Tag: 'en-US',
      languageIso639_1: 'en',
      languageIso639_2: 'eng',
      scriptIso15924: 'Latn',
      countryIso3166_1: 'US',
      displayName: 'English (United States)',
      isRTL: false,
      currencyCode: 'USD',
      source: '__system_property_get("persist.sys.locale")'
    }
  });

  // JNI Simulation State
  const [jniLang, setJniLang] = useState<'python' | 'kotlin'>('python');
  const [jniScript, setJniScript] = useState<string>('ai_inference.py');
  const [jniFunc, setJniFunc] = useState<string>('handle_ai_inference');
  const [jniPayload, setJniPayload] = useState<string>('{"prompt": "Execute NDK zero-latency tensor pass"}');
  const [jniResult, setJniResult] = useState<any>(null);
  const [isJniRunning, setIsJniRunning] = useState<boolean>(false);

  // IPC Simulation State
  const [ipcPayloadSize, setIpcPayloadSize] = useState<number>(65536);
  const [ipcPacketType, setIpcPacketType] = useState<string>('AI_TENSOR_BUFFER');
  const [ipcResult, setIpcResult] = useState<any>(null);
  const [isIpcRunning, setIsIpcRunning] = useState<boolean>(false);

  // Locale State
  const [testLocaleProp, setTestLocaleProp] = useState<string>('hi-IN');
  const [localeResult, setLocaleResult] = useState<any>(null);
  const [isLocaleLoading, setIsLocaleLoading] = useState<boolean>(false);

  // Load native files from server
  const fetchNativeFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/native/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load native files', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNativeFiles();
  }, []);

  const handleCopyCode = () => {
    const activeFile = files.find(f => f.id === selectedFileId);
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runJniSimulation = async () => {
    try {
      setIsJniRunning(true);
      const res = await fetch('/api/native/simulate-jni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: jniLang,
          script: jniScript,
          functionName: jniFunc,
          payload: jniPayload
        })
      });
      const data = await res.json();
      setJniResult(data);
      if (data.updatedStats) setStats(data.updatedStats);
    } catch (e) {
      console.error('JNI simulation failed', e);
    } finally {
      setIsJniRunning(false);
    }
  };

  const runIpcSimulation = async () => {
    try {
      setIsIpcRunning(true);
      const res = await fetch('/api/native/simulate-ipc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetType: ipcPacketType,
          payloadSizeBytes: ipcPayloadSize,
          slotCount: 256
        })
      });
      const data = await res.json();
      setIpcResult(data);
      setStats(prev => ({
        ...prev,
        totalIpcPackets: prev.totalIpcPackets + 1,
        totalBytesTransferred: prev.totalBytesTransferred + ipcPayloadSize
      }));
    } catch (e) {
      console.error('IPC simulation failed', e);
    } finally {
      setIsIpcRunning(false);
    }
  };

  const runLocaleDetection = async (override?: string) => {
    try {
      setIsLocaleLoading(true);
      const res = await fetch('/api/native/detect-locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideProperty: override !== undefined ? override : testLocaleProp
        })
      });
      const data = await res.json();
      setLocaleResult(data);
      if (data.resolvedLocale) {
        setStats(prev => ({ ...prev, currentLocale: data.resolvedLocale }));
      }
    } catch (e) {
      console.error('Locale detection failed', e);
    } finally {
      setIsLocaleLoading(false);
    }
  };

  const selectedFile = files.find(f => f.id === selectedFileId) || files[0];

  return (
    <div id="native-bridge-explorer" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-indigo-400" />
                Prompt 1: Core Native Runtime & Multi-Language Bridge
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Production-Ready C++/NDK
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Cpu className="w-6 h-6 text-indigo-400" />
              Android C++ NDK Multi-Language Engine
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Thread-safe JNI bindings, zero-copy POSIX shared memory IPC ring buffers, cache-aligned low-overhead slab allocators, and full ISO language locale resolution directly at the Linux Bionic kernel layer.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">Avg JNI Overhead</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">{stats.avgJniLatencyMicros} µs</div>
              <div className="text-[10px] text-slate-500">Zero GC Stalls</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">IPC Throughput</div>
              <div className="text-lg font-bold text-cyan-400 mt-0.5 font-mono">2.8 GB/s</div>
              <div className="text-[10px] text-slate-500">POSIX mmap</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">Slab Frag. Ratio</div>
              <div className="text-lg font-bold text-purple-400 mt-0.5 font-mono">{(stats.fragmentationRatio * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-slate-500">&lt; 5% Target</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">Native Locale</div>
              <div className="text-lg font-bold text-amber-300 mt-0.5 font-mono">{stats.currentLocale.bcp47Tag}</div>
              <div className="text-[10px] text-slate-500">ISO 639-1 / BCP 47</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            id="tab-source"
            onClick={() => setActiveTab('source')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            C++ NDK & CMake Sources ({files.length})
          </button>
          <button
            id="tab-jni-sim"
            onClick={() => setActiveTab('jni_sim')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'jni_sim'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Thread-Safe JNI & Python Bridge
          </button>
          <button
            id="tab-shm-ipc"
            onClick={() => setActiveTab('shm_ipc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'shm_ipc'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            POSIX Shared Memory Ring Buffer
          </button>
          <button
            id="tab-allocator"
            onClick={() => setActiveTab('allocator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'allocator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Low-Overhead Slab Allocator
          </button>
          <button
            id="tab-locale"
            onClick={() => setActiveTab('locale')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'locale'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            Native ISO Locale Detector
          </button>
        </div>
      </div>

      {/* TAB 1: C++ NDK Sources Browser */}
      {activeTab === 'source' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  Engine Architecture Files
                </span>
                <button
                  onClick={fetchNativeFiles}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Reload Files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                      selectedFileId === file.id
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Code2 className={`w-3.5 h-3.5 flex-shrink-0 ${
                        file.lang === 'cmake' ? 'text-amber-400' :
                        file.lang === 'kotlin' ? 'text-purple-400' :
                        file.lang === 'python' ? 'text-emerald-400' : 'text-cyan-400'
                      }`} />
                      <span className="truncate font-semibold">{file.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-sans">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture Highlights Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Key Architectural Invariants
              </div>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li><strong className="text-slate-200">Thread-Safe JNI:</strong> Automatic daemon thread attachment with scoped local ref release.</li>
                <li><strong className="text-slate-200">Zero-Copy POSIX IPC:</strong> Memory mapped <code className="text-indigo-300">/dev/shm</code> ring buffers.</li>
                <li><strong className="text-slate-200">Zero GC Pauses:</strong> 64B–64KB fixed multi-class slab pools.</li>
                <li><strong className="text-slate-200">Hardware Locales:</strong> Direct Bionic <code className="text-indigo-300">__system_property_get</code> query.</li>
              </ul>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
              {/* Code Header Bar */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-indigo-400 border border-slate-700 uppercase">
                    {selectedFile?.category}
                  </span>
                  <span className="text-xs font-mono text-slate-300 font-medium truncate">
                    /{selectedFile?.path}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Code Viewer Body */}
              <div className="p-4 bg-slate-950/60 font-mono text-xs text-slate-200 overflow-x-auto max-h-[580px] overflow-y-auto leading-relaxed">
                <pre className="text-slate-300 whitespace-pre">
                  <code>{selectedFile?.content || '// Loading native source code...'}</code>
                </pre>
              </div>

              {/* Footer */}
              <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Lines: {selectedFile?.content?.split('\n').length || 0}</span>
                <span>Language: {selectedFile?.lang?.toUpperCase()}</span>
                <span>Target: Target SDK 34 / ARM64-v8a / x86_64</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JNI & Python Bridge Simulator */}
      {activeTab === 'jni_sim' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Cross-Language JNI Execution Engine
              </h3>
              <p className="text-xs text-slate-400">
                Simulate thread-safe cross-language invocations passing tensors and payloads between Java/Kotlin, C++ NDK core, and Chaquopy/Kivy Python.
              </p>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Target Runtime Layer</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setJniLang('python'); setJniScript('ai_inference.py'); setJniFunc('handle_ai_inference'); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      jniLang === 'python' ? 'bg-emerald-600 text-white font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Python (Chaquopy/Kivy)
                  </button>
                  <button
                    onClick={() => { setJniLang('kotlin'); setJniScript('NativeBridge.kt'); setJniFunc('onNativeEventDispatch'); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      jniLang === 'kotlin' ? 'bg-purple-600 text-white font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Kotlin / Java Runtime
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Target Script / Class</label>
                  <input
                    type="text"
                    value={jniScript}
                    onChange={(e) => setJniScript(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Target Function / Method</label>
                  <input
                    type="text"
                    value={jniFunc}
                    onChange={(e) => setJniFunc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Payload (JSON or Raw Bytes)</label>
                <textarea
                  rows={3}
                  value={jniPayload}
                  onChange={(e) => setJniPayload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                id="btn-run-jni"
                onClick={runJniSimulation}
                disabled={isJniRunning}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isJniRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                {isJniRunning ? 'Dispatching via NDK JNI...' : 'Execute Native JNI Call'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live JNI Execution & GIL Trace
              </h3>

              {jniResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-slate-400">JNI Roundtrip</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{jniResult.latencyMicros} µs</div>
                      <div className="text-[10px] text-slate-500">({jniResult.latencyMs} ms)</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-slate-400">Thread Status</div>
                      <div className="text-xs font-bold text-cyan-300 font-mono mt-1">DAEMON</div>
                      <div className="text-[10px] text-slate-500">Auto-Detached</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-slate-400">Memory Slab</div>
                      <div className="text-xs font-bold text-purple-300 font-mono mt-1">{jniResult.memoryPool}</div>
                      <div className="text-[10px] text-slate-500">Zero GC Pressure</div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                    <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Runtime Dispatch Completed
                    </div>
                    <div className="text-slate-400">Runtime: <span className="text-white">{jniResult.runtime}</span></div>
                    <div className="text-slate-400">Target: <span className="text-indigo-300">{jniResult.targetScript} → {jniResult.targetFunction}()</span></div>
                    <div className="text-slate-400">GIL Mutex: <span className="text-emerald-300">{jniResult.gilState}</span></div>
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold mb-1">Return Output</div>
                      <pre className="bg-slate-900 p-2.5 rounded text-amber-200 overflow-x-auto text-[11px]">
                        {JSON.stringify(jniResult.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  Click "Execute Native JNI Call" to trigger cross-language dispatch with microsecond timing.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POSIX Shared Memory Ring Buffer */}
      {activeTab === 'shm_ipc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                POSIX Shared Memory IPC Channel
              </h3>
              <p className="text-xs text-slate-400">
                High-throughput zero-copy lock-free circular ring buffer sharing 16MB of contiguous RAM between Java/Kotlin and Python runtimes.
              </p>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">IPC Packet Type</label>
                <select
                  value={ipcPacketType}
                  onChange={(e) => setIpcPacketType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="AI_TENSOR_BUFFER">AI_TENSOR_BUFFER (Real-Time ML Inference Frame)</option>
                  <option value="JSON_COMMAND">JSON_COMMAND (Structured Command / Config)</option>
                  <option value="RAW_BINARY">RAW_BINARY (Zero-Copy Byte Stream)</option>
                  <option value="PYTHON_EXEC_CODE">PYTHON_EXEC_CODE (Chaquopy Bytecode)</option>
                  <option value="HEARTBEAT_PING">HEARTBEAT_PING (Multi-Process Keepalive)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Payload Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4096, 65536, 1048576].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setIpcPayloadSize(sz)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                        ipcPayloadSize === sz ? 'bg-cyan-600 text-white font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sz >= 1048576 ? '1 MB' : `${sz / 1024} KB`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="btn-run-ipc"
                onClick={runIpcSimulation}
                disabled={isIpcRunning}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                {isIpcRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isIpcRunning ? 'Writing to POSIX shm...' : 'Push Zero-Copy Ring Buffer Packet'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Ring Buffer Slots & Atomic CAS Status
              </h3>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Channel: <strong className="text-white">ai_engine_ipc_channel</strong></span>
                  <span>Magic: <strong className="text-indigo-400">0x4149534D (AISM)</strong></span>
                  <span>Total Sent: <strong className="text-emerald-400">{stats.totalIpcPackets}</strong></span>
                </div>

                {/* Simulated 32-slot visual indicator */}
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 pt-2">
                  {Array.from({ length: 32 }).map((_, idx) => {
                    const isOccupied = (idx + (ipcResult?.sequenceId || 0)) % 7 === 0;
                    const isWriting = idx === ((ipcResult?.sequenceId || 0) % 32);
                    return (
                      <div
                        key={idx}
                        className={`h-7 rounded flex items-center justify-center text-[10px] font-mono border transition-all ${
                          isWriting
                            ? 'bg-cyan-500 text-white border-cyan-300 font-bold scale-105 shadow-md shadow-cyan-500/50'
                            : isOccupied
                            ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                        title={`Slot #${idx}: ${isWriting ? 'Active Write (CAS)' : isOccupied ? 'Ready for Consume' : 'Free'}`}
                      >
                        {idx}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block"></span> Active CAS</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-950 border border-indigo-800 inline-block"></span> Queued</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800 inline-block"></span> Available</span>
                  </div>
                  <span>Capacity: 256 Slots × 64KB (16 MB)</span>
                </div>
              </div>

              {ipcResult && (
                <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                  <div className="text-cyan-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Zero-Copy IPC Transfer Verified
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>Throughput: <strong className="text-white">{ipcResult.throughputMBs} MB/s</strong></div>
                    <div>Roundtrip: <strong className="text-emerald-400">{ipcResult.roundtripLatencyMicros} µs</strong></div>
                    <div>Seq ID: <strong className="text-indigo-400">#{ipcResult.sequenceId}</strong></div>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">POSIX Path: {ipcResult.posixPath}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Low-Overhead Slab Allocator */}
      {activeTab === 'allocator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Allocated Slab Memory</div>
              <div className="text-xl font-bold text-white mt-1 font-mono">
                {(stats.allocatedSlabBytes / (1024 * 1024)).toFixed(2)} MB
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Budget: 32.0 MB Fixed Heap</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Peak High Watermark</div>
              <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
                {(stats.peakAllocatedBytes / (1024 * 1024)).toFixed(2)} MB
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Auto-monitored</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Internal Fragmentation</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {(stats.fragmentationRatio * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Negligible heap waste</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Cache Alignment</div>
              <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">64-Byte</div>
              <div className="text-[11px] text-slate-500 mt-1">ARM64 NEON & x86 L1/L2</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Deterministic Multi-Class Slab Pools (O(1) Allocation)
            </h3>

            <div className="space-y-3">
              {[
                { name: 'Slab 64B', count: 4096, used: 1240, desc: 'Small JNI arguments, atomic signals, IPC headers' },
                { name: 'Slab 256B', count: 2048, used: 680, desc: 'JSON payloads, locale descriptors, function routing keys' },
                { name: 'Slab 1KB', count: 1024, used: 310, desc: 'AI token embeddings, text summarization chunks' },
                { name: 'Slab 4KB', count: 512, used: 128, desc: 'Page-aligned I/O, crypto keystore records' },
                { name: 'Slab 64KB', count: 64, used: 18, desc: 'Raw audio frames, bitmap segments, IPC payloads' },
                { name: 'Tensor Continuous Arena', count: 1, used: 0.35, isArena: true, desc: '16MB zero-fragmentation circular arena for real-time model weights' }
              ].map(slab => {
                const pct = slab.isArena ? 35 : Math.round((slab.used / slab.count) * 100);
                return (
                  <div key={slab.name} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{slab.name}</span>
                      <span className="text-slate-400">
                        {slab.isArena ? '5.6 MB / 16.0 MB' : `${slab.used} / ${slab.count} blocks`} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans">{slab.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Native ISO Locale Detector */}
      {activeTab === 'locale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-400" />
                Native ISO Language & Locale Detector
              </h3>
              <p className="text-xs text-slate-400">
                Directly probes Linux kernel / Android Bionic properties (<code className="text-indigo-300">persist.sys.locale</code>, <code className="text-indigo-300">ro.product.locale</code>) without crossing into JVM overhead.
              </p>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Simulate Hardware System Property</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { tag: 'en-US', label: 'English (US)' },
                    { tag: 'hi-IN', label: 'Hindi (India)' },
                    { tag: 'ja-JP', label: 'Japanese (JP)' },
                    { tag: 'ar-AE', label: 'Arabic (UAE, RTL)' },
                    { tag: 'zh-CN', label: 'Chinese (Hans)' },
                    { tag: 'de-DE', label: 'German (DE)' }
                  ].map(loc => (
                    <button
                      key={loc.tag}
                      onClick={() => { setTestLocaleProp(loc.tag); runLocaleDetection(loc.tag); }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left truncate ${
                        testLocaleProp === loc.tag ? 'bg-amber-600 text-white font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Custom Locale Tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testLocaleProp}
                    onChange={(e) => setTestLocaleProp(e.target.value)}
                    placeholder="e.g. es-ES, pt-BR, ur-PK"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    id="btn-detect-locale"
                    onClick={() => runLocaleDetection()}
                    disabled={isLocaleLoading}
                    className="px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isLocaleLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Detect'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Languages className="w-4 h-4 text-amber-400" />
                Parsed ISO & BCP-47 Resolution Matrix
              </h3>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Canonical BCP-47 Tag</div>
                    <div className="text-base font-bold text-amber-400 mt-1">{stats.currentLocale.bcp47Tag}</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Writing Direction</div>
                    <div className={`text-base font-bold mt-1 ${stats.currentLocale.isRTL ? 'text-red-400' : 'text-emerald-400'}`}>
                      {stats.currentLocale.isRTL ? 'Right-To-Left (RTL)' : 'Left-To-Right (LTR)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">ISO 639-1 (2-letter)</div>
                    <div className="text-sm font-bold text-white mt-0.5">{stats.currentLocale.languageIso639_1}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">ISO 639-2 (3-letter)</div>
                    <div className="text-sm font-bold text-white mt-0.5">{stats.currentLocale.languageIso639_2}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">ISO 3166-1 Region</div>
                    <div className="text-sm font-bold text-white mt-0.5">{stats.currentLocale.countryIso3166_1}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">ISO 15924 Script</div>
                    <div className="text-xs font-bold text-indigo-300 mt-0.5">{stats.currentLocale.scriptIso15924}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Currency Code</div>
                    <div className="text-xs font-bold text-emerald-300 mt-0.5">{stats.currentLocale.currencyCode}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <span>Detection Source: </span>
                  <span className="text-cyan-300 font-mono">{stats.currentLocale.source}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
