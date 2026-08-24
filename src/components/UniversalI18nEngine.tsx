import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Languages,
  ArrowRightLeft,
  Terminal,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
  Flame,
  Radio,
  Cpu,
  CornerDownRight,
  BookOpen
} from 'lucide-react';
import { LocaleMetaDTO, TranslationResultDTO } from '../types';

export const UniversalI18nEngine: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'live_preview' | 'plural_workbench' | 'locales_matrix' | 'bundle_inspector' | 'python_source' | 'cli_trace'>('live_preview');

  // State
  const [locales, setLocales] = useState<LocaleMetaDTO[]>([]);
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [loadingLocales, setLoadingLocales] = useState<boolean>(false);
  const [switching, setSwitching] = useState<boolean>(false);

  // Bundle Data
  const [currentBundle, setCurrentBundle] = useState<Record<string, any>>({});
  const [inspectLocale, setInspectLocale] = useState<string>('en');

  // Pluralization Workbench State
  const [pluralKey, setPluralKey] = useState<string>('active_devices_count');
  const [testCount, setTestCount] = useState<number>(3);
  const [testLocale, setTestLocale] = useState<string>('ar');
  const [translationResult, setTranslationResult] = useState<TranslationResultDTO | null>(null);
  const [evaluatingPlural, setEvaluatingPlural] = useState<boolean>(false);

  // Python Source & CLI
  const [pythonCode, setPythonCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [cliLogs, setCliLogs] = useState<string[]>([]);
  const [isRunningCli, setIsRunningCli] = useState<boolean>(false);

  // Fetch supported locales
  const loadLocales = async () => {
    setLoadingLocales(true);
    try {
      const res = await fetch('/api/i18n/locales');
      const data = await res.json();
      if (data.success) {
        setLocales(data.locales);
        setCurrentLocale(data.currentLocale);
        setDirection(data.direction);
      }
    } catch (err) {
      console.error('Failed to load locales:', err);
    } finally {
      setLoadingLocales(false);
    }
  };

  // Fetch bundle
  const loadBundle = async (loc: string) => {
    try {
      const res = await fetch(`/api/i18n/bundle/${loc}`);
      const data = await res.json();
      if (data.success) {
        setCurrentBundle(data.bundle);
      }
    } catch (err) {
      console.error('Failed to load bundle:', err);
    }
  };

  useEffect(() => {
    loadLocales();
    loadBundle('en');

    fetch('/api/i18n/python-source')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.code) setPythonCode(data.code);
      })
      .catch(err => console.error('Failed to load python source:', err));
  }, []);

  // Switch Active Locale
  const handleSwitchLocale = async (newLocale: string) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/i18n/switch-locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLocale(data.currentLocale);
        setDirection(data.direction);
        loadLocales();
        loadBundle(data.currentLocale);
      }
    } catch (err) {
      console.error('Failed to switch locale:', err);
    } finally {
      setSwitching(false);
    }
  };

  // Run Pluralization Test
  const handleEvaluatePlural = async (keyToUse?: string, countToUse?: number, locToUse?: string) => {
    setEvaluatingPlural(true);
    const k = keyToUse || pluralKey;
    const c = countToUse !== undefined ? countToUse : testCount;
    const l = locToUse || testLocale;
    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, locale: l, count: c, params: { username: 'Commander', level: 'TOP_SECRET' } })
      });
      const data = await res.json();
      if (data.success) {
        setTranslationResult(data);
      }
    } catch (err) {
      console.error('Plural evaluation failed:', err);
    } finally {
      setEvaluatingPlural(false);
    }
  };

  useEffect(() => {
    handleEvaluatePlural();
  }, [pluralKey, testCount, testLocale]);

  // Run CLI Test
  const handleRunCliTest = async () => {
    setIsRunningCli(true);
    try {
      const res = await fetch('/api/i18n/run-cli-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setCliLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to run i18n CLI test:', err);
    } finally {
      setIsRunningCli(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeLocaleMeta = locales.find(l => l.code === currentLocale);

  return (
    <div id="universal-i18n-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Prompt 8 Universal i18n Engine
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Zero-Dependency Unicode &amp; CLDR 42.0
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-mono font-medium uppercase rounded-full border ${
                direction === 'rtl'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                Layout: {direction.toUpperCase()} ({direction === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'})
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
              <Globe2 className="w-7 h-7 text-indigo-400" />
              Universal i18n &amp; Dynamic Multi-Language Localization
            </h2>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              Zero-dependency internationalization engine for Android &amp; Kivy supporting real-time multi-language translation,
              Unicode/JSON bundle loading, complex CLDR pluralization rules across 100+ languages, BiDi RTL layout adaptation, and dynamic non-restarting locale switching.
            </p>
          </div>

          {/* Quick Active Locale Selector Pill */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-2.5 shadow-inner">
              <span className="text-xl">{activeLocaleMeta?.flagEmoji || '🌐'}</span>
              <div>
                <div className="text-xs font-bold text-zinc-200">
                  {activeLocaleMeta?.nameNative || 'English'}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {activeLocaleMeta?.code.toUpperCase()} • {direction.toUpperCase()}
                </div>
              </div>
            </div>

            <button
              onClick={loadLocales}
              disabled={loadingLocales}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              title="Refresh Locales"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLocales ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('live_preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'live_preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            Dynamic Live UI Preview
          </button>
          <button
            onClick={() => setActiveSubTab('plural_workbench')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'plural_workbench'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            CLDR Pluralization Workbench
          </button>
          <button
            onClick={() => setActiveSubTab('locales_matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'locales_matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            10-Language Matrix &amp; BiDi Rules
          </button>
          <button
            onClick={() => {
              setActiveSubTab('bundle_inspector');
              loadBundle(inspectLocale);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'bundle_inspector'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Unicode/JSON Bundle Inspector
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
            Python Module (universal_i18n.py)
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
            Universal i18n CLI Trace
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DYNAMIC LIVE UI PREVIEW */}
      {activeSubTab === 'live_preview' && (
        <div className="space-y-6">
          {/* Quick Switcher Bar */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                Live Dynamic Locale Switcher (Non-Restarting)
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Click any language pill to switch real-time without restarting
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => handleSwitchLocale(loc.code)}
                  disabled={switching}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                    loc.code === currentLocale
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span>{loc.flagEmoji}</span>
                  <span className="font-bold">{loc.nameNative}</span>
                  <span className={`text-[10px] uppercase font-mono px-1 rounded ${
                    loc.direction === 'rtl' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {loc.direction}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Localized Virtual App Canvas with RTL / LTR BiDi Rendering */}
          <div 
            dir={direction}
            className={`p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl space-y-6 transition-all ${
              direction === 'rtl' ? 'text-right' : 'text-left'
            }`}
          >
            {/* Header of Virtual App */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-zinc-100">
                    {currentBundle.app_title || 'AI Secure Space & Android Pipeline'}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400">
                  {(currentBundle.welcome_message || 'Welcome back, Operator {username}!').replace('{username}', 'Alpha_01')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {currentBundle.status_connected || 'Connected to Secure Mesh'}
                </span>
              </div>
            </div>

            {/* Simulated Live UI Cards with BiDi Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Clearance & Security */}
              <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">
                    {(currentBundle.security_clearance || 'Security Clearance: {level}').replace('{level}', 'LEVEL_5')}
                  </span>
                  <Lock className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  {typeof currentBundle.unread_notifications === 'object'
                    ? (currentBundle.unread_notifications.few || currentBundle.unread_notifications.other || '3 Unread Alerts').replace('{count}', '3')
                    : '3 Alerts'}
                </div>
                <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition">
                  {currentBundle.button_authenticate || 'Authenticate Biometrics'}
                </button>
              </div>

              {/* Card 2: Encrypted Partitions */}
              <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">
                    {typeof currentBundle.active_devices_count === 'object'
                      ? (currentBundle.active_devices_count.few || currentBundle.active_devices_count.other || '4 Active Devices').replace('{count}', '4')
                      : '4 Active Devices'}
                  </span>
                  <Radio className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  {typeof currentBundle.vault_files_count === 'object'
                    ? (currentBundle.vault_files_count.many || currentBundle.vault_files_count.other || '12 Vault Files').replace('{count}', '12')
                    : '12 Files'}
                </div>
                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition">
                  {currentBundle.button_mount_vault || 'Mount Encrypted Partition'}
                </button>
              </div>

              {/* Card 3: Emergency Duress Control */}
              <div className="p-4 bg-zinc-900 border border-rose-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400">
                    Fail-Safe Anti-Forensics
                  </span>
                  <Flame className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  ctypes.memset Zeroizer
                </div>
                <button className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold rounded-lg shadow transition">
                  {currentBundle.button_panic_shred || 'Emergency Self-Destruct'}
                </button>
              </div>
            </div>

            {/* BiDi Direction Inspector Footer */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-2">
              <div>
                Active Locale: <strong className="text-zinc-300">{currentLocale.toUpperCase()}</strong> • Direction: <strong className="text-indigo-400">{direction.toUpperCase()}</strong>
              </div>
              <div>
                Plural Engine: <strong className="text-emerald-400">{activeLocaleMeta?.pluralRuleFamily || 'cardinal_cldr'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CLDR PLURALIZATION WORKBENCH */}
      {activeSubTab === 'plural_workbench' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Plural Test Controls */}
          <div className="lg:col-span-5 p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-5 shadow-lg">
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Plural Rule Evaluator
            </h3>
            <p className="text-xs text-zinc-400">
              Test CLDR cardinal pluralization across complex language families (Arabic 6 forms, Slavic 3 forms, Hebrew, Germanic, and Asian zero-plural).
            </p>

            {/* Select Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">Translation Key</label>
              <select
                value={pluralKey}
                onChange={(e) => setPluralKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
              >
                <option value="active_devices_count">active_devices_count</option>
                <option value="unread_notifications">unread_notifications</option>
                <option value="vault_files_count">vault_files_count</option>
              </select>
            </div>

            {/* Select Target Locale for test */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">Target Locale</label>
              <select
                value={testLocale}
                onChange={(e) => setTestLocale(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flagEmoji} {l.nameNative} ({l.nameEnglish} - {l.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Count Input & Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300">Count Value (n = {testCount})</label>
                <span className="text-xs font-mono font-bold text-indigo-400">{testCount}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={testCount}
                onChange={(e) => setTestCount(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={testCount}
                  onChange={(e) => setTestCount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none"
                />
              </div>
            </div>

            {/* Preset Test Count Pills */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 block">Preset Test Quantities:</span>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 5, 11, 15, 21, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTestCount(num)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
                      testCount === num
                        ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    n={num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Evaluation Result & CLDR Matrix */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Resolved Translation Output
                </h4>
                {translationResult?.cldrCategory && (
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">
                    CLDR Category: {translationResult.cldrCategory.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Translation Display */}
              <div 
                dir={translationResult?.direction || 'ltr'}
                className="p-5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-base text-zinc-100 leading-relaxed shadow-inner"
              >
                {translationResult?.translatedText || 'Evaluating pluralization...'}
              </div>

              {/* Rule Breakdown Cards */}
              <div className="grid grid-cols-3 gap-3 text-xs font-mono pt-2">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Target Language</span>
                  <strong className="text-indigo-300">{testLocale.toUpperCase()}</strong>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Count Variable</span>
                  <strong className="text-amber-300">{testCount}</strong>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">Directionality</span>
                  <strong className="text-emerald-300">{(translationResult?.direction || 'ltr').toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Educational CLDR Plural Matrix Overview */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                CLDR Cardinal Category Reference
              </h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 flex items-start gap-2">
                  <span className="font-mono font-bold text-amber-400 min-w-[55px]">Arabic:</span>
                  <span>6 categories: <strong className="text-zinc-300">zero</strong> (0), <strong className="text-zinc-300">one</strong> (1), <strong className="text-zinc-300">two</strong> (2), <strong className="text-zinc-300">few</strong> (3-10), <strong className="text-zinc-300">many</strong> (11-99), <strong className="text-zinc-300">other</strong> (100+).</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 flex items-start gap-2">
                  <span className="font-mono font-bold text-indigo-400 min-w-[55px]">Slavic:</span>
                  <span>3 categories: <strong className="text-zinc-300">one</strong> (1, 21, 31..), <strong className="text-zinc-300">few</strong> (2-4, 22-24..), <strong className="text-zinc-300">many</strong> (0, 5-20, 25-30..).</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 flex items-start gap-2">
                  <span className="font-mono font-bold text-emerald-400 min-w-[55px]">Asian:</span>
                  <span>Single category: <strong className="text-zinc-300">other</strong> (no grammatical plural forms in Japanese, Chinese, Thai).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 10-LANGUAGE MATRIX & BIDI RULES */}
      {activeSubTab === 'locales_matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locales.map((loc) => (
            <div
              key={loc.code}
              className={`p-5 bg-zinc-900 border rounded-xl space-y-3 transition ${
                loc.code === currentLocale ? 'border-indigo-500 shadow-lg shadow-indigo-950/20' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{loc.flagEmoji}</span>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      {loc.nameNative}
                      <span className="text-xs text-zinc-400 font-normal">({loc.nameEnglish})</span>
                    </h4>
                    <span className="text-xs text-zinc-500 font-mono">Code: {loc.code.toUpperCase()}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-full border ${
                  loc.direction === 'rtl'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {loc.direction.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Plural Family</span>
                  <span className="text-indigo-300">{loc.pluralRuleFamily}</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Total Keys</span>
                  <span className="text-emerald-300">{loc.totalKeys} Entries</span>
                </div>
              </div>

              <button
                onClick={() => handleSwitchLocale(loc.code)}
                className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-800 transition flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Switch to {loc.nameNative}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: UNICODE/JSON BUNDLE INSPECTOR */}
      {activeSubTab === 'bundle_inspector' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-xs font-mono font-bold text-zinc-200">
                  Active Translation Bundle Dictionary (Unicode UTF-8)
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Dynamic in-memory bundle with plural sub-objects
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400">Inspect Locale:</label>
              <select
                value={inspectLocale}
                onChange={(e) => {
                  setInspectLocale(e.target.value);
                  loadBundle(e.target.value);
                }}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flagEmoji} {l.nameNative} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 max-h-[500px] overflow-y-auto">
            <pre>{JSON.stringify(currentBundle, null, 2)}</pre>
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
                <span className="text-xs font-mono font-bold text-zinc-200">/android/python/universal_i18n.py</span>
                <span className="text-[11px] text-zinc-500 ml-2">Zero-Dependency i18n &amp; Pluralization Module</span>
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
              {pythonCode || 'Loading Universal i18n Python source...'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CLI TEST TRACE */}
      {activeSubTab === 'cli_trace' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-200">Python CLI Output: python universal_i18n.py</h3>
            </div>
            <button
              onClick={handleRunCliTest}
              disabled={isRunningCli}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningCli ? 'animate-spin' : ''}`} />
              Run Universal i18n CLI Test
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
              <div className="text-zinc-500">Click &quot;Run Universal i18n CLI Test&quot; to execute real-time multi-language translations and pluralization checks across all 10 locales.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
