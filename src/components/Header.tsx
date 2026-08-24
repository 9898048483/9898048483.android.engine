import React from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Smartphone, 
  Layers, 
  Globe, 
  Bell, 
  Activity, 
  Key, 
  FileCode2,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail: string;
  onOpenAuth: () => void;
  pipelineRunning: boolean;
  alertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userEmail,
  onOpenAuth,
  pipelineRunning,
  alertCount,
}) => {
  const tabs = [
    { id: 'pipeline', label: 'CI/CD Pipeline', icon: Terminal, badge: pipelineRunning ? 'Building' : null },
    { id: 'native_bridge', label: 'Prompt 1: C++/NDK Bridge', icon: FileCode2, highlight: true },
    { id: 'artifacts', label: 'Android /dist APK', icon: Smartphone },
    { id: 'zerotouch', label: '0-Touch AI Crypto', icon: Lock },
    { id: 'tor', label: 'Tor .onion Space', icon: Globe },
    { id: 'monitoring', label: 'Telemetry & Alerts', icon: Activity, badge: alertCount > 0 ? `${alertCount}` : null },
    { id: 'secrets', label: 'Repo Secrets & Code', icon: Key },
  ];

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and System Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  DevSecOps & AI Secure Space
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0.0-debug
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Auto-Outputs <code className="text-emerald-300 font-mono">/dist/debug.apk</code> • Zero-Sudo CI/CD • 0-Touch Biometrics
              </p>
            </div>
          </div>

          {/* User Profile & Auth controls */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Output Directory: <strong className="text-emerald-300 font-mono">./dist</strong> (Writable)</span>
            </div>

            <button
              id="google-auth-btn"
              onClick={onOpenAuth}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium transition-colors"
            >
              <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-900">
                G
              </div>
              <span className="hidden sm:inline max-w-[140px] truncate">{userEmail}</span>
              <span className="text-emerald-400 text-[10px] font-semibold uppercase px-1 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/60">
                Admin
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    tab.badge === 'Building'
                      ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
