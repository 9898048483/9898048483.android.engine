import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  EyeOff,
  Sun,
  Moon,
  Layers,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Maximize2,
  Lock,
  Flame,
  Radio,
  Sliders,
  Cpu,
  Monitor,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { KivyUIStateDTO, KivyThemeMode, ScreenshotCaptureAttemptDTO } from '../types';

export const KivyGuiRenderingLayer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'emulator' | 'flag_secure' | 'graphics_engine' | 'kv_layout' | 'python_logic' | 'cli_trace'>('emulator');

  const [state, setState] = useState<KivyUIStateDTO | null>(null);
  const [screenshotLogs, setScreenshotLogs] = useState<ScreenshotCaptureAttemptDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Biometric popup state in emulator
  const [showBioModal, setShowBioModal] = useState<boolean>(false);
  const [bioProgress, setBioProgress] = useState<number>(0);
  const [bioSuccess, setBioSuccess] = useState<boolean>(false);

  // Source viewers
  const [kvSource, setKvSource] = useState<string>('');
  const [pySource, setPySource] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // CLI trace
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kivy/status');
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        if (data.recentScreenshotAttempts) {
          setScreenshotLogs(data.recentScreenshotAttempts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Kivy UI state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    fetch('/api/kivy/kv-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setKvSource(data.code);
      })
      .catch((err) => console.error('Failed to fetch KV source:', err));

    fetch('/api/kivy/python-source')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPySource(data.code);
      })
      .catch((err) => console.error('Failed to fetch Python source:', err));
  }, []);

  const handleToggleFlagSecure = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/kivy/toggle-flag-secure', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to toggle FLAG_SECURE:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetTheme = async (theme: KivyThemeMode) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/kivy/set-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to set theme:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetRenderApi = async (renderApi: string, vsync?: boolean, fpsTarget?: number) => {
    try {
      const res = await fetch('/api/kivy/set-render-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renderApi,
          vsync: vsync !== undefined ? vsync : state?.vsync,
          fpsTarget: fpsTarget || state?.fpsTarget
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to set render API:', err);
    }
  };

  const handleTestScreenshotInterception = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/kivy/test-screenshot-interception', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.attempt) {
        setScreenshotLogs((prev) => [data.attempt, ...prev]);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to test screenshot interception:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerBiometrics = () => {
    setShowBioModal(true);
    setBioProgress(0);
    setBioSuccess(false);

    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      setBioProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setBioSuccess(true);
        setTimeout(() => {
          setShowBioModal(false);
        }, 1200);
      }
    }, 150);
  };

  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/kivy/run-cli-test', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run Kivy CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Emulator style resolver based on active theme
  const getEmulatorStyle = () => {
    switch (state?.theme) {
      case 'LIGHT_HIGH_CONTRAST':
        return {
          bg: 'bg-zinc-100',
          card: 'bg-white border-zinc-300 text-zinc-900',
          text: 'text-zinc-900',
          muted: 'text-zinc-600',
          border: 'border-zinc-300',
          accentBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      case 'TACTICAL_AMBER':
        return {
          bg: 'bg-[#0f0c05]',
          card: 'bg-[#1c170b] border-amber-900/60 text-amber-100',
          text: 'text-amber-100',
          muted: 'text-amber-400/70',
          border: 'border-amber-900/50',
          accentBtn: 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
        };
      case 'DARK_CYBER':
      default:
        return {
          bg: 'bg-zinc-950',
          card: 'bg-zinc-900/90 border-zinc-800 text-zinc-100',
          text: 'text-zinc-100',
          muted: 'text-zinc-400',
          border: 'border-zinc-800',
          accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white'
        };
    }
  };

  const emuStyle = getEmulatorStyle();

  return (
    <div id="kivy-gui-rendering-layer-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Prompt 12 Cross-Platform Kivy / Native GUI Rendering Layer
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                OpenGL ES 3.0 / Vulkan 1.2
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                FLAG_SECURE Anti-Capture
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Smartphone className="w-7 h-7 text-indigo-400" />
              Cross-Platform Kivy / Native GUI Rendering Layer
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Adaptive, touch-first graphical user interface in Kivy with hardware-accelerated OpenGL/Vulkan rendering,
              dynamic dark/light themes, biometric liveness popups, and secure window flags (<code>FLAG_SECURE</code>) preventing screenshot leakage.
            </p>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Window Flag</span>
              <div className={`text-base font-bold font-mono ${state?.flagSecureActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {state?.flagSecureActive ? 'FLAG_SECURE' : 'UNSECURED'}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner min-w-[130px]">
              <span className="text-[10px] text-zinc-500 block font-mono uppercase">Graphics Backend</span>
              <div className="text-base font-bold text-indigo-400 font-mono">
                {state?.renderApi ?? 'OpenGL ES 3.0'}
              </div>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh GUI State"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('emulator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'emulator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Live Kivy Touch Emulator
          </button>

          <button
            onClick={() => setActiveSubTab('flag_secure')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'flag_secure'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            FLAG_SECURE Anti-Capture Auditor
          </button>

          <button
            onClick={() => setActiveSubTab('graphics_engine')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'graphics_engine'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Graphics Pipeline &amp; Shaders
          </button>

          <button
            onClick={() => setActiveSubTab('kv_layout')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'kv_layout'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Kivy Screen Layout (secure_ui.kv)
          </button>

          <button
            onClick={() => setActiveSubTab('python_logic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_logic'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Controller Logic (kivy_gui_engine.py)
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
            Kivy CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE KIVY TOUCH EMULATOR */}
      {activeSubTab === 'emulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Theme Switcher Card */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Dynamic High-Security Theming
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Kivy dynamically binds color properties across all screens without reloading the scene graph.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSetTheme('DARK_CYBER')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    state?.theme === 'DARK_CYBER'
                      ? 'bg-zinc-950 border-emerald-500 text-emerald-400 shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark Cyber
                </button>

                <button
                  onClick={() => handleSetTheme('LIGHT_HIGH_CONTRAST')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    state?.theme === 'LIGHT_HIGH_CONTRAST'
                      ? 'bg-zinc-100 border-zinc-400 text-zinc-900 shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light Contrast
                </button>

                <button
                  onClick={() => handleSetTheme('TACTICAL_AMBER')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    state?.theme === 'TACTICAL_AMBER'
                      ? 'bg-[#1c170b] border-amber-500 text-amber-300 shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  Tactical Amber
                </button>
              </div>
            </div>

            {/* Window Protection Toggle */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-rose-400" />
                  Window Screenshot Flag
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md border ${
                    state?.flagSecureActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {state?.flagSecureActive ? 'FLAG_SECURE: ON' : 'FLAG_SECURE: OFF'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Applies <code>WindowManager.LayoutParams.FLAG_SECURE</code> via PyJNIus to render a black surface during screen capture, screen-sharing, and recent app thumbnails.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleToggleFlagSecure}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    state?.flagSecureActive
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                  }`}
                >
                  {state?.flagSecureActive ? 'Disable FLAG_SECURE' : 'Enable FLAG_SECURE'}
                </button>

                <button
                  onClick={handleTestScreenshotInterception}
                  disabled={actionLoading}
                  className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                  title="Simulate Screenshot Capture Attempt"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Capture Test
                </button>
              </div>
            </div>

            {/* Hardware & Display Diagnostics */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-lg text-xs font-mono">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Display &amp; Kivy Surface Metrics
              </span>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Display Density:</span>
                  <span className="text-indigo-400">{state?.screenDensityDpi ?? 440} DPI (xxhdpi)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Virtual Canvas:</span>
                  <span className="text-zinc-200">{state?.windowResolution ?? '1080x2400'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Renderer:</span>
                  <span className="text-emerald-400">{state?.renderApi ?? 'OpenGL ES 3.0'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Frame Target:</span>
                  <span className="text-cyan-400">{state?.fpsTarget ?? 60} FPS (VSync: ON)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Mobile Emulator (8 Cols) */}
          <div className="lg:col-span-8 flex justify-center">
            {/* Phone Bezel */}
            <div className="w-full max-w-[420px] bg-zinc-950 border-4 border-zinc-800 rounded-[42px] p-3.5 shadow-2xl relative">
              {/* Speaker / Camera Notch */}
              <div className="w-36 h-5 bg-zinc-900 rounded-full mx-auto mb-3 flex items-center justify-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-800" />
                <div className="w-10 h-1 bg-zinc-800 rounded-full" />
              </div>

              {/* Screen Canvas */}
              <div
                className={`w-full min-h-[640px] rounded-[30px] p-5 transition-colors duration-300 relative overflow-hidden flex flex-col justify-between ${emuStyle.bg}`}
              >
                {/* Top Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono pb-3 border-b border-zinc-800/40">
                  <span className={`font-bold ${emuStyle.text}`}>10:42</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        state?.flagSecureActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {state?.flagSecureActive ? 'FLAG_SECURE' : 'UNSECURED'}
                    </span>
                    <span className={emuStyle.muted}>5G • 88%</span>
                  </div>
                </div>

                {/* Main Screen Content */}
                <div className="space-y-4 my-auto py-2">
                  {/* Header Title in Phone */}
                  <div>
                    <h4 className={`text-lg font-bold tracking-tight ${emuStyle.text}`}>AI SECURE SPACE</h4>
                    <p className={`text-[11px] ${emuStyle.muted}`}>Hardware KeyStore • OpenGL ES 3.0 • Tor Active</p>
                  </div>

                  {/* Card 1: Biometric Auth */}
                  <div className={`p-4 rounded-2xl border transition-all ${emuStyle.card}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Touchless Biometrics
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">STRONG_BOX</span>
                    </div>
                    <p className={`text-xs mb-3 ${emuStyle.muted}`}>
                      ML Kit Face Liveness: ACTIVE • Hardware StrongBox Key Sealed
                    </p>
                    <button
                      onClick={handleTriggerBiometrics}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${emuStyle.accentBtn}`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Authenticate Biometrics
                    </button>
                  </div>

                  {/* Card 2: Tor Onion */}
                  <div className={`p-4 rounded-2xl border transition-all ${emuStyle.card}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5" />
                        Tor v3 Onion Tunnel
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">168ms</span>
                    </div>
                    <p className={`text-xs mb-3 truncate ${emuStyle.muted}`}>
                      Active Hidden Service: 7t9pkwx8...torv3.onion
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={fetchStatus}
                        className="py-1.5 px-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                      >
                        Switch Circuit
                      </button>
                      <button
                        onClick={fetchStatus}
                        className="py-1.5 px-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                      >
                        Audit Sockets
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Duress & Panic */}
                  <div className={`p-4 rounded-2xl border transition-all ${emuStyle.card}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        Hardware Panic Wipe
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">DoD 5220.22-M</span>
                    </div>
                    <p className={`text-xs mb-3 ${emuStyle.muted}`}>
                      Multi-pass storage zeroizer &amp; out-of-band panic beacon
                    </p>
                    <button
                      onClick={() => alert('Emergency Panic Wipe Confirmation Dialog (Simulated)')}
                      className="w-full py-2 px-3 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Emergency Panic Wipe
                    </button>
                  </div>
                </div>

                {/* Bottom Navigation Indicator Bar */}
                <div className="pt-3 border-t border-zinc-800/40 flex justify-center">
                  <div className="w-28 h-1 bg-zinc-600 rounded-full" />
                </div>

                {/* Modal Overlay for Biometrics Simulation */}
                {showBioModal && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
                    <div className="w-full bg-zinc-900 border border-emerald-500/50 rounded-2xl p-5 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center relative">
                        <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                        <div className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ping" />
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-zinc-100">Touchless Face Verification</h5>
                        <p className="text-xs text-zinc-400 mt-1">
                          Verifying micro-movements with ML Kit hardware pipeline...
                        </p>
                      </div>

                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-150"
                          style={{ width: `${bioProgress}%` }}
                        />
                      </div>

                      {bioSuccess && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Authentication Verified (StrongBox TEE)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FLAG_SECURE ANTI-CAPTURE AUDITOR */}
      {activeSubTab === 'flag_secure' && (
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-rose-400" />
                  Android FLAG_SECURE Window Protection &amp; Capture Prevention
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enforces <code>WindowManager.LayoutParams.FLAG_SECURE</code> (0x00002000) on Android Activity SurfaceView to prohibit hardware screenshots, screen casting, and recent-app thumbnail leakage.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFlagSecure}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition border shadow ${
                    state?.flagSecureActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {state?.flagSecureActive ? 'FLAG_SECURE IS ACTIVE' : 'FLAG_SECURE DISABLED'}
                </button>

                <button
                  onClick={handleTestScreenshotInterception}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Simulate Capture Probe
                </button>
              </div>
            </div>

            {/* Interception Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950">
                    <th className="p-3">Probe ID</th>
                    <th className="p-3">Timestamp (UTC)</th>
                    <th className="p-3">Caller Source</th>
                    <th className="p-3">FLAG_SECURE</th>
                    <th className="p-3">SurfaceFlinger Outcome</th>
                    <th className="p-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {screenshotLogs.map((log) => (
                    <tr key={log.attemptId} className="hover:bg-zinc-950/50 transition">
                      <td className="p-3 font-bold text-indigo-400">{log.attemptId}</td>
                      <td className="p-3 text-zinc-300">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 text-zinc-300">{log.caller}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.flagSecureEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.flagSecureEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-semibold flex items-center gap-1.5 ${
                            log.outcome === 'BLOCKED_BLACK_FRAME' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.outcome === 'BLOCKED_BLACK_FRAME' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {log.outcome}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GRAPHICS PIPELINE & BENCHMARKS */}
      {activeSubTab === 'graphics_engine' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Hardware-Accelerated Rendering Pipeline &amp; Shaders
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select graphics runtime contexts and configure VSync frame synchronization parameters for Kivy SDL2 window providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => handleSetRenderApi('OpenGL ES 3.0')}
              className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                state?.renderApi === 'OpenGL ES 3.0'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-200">1. OpenGL ES 3.0 (Recommended)</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  EGL Context
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Native Android GPU pipeline supporting custom fragment shaders and low-overhead UI element draw calls.
              </p>
            </div>

            <div
              onClick={() => handleSetRenderApi('Vulkan 1.2')}
              className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                state?.renderApi === 'Vulkan 1.2'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-200">2. Vulkan 1.2 Backend</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  Zero Driver Overhead
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Direct hardware memory management with multi-threaded command buffers and minimal driver CPU overhead.
              </p>
            </div>

            <div
              onClick={() => handleSetRenderApi('Software Fallback')}
              className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                state?.renderApi === 'Software Fallback'
                  ? 'bg-amber-950/40 border-amber-500 shadow-md'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-200">3. Software Fallback</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  CPU Rasterizer
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Failsafe CPU rasterization mode used in restricted virtualization or headless testing environments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: KV LAYOUT SOURCE */}
      {activeSubTab === 'kv_layout' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/python/secure_ui.kv</span>
            </div>
            <button
              onClick={() => copyToClipboard(kvSource, 'kv')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode === 'kv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'kv' ? 'Copied' : 'Copy KV Source'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">{kvSource || 'Loading KV layout...'}</pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PYTHON CONTROLLER SOURCE */}
      {activeSubTab === 'python_logic' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">/android/python/kivy_gui_engine.py</span>
            </div>
            <button
              onClick={() => copyToClipboard(pySource, 'py')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'py' ? 'Copied' : 'Copy Python Controller'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed rounded-lg">
            <pre className="text-zinc-300">{pySource || 'Loading Python controller...'}</pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Kivy GUI Execution Output: python kivy_gui_engine.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Kivy Test Trace
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {cliLogs.length > 0 ? (
              cliLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-400 select-none">&gt;</span>
                  <span
                    className={
                      log.includes('READY') || log.includes('successfully')
                        ? 'text-emerald-400 font-semibold'
                        : log.includes('FLAG_SECURE')
                        ? 'text-cyan-300 font-semibold'
                        : 'text-zinc-300'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">
                Click &quot;Run Kivy Test Trace&quot; to test OpenGL ES 3.0 context initialization, screen tree building, and FLAG_SECURE assertion.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
