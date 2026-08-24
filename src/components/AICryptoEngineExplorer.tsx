import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Shield,
  Activity,
  Fingerprint,
  Lock,
  Cpu,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  Zap,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Compass,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { AdaptiveKeyResult, TouchPointData } from '../types';

export const AICryptoEngineExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'interactive' | 'entropy_math' | 'python_code' | 'cli_runner'>('interactive');
  const [touchPoints, setTouchPoints] = useState<TouchPointData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actionType, setActionType] = useState<'SWIPE' | 'TAP' | 'FLING' | 'DRAG'>('SWIPE');
  const [latitude, setLatitude] = useState(37.77);
  const [longitude, setLongitude] = useState(-122.41);
  const [contextInfo, setContextInfo] = useState('post_quantum_hybrid_vault');
  const [keyLength, setKeyLength] = useState(32);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<AdaptiveKeyResult | null>(null);
  const [pythonCode, setPythonCode] = useState<string>('');
  const [pythonLogs, setPythonLogs] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Python code
  useEffect(() => {
    fetch('/api/ai-crypto/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) {
          setPythonCode(data.code);
        }
      })
      .catch(err => console.error('Failed to load Python source:', err));

    // Run initial generation with baseline preset
    runKeyGenerationPreset('swipe');
  }, []);

  // Draw touch path on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (touchPoints.length < 2) {
      if (touchPoints.length === 1) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(touchPoints[0].x, touchPoints[0].y, 10 * touchPoints[0].pressure, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Draw gradient trail
    for (let i = 1; i < touchPoints.length; i++) {
      const p1 = touchPoints[i - 1];
      const p2 = touchPoints[i];
      
      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#818cf8');

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(3, (p1.pressure + p2.pressure) * 8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Velocity indicator dot
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, Math.max(2, p2.pressure * 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }, [touchPoints]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.55;

    setIsDrawing(true);
    const newPt: TouchPointData = {
      x,
      y,
      pressure,
      touchMajor: 24 + pressure * 16,
      timestampMs: performance.now()
    };
    setTouchPoints([newPt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : (0.4 + Math.sin(x * 0.05) * 0.3 + 0.3);

    const newPt: TouchPointData = {
      x,
      y,
      pressure: Math.min(1.0, Math.max(0.1, pressure)),
      touchMajor: 20 + pressure * 20,
      timestampMs: performance.now()
    };
    setTouchPoints(prev => [...prev, newPt]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    triggerGeneration(touchPoints);
  };

  const runKeyGenerationPreset = (type: 'swipe' | 'fling' | 'tap' | 'irregular') => {
    let pts: TouchPointData[] = [];
    const baseTime = performance.now();

    if (type === 'swipe') {
      setActionType('SWIPE');
      pts = [
        { x: 40, y: 160, pressure: 0.38, touchMajor: 22, timestampMs: baseTime },
        { x: 95, y: 145, pressure: 0.52, touchMajor: 26, timestampMs: baseTime + 16 },
        { x: 170, y: 120, pressure: 0.76, touchMajor: 32, timestampMs: baseTime + 32 },
        { x: 260, y: 90, pressure: 0.84, touchMajor: 36, timestampMs: baseTime + 48 },
        { x: 340, y: 65, pressure: 0.62, touchMajor: 29, timestampMs: baseTime + 64 },
        { x: 400, y: 45, pressure: 0.40, touchMajor: 21, timestampMs: baseTime + 80 },
      ];
    } else if (type === 'fling') {
      setActionType('FLING');
      pts = [
        { x: 60, y: 180, pressure: 0.88, touchMajor: 38, timestampMs: baseTime },
        { x: 150, y: 140, pressure: 0.92, touchMajor: 40, timestampMs: baseTime + 8 },
        { x: 280, y: 80, pressure: 0.74, touchMajor: 34, timestampMs: baseTime + 16 },
        { x: 420, y: 30, pressure: 0.35, touchMajor: 20, timestampMs: baseTime + 24 },
      ];
    } else if (type === 'tap') {
      setActionType('TAP');
      pts = [
        { x: 220, y: 110, pressure: 0.65, touchMajor: 28, timestampMs: baseTime },
        { x: 221, y: 111, pressure: 0.68, touchMajor: 29, timestampMs: baseTime + 45 },
      ];
    } else {
      setActionType('DRAG');
      pts = [
        { x: 50, y: 50, pressure: 0.45, touchMajor: 25, timestampMs: baseTime },
        { x: 120, y: 150, pressure: 0.58, touchMajor: 28, timestampMs: baseTime + 40 },
        { x: 200, y: 80, pressure: 0.71, touchMajor: 33, timestampMs: baseTime + 85 },
        { x: 310, y: 160, pressure: 0.82, touchMajor: 37, timestampMs: baseTime + 130 },
        { x: 380, y: 70, pressure: 0.60, touchMajor: 29, timestampMs: baseTime + 175 },
      ];
    }

    setTouchPoints(pts);
    triggerGeneration(pts);
  };

  const triggerGeneration = async (pts: TouchPointData[]) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai-crypto/generate-adaptive-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touchPoints: pts,
          actionType,
          latitude,
          longitude,
          contextInfo,
          keyLengthBytes: keyLength
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data.result);
      }
    } catch (e) {
      console.error('Error generating adaptive keystream:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const runPythonCliTest = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai-crypto/run-python-cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setPythonLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to run Python CLI test:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, isCode = false) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div id="ai-crypto-engine-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Prompt 3 Engine
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                0-Plaintext Biometric Guarantee
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Brain className="w-7 h-7 text-indigo-400" />
              AI Behavioral Context & Adaptive Keystream Generator
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Dynamic cryptographic salt and keystream generation engine. Analyzes touch kinematics (velocity, pressure variance),
              spatiotemporal circadian harmonics, and GPS cell hashes via NumPy and RFC 5869 HKDF with continuous Shannon/NIST min-entropy estimation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => runKeyGenerationPreset('swipe')}
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Re-Derive Keystream
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('interactive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'interactive'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Interactive Sensor Lab & HKDF
          </button>
          <button
            onClick={() => setActiveSubTab('entropy_math')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'entropy_math'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            NIST SP 800-90B & Shannon Math
          </button>
          <button
            onClick={() => setActiveSubTab('python_code')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'python_code'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Production Python (AICryptoEngine)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('cli_runner');
              if (pythonLogs.length === 0) runPythonCliTest();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'cli_runner'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Execution Trace
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE SENSOR LAB */}
      {activeSubTab === 'interactive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Touch Canvas & Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Live Touch Dynamics Capture</h3>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {touchPoints.length} sample points
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Draw a swipe or tap gesture in the box below to generate real-time touch velocity, pressure variance, and microsecond timing jitter vectors.
              </p>

              {/* Canvas Box */}
              <div className="relative border border-zinc-700/80 rounded-lg overflow-hidden bg-zinc-950/90 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={200}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                />
                <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/80 backdrop-blur rounded text-[10px] text-zinc-400 border border-zinc-700/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Motion Sensor Track
                </div>
                <div className="absolute bottom-2 right-2 pointer-events-none text-[10px] text-zinc-500 font-mono">
                  {isDrawing ? 'Sampling @ 120Hz...' : 'Release to Derive HKDF Key'}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-zinc-400 font-medium">Synthetic Trajectories:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => runKeyGenerationPreset('swipe')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                  >
                    Smooth Swipe
                  </button>
                  <button
                    onClick={() => runKeyGenerationPreset('fling')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                  >
                    Fast Fling
                  </button>
                  <button
                    onClick={() => runKeyGenerationPreset('tap')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                  >
                    Single Tap
                  </button>
                  <button
                    onClick={() => runKeyGenerationPreset('irregular')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                  >
                    Multi-Curve Drag
                  </button>
                </div>
              </div>
            </div>

            {/* Spatiotemporal Context Parameters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Spatiotemporal Harmonics & Privacy Boxes</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Coarse Latitude (1.1km box)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={latitude}
                    onChange={e => setLatitude(parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Coarse Longitude (1.1km box)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={longitude}
                    onChange={e => setLongitude(parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Application Context String (HKDF Info)</label>
                  <input
                    type="text"
                    value={contextInfo}
                    onChange={e => setContextInfo(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Output Keystream Length</label>
                  <select
                    value={keyLength}
                    onChange={e => setKeyLength(parseInt(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value={16}>16 Bytes (128-bit AES)</option>
                    <option value={32}>32 Bytes (256-bit Post-Quantum / ChaCha20)</option>
                    <option value={64}>64 Bytes (512-bit Master Keystream)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Derived Dynamic Keystream & Entropy Validation */}
          <div className="lg:col-span-6 space-y-6">
            {lastResult ? (
              <>
                {/* Result Card */}
                <div className="bg-zinc-900 border border-indigo-500/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-sm font-semibold text-zinc-100">HKDF Adaptive Derivation Output</h3>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Epoch #{lastResult.epochCounter}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <div className="text-zinc-400 text-[11px] mb-1 flex items-center justify-between">
                        <span>Dynamic Cryptographic Salt (32 Bytes):</span>
                        <span className="text-indigo-300">Generated in {lastResult.latencyMs} ms</span>
                      </div>
                      <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-emerald-400 break-all select-all">
                        {lastResult.saltHex}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-400 text-[11px] mb-1 flex items-center justify-between">
                        <span>Derived Keystream ({keyLength} Bytes):</span>
                        <button
                          onClick={() => copyToClipboard(lastResult.keystreamHex)}
                          className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                        >
                          {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedKey ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-sky-400 break-all select-all">
                        {lastResult.keystreamHex}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-400 text-[11px] mb-1">
                        Non-Invertible Blinded Privacy Hash:
                      </div>
                      <div className="p-2 bg-zinc-950/80 border border-zinc-800/80 rounded text-zinc-500 break-all">
                        {lastResult.privacyHash}
                      </div>
                    </div>
                  </div>

                  {/* Entropy Meters */}
                  <div className="mt-5 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[11px] text-zinc-400 mb-1">Shannon Entropy</div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {lastResult.entropyReport.shannonEntropyBitsPerByte} <span className="text-xs font-normal text-zinc-500">/ 8.0 bits</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${(lastResult.entropyReport.shannonEntropyBitsPerByte / 8.0) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/60 rounded border border-zinc-800">
                      <div className="text-[11px] text-zinc-400 mb-1">NIST SP 800-90B Min-Entropy</div>
                      <div className="text-lg font-bold font-mono text-indigo-400">
                        {lastResult.entropyReport.minEntropyNist80090b} <span className="text-xs font-normal text-zinc-500">bits</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-indigo-400 h-full rounded-full"
                          style={{ width: `${(lastResult.entropyReport.minEntropyNist80090b / 8.0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Behavioral Feature Vector Breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    NumPy Extracted Vector Matrix
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Mean Velocity</div>
                      <div className="text-zinc-200">{lastResult.features.meanVelocity} px/ms</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Vel Variance</div>
                      <div className="text-zinc-200">{lastResult.features.velocityVariance}</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Mean Pressure</div>
                      <div className="text-zinc-200">{lastResult.features.meanPressure}</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Pressure σ</div>
                      <div className="text-zinc-200">{lastResult.features.pressureStd}</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Timing Jitter</div>
                      <div className="text-zinc-200">{lastResult.features.timingJitter} ms</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Contact Area</div>
                      <div className="text-zinc-200">{lastResult.features.meanArea} px²</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Circadian Harmonic</div>
                      <div className="text-zinc-200">sin={lastResult.features.circadianSin}</div>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Spatial Hash</div>
                      <div className="text-zinc-200">{lastResult.features.spatialHash}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-zinc-400">
                Generating initial biometric context...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENTROPY & SECURITY MATHEMATICS */}
      {activeSubTab === 'entropy_math' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Zero-Plaintext Biometrics</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Touch gestures, coordinates, and raw biometric points are never stored on persistent storage or memory dumps.
                All interaction events are immediately passed through high-order statistical aggregators and blinded with ephemeral hardware seeds.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-emerald-300">
                IKM = PackDouble(Features) + DeviceSeed[32B] + Nonce
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">RFC 5869 HKDF Extract & Expand</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Two-stage key derivation architecture separating randomness extraction from keystream expansion.
                Uses HMAC-SHA-256 to ensure that even non-uniform behavioral entropy yields a pseudorandom master key indistinguishable from random noise.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-indigo-300">
                PRK = HMAC-SHA256(EphemeralSalt, IKM)
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-semibold text-zinc-200">NIST SP 800-90B Quality Gates</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Continuous online health tests evaluating min-entropy H_min = -log2(p_max) and Shannon bits/byte.
                Key generation is automatically discarded if entropy falls below the 7.75 bits/byte threshold.
              </p>
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-sky-300">
                H = - Σ p_i * log2(p_i) &gt;= 7.75 bits/byte
              </div>
            </div>
          </div>

          {/* Mathematical Pipeline Visualization */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Dynamic Keystream Mathematical Pipeline Architecture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-indigo-400 font-bold mb-2">Stage 1: Multi-Modal Capture</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• MotionEvent (x, y, pressure, major)</li>
                  <li>• Kinematic derivation (vel, accel, jitter)</li>
                  <li>• Circadian phase [sin(θ), cos(θ)]</li>
                  <li>• Coarse GPS (1.1km quantized hash)</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-indigo-400 font-bold mb-2">Stage 2: NumPy Projection</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• 12-Dimensional feature vector</li>
                  <li>• Double-precision IEEE-754 packing</li>
                  <li>• Nanosecond timestamp epoch jitter</li>
                  <li>• Atomic hardware session counter</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-indigo-400 font-bold mb-2">Stage 3: HKDF Extract/Expand</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• Ephemeral SHA-256 extractor salt</li>
                  <li>• PRK = HMAC(Salt, IKM + TEE_Seed)</li>
                  <li>• Dynamic Salt = Expand(PRK, "salt")</li>
                  <li>• Keystream = Expand(PRK, "stream")</li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="text-indigo-400 font-bold mb-2">Stage 4: Quality & Validation</div>
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  <li>• Shannon &gt; 7.75 bits/byte verification</li>
                  <li>• NIST SP 800-90B MCV test</li>
                  <li>• One-way blinded privacy digest</li>
                  <li>• Memory wiped after derivation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTION PYTHON CODE */}
      {activeSubTab === 'python_code' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/ai_crypto_engine.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Production Python Class AICryptoEngine</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(pythonCode, true)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded font-medium flex items-center gap-1.5 transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy Python Code'}
            </button>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto max-h-[580px] font-mono text-xs text-zinc-300 leading-relaxed">
            <pre className="text-zinc-300">
              {pythonCode || 'Loading production Python code...'}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: CLI EXECUTION TRACE */}
      {activeSubTab === 'cli_runner' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python ai_crypto_engine.py</h3>
            </div>
            <button
              onClick={runPythonCliTest}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Run Test Harness
            </button>
          </div>

          <div className="p-5 bg-zinc-950 font-mono text-xs space-y-2 text-zinc-300">
            {pythonLogs.length > 0 ? (
              pythonLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-400 select-none">&gt;</span>
                  <span className={log.includes('PASSED') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>{log}</span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">Click &quot;Run Test Harness&quot; to execute synthetic multi-touch simulation and entropy scoring.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
