import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PipelineDashboard } from './components/PipelineDashboard';
import { AndroidArtifactCard } from './components/AndroidArtifactCard';
import { ZeroTouchConsole } from './components/ZeroTouchConsole';
import { TorOnionManager } from './components/TorOnionManager';
import { MonitoringAndAlerts } from './components/MonitoringAndAlerts';
import { SecretsAndWorkflows } from './components/SecretsAndWorkflows';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { NativeBridgeExplorer } from './components/NativeBridgeExplorer';
import { AICryptoEngineExplorer } from './components/AICryptoEngineExplorer';
import { IsolatedVaultManager } from './components/IsolatedVaultManager';
import { DuressShredderExplorer } from './components/DuressShredderExplorer';
import { UniversalI18nEngine } from './components/UniversalI18nEngine';
import { SecurityTelemetryDashboard } from './components/SecurityTelemetryDashboard';
import { NativeIPCFirewallExplorer } from './components/NativeIPCFirewallExplorer';
import { ZeroTouchBatteryManager } from './components/ZeroTouchBatteryManager';
import { KivyGuiRenderingLayer } from './components/KivyGuiRenderingLayer';
import { LocalAiNlpEngine } from './components/LocalAiNlpEngine';
import { FastApiMicroBackend } from './components/FastApiMicroBackend';
import { InstitutionalValuationPortal } from './components/InstitutionalValuationPortal';
import { PipelineRun, ApkInfo, DevOpsAlert, AuditEvent, RepoSecret, UserSpaceRecord } from './types';


export default function App() {
  const [activeTab, setActiveTab] = useState<string>('pipeline');
  const [userEmail, setUserEmail] = useState<string>('india9898048483@gmail.com');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Core Pipeline state
  const [pipeline, setPipeline] = useState<PipelineRun>({
    id: 'pipe-initial',
    status: 'idle',
    stage: 'idle',
    startedAt: null,
    completedAt: null,
    durationMs: 0,
    targetEnv: 'staging',
    apkInfo: null,
    steps: [
      { id: 'perms', name: 'Non-Sudo Directory Validation (/dist)', status: 'pending', logs: [] },
      { id: 'deps', name: 'Autoinstall Essential Dependencies', status: 'pending', logs: [] },
      { id: 'sec_scan', name: 'Security Vulnerability Scan & Patch Check', status: 'pending', logs: [] },
      { id: 'tests', name: 'Automated Test Coverage Gate (>85%)', status: 'pending', logs: [] },
      { id: 'apk_build', name: 'Android Build Engine (Outputs /dist/debug.apk)', status: 'pending', logs: [] },
      { id: 'integrity', name: 'SHA256 Integrity & Anti-Tamper Check', status: 'pending', logs: [] },
      { id: 'deploy_tracks', name: 'Deploy to Testing Tracks & Staging Server', status: 'pending', logs: [] },
      { id: 'audit_alert', name: 'Centralized Audit & DevOps Alert Notifications', status: 'pending', logs: [] },
    ],
    auditEvents: [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'DevSecOps & Android Build System ready. Output configured to /dist without sudo.',
        actor: 'system'
      }
    ]
  });

  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [alerts, setAlerts] = useState<DevOpsAlert[]>([
    { id: 'alt-1', time: '5 mins ago', type: 'SUCCESS', title: 'Pipeline Verified', text: 'Output directory /dist write verified without sudo.' },
    { id: 'alt-2', time: '15 mins ago', type: 'INFO', title: 'Security Scan', text: 'All security patches up-to-date. Zero high vulnerabilities.' }
  ]);
  const [userSpaces, setUserSpaces] = useState<UserSpaceRecord[]>([
    { username: 'operator_alpha', onion: 'aisecure9x4a18012bb14fa1dpm7.onion', createdAt: '2026-08-24T06:00:00Z', itemsCount: 3 }
  ]);
  const [secrets, setSecrets] = useState<RepoSecret[]>([
    { name: 'GOOGLE_CLIENT_ID', lastUpdated: '2026-08-20', status: 'Active' },
    { name: 'GOOGLE_SERVICE_ACCOUNT', lastUpdated: '2026-08-21', status: 'Active' },
    { name: 'SLACK_DEVOPS_WEBHOOK', lastUpdated: '2026-08-22', status: 'Active' },
    { name: 'ONION_MASTER_KEY', lastUpdated: '2026-08-23', status: 'Active' },
    { name: 'ANDROID_KEYSTORE_PASS', lastUpdated: '2026-08-23', status: 'Active' }
  ]);

  // Initial fetch on mount to load server state & existing debug.apk
  useEffect(() => {
    fetch('/api/pipeline/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setPipeline(data);
          if (data.apkInfo) setApkInfo(data.apkInfo);
        }
      })
      .catch((e) => console.log('Pipeline poll init:', e));

    fetch('/api/monitoring/telemetry')
      .then((res) => res.json())
      .then((data) => {
        if (data.alerts) setAlerts(data.alerts);
        if (data.secrets) setSecrets(data.secrets);
        if (data.userSpaces) setUserSpaces(data.userSpaces);
      })
      .catch((e) => console.log('Telemetry init:', e));
  }, []);

  // Poll pipeline if running
  useEffect(() => {
    let interval: any;
    if (pipeline.status === 'running') {
      interval = setInterval(() => {
        fetch('/api/pipeline/status')
          .then((res) => res.json())
          .then((data) => {
            setPipeline(data);
            if (data.apkInfo) setApkInfo(data.apkInfo);
          })
          .catch((e) => console.log('Pipeline polling err:', e));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [pipeline.status]);

  // Trigger CI/CD Pipeline Push (Simulated push or intentional integrity rollback)
  const handleRunPipeline = async (simulateFailure: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateFailure, targetEnv: 'staging' })
      });
      const data = await res.json();
      if (data.pipeline) {
        setPipeline(data.pipeline);
      }
    } catch (err) {
      console.error('Failed to start pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Direct fast build of /dist/debug.apk
  const handleFastBuildApk = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/build/apk', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApkInfo(data);
        setAlerts((prev) => [
          {
            id: 'alt-' + Date.now(),
            time: 'Just now',
            type: 'SUCCESS',
            title: 'debug.apk Compiled to /dist',
            text: `Output file /dist/debug.apk generated (${(data.size / 1024).toFixed(1)} KB) without sudo.`
          },
          ...prev
        ]);
        setActiveTab('artifacts');
      }
    } catch (err) {
      console.error('APK build error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create user space with .onion
  const handleCreateUserSpace = async (username: string, password: string, onionAddress?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/userspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, onionAddress })
      });
      const data = await res.json();
      if (data.success) {
        setUserSpaces((prev) => [data.space, ...prev]);
        setAlerts((prev) => [
          {
            id: 'alt-' + Date.now(),
            time: 'Just now',
            type: 'INFO',
            title: 'New .onion Space Created',
            text: `Partition initialized for '${username}' with zero-touch address ${data.space.onion}`
          },
          ...prev
        ]);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Wipe user space on duress PIN
  const handleWipeSpace = async (username: string, pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/userspace/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });
      const data = await res.json();
      if (data.success) {
        setUserSpaces((prev) => prev.filter((s) => s.username !== username));
        setAlerts((prev) => [
          {
            id: 'alt-' + Date.now(),
            time: 'Just now',
            type: 'CRITICAL',
            title: 'DURESS WIPE TRIGGERED',
            text: `Cryptographic shredding executed for user '${username}'. Partition erased.`
          },
          ...prev
        ]);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Add secret
  const handleAddSecret = async (name: string, value: string) => {
    try {
      const res = await fetch('/api/secrets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value })
      });
      const data = await res.json();
      if (data.success) {
        setSecrets(data.secrets);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger simulated webhook ping
  const handleTriggerSimulatedAlert = () => {
    setAlerts((prev) => [
      {
        id: 'alt-' + Date.now(),
        time: 'Just now',
        type: 'INFO',
        title: 'DevOps Health Ping',
        text: 'Automated heartbeat dispatched to DevOps channel. All physical testing tracks online.'
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        pipelineRunning={pipeline.status === 'running'}
        alertCount={alerts.filter((a) => a.type === 'CRITICAL').length}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'pipeline' && (
          <PipelineDashboard
            pipeline={pipeline}
            onRunPipeline={handleRunPipeline}
            onFastBuildApk={handleFastBuildApk}
            loading={loading}
            onNavigateToArtifacts={() => setActiveTab('artifacts')}
          />
        )}

        {activeTab === 'valuation_2030' && (
          <InstitutionalValuationPortal />
        )}

        {activeTab === 'fastapi_backend' && (
          <FastApiMicroBackend />
        )}

        {activeTab === 'local_nlp' && (
          <LocalAiNlpEngine />
        )}

        {activeTab === 'kivy_gui' && (
          <KivyGuiRenderingLayer />
        )}

        {activeTab === 'battery_daemon' && (
          <ZeroTouchBatteryManager />
        )}

        {activeTab === 'ipc_firewall' && (
          <NativeIPCFirewallExplorer />
        )}

        {activeTab === 'telemetry_audit' && (
          <SecurityTelemetryDashboard />
        )}


        {activeTab === 'i18n' && (
          <UniversalI18nEngine />
        )}

        {activeTab === 'duress' && (
          <DuressShredderExplorer />
        )}

        {activeTab === 'vault' && (
          <IsolatedVaultManager />
        )}

        {activeTab === 'zerotouch' && (
          <ZeroTouchConsole onWipeSpace={handleWipeSpace} />
        )}

        {activeTab === 'tor' && (
          <TorOnionManager
            userSpaces={userSpaces}
            onCreateUserSpace={handleCreateUserSpace}
          />
        )}

        {activeTab === 'ai_keystream' && (
          <AICryptoEngineExplorer />
        )}

        {activeTab === 'native_bridge' && (
          <NativeBridgeExplorer />
        )}

        {activeTab === 'artifacts' && (
          <AndroidArtifactCard
            apkInfo={apkInfo || pipeline.apkInfo}
            onRebuildApk={handleFastBuildApk}
            loading={loading}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringAndAlerts
            alerts={alerts}
            auditEvents={pipeline.auditEvents}
            onTriggerSimulatedAlert={handleTriggerSimulatedAlert}
          />
        )}

        {activeTab === 'secrets' && (
          <SecretsAndWorkflows
            secrets={secrets}
            onAddSecret={handleAddSecret}
          />
        )}
      </main>

      {/* Google Auth & Identity Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userEmail={userEmail}
        onSaveEmail={(email) => setUserEmail(email)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Output: <code className="text-emerald-400 font-mono">/dist/debug.apk</code> • Zero-Sudo Local Access • FIPS 203 Hybrid
          </div>
          <div>
            Signed-in Operator: <span className="text-slate-400">{userEmail}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
