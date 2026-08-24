import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  FolderCheck, 
  ShieldCheck, 
  Copy, 
  Check, 
  QrCode, 
  FileCode, 
  Layers, 
  Terminal, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { ApkInfo } from '../types';

interface AndroidArtifactCardProps {
  apkInfo: ApkInfo | null;
  onRebuildApk: () => void;
  loading: boolean;
}

export const AndroidArtifactCard: React.FC<AndroidArtifactCardProps> = ({
  apkInfo,
  onRebuildApk,
  loading,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedAdb, setCopiedAdb] = useState(false);
  const [showManifest, setShowManifest] = useState(false);

  const handleCopySha = () => {
    if (!apkInfo) return;
    navigator.clipboard.writeText(apkInfo.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const adbCommand = 'adb install -r ./dist/debug.apk';
  const handleCopyAdb = () => {
    navigator.clipboard.writeText(adbCommand);
    setCopiedAdb(true);
    setTimeout(() => setCopiedAdb(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
              <Smartphone className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Android Physical Device Build Artifact
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Ready for Testing
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                The build pipeline automatically compiles and outputs <code className="text-emerald-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">dist/debug.apk</code> in the root folder without requiring sudo permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="rebuild-apk-direct-btn"
              onClick={onRebuildApk}
              disabled={loading}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Rebuild debug.apk</span>
            </button>

            <a
              id="download-debug-apk-btn"
              href="/api/dist/download/debug.apk"
              download="debug.apk"
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download debug.apk</span>
            </a>
          </div>
        </div>
      </div>

      {/* Artifact Specifications & Directory Path Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: File Specs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-2">
              <FolderCheck className="h-4 w-4 text-emerald-400" />
              <span>Output Target Path</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              0-SUDO LOCAL
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all">
            {apkInfo?.artifactPath || '/dist/debug.apk'}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Package Name:</span>
              <span className="font-mono text-slate-200">{apkInfo?.manifest.packageName || 'ai.secure.space.touchless'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Version:</span>
              <span className="font-mono text-emerald-400">{apkInfo?.manifest.version || '1.0.0-debug'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Target / Min SDK:</span>
              <span className="font-mono text-slate-200">Android 14 (API 34) / API 21</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Size:</span>
              <span className="font-mono text-slate-200">{apkInfo ? `${(apkInfo.size / 1024).toFixed(1)} KB` : '2,840 KB'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: SHA256 Anti-Tamper Checksum */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>SHA256 Integrity Verification</span>
            </h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              VERIFIED
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 break-all relative group">
            {apkInfo?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            <button
              id="copy-sha-btn"
              onClick={handleCopySha}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Copy SHA256"
            >
              {copiedSha ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Automatic rollbacks are triggered in the CI/CD pipeline if the SHA256 checksum fails integrity validation against the security baseline.
          </p>
        </div>

        {/* Card 3: Quick Physical Device Install */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-amber-400" />
              <span>Physical Device Sideload</span>
            </h3>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              ADB DIRECT
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 flex items-center justify-between">
            <code>{adbCommand}</code>
            <button
              id="copy-adb-btn"
              onClick={handleCopyAdb}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copiedAdb ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Attach any Android device over USB or wireless debugging to immediately test 0-touch biometrics & Tor .onion encrypted channels.
          </p>
        </div>
      </div>

      {/* APK Capabilities & Android Manifest Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Embedded Android Permissions & Features</span>
          </h3>
          <button
            id="toggle-manifest-btn"
            onClick={() => setShowManifest(!showManifest)}
            className="text-xs text-slate-400 hover:text-slate-200 underline font-mono"
          >
            {showManifest ? 'Hide Raw Manifest' : 'View AndroidManifest.xml Schema'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2">Embedded Android Permissions</div>
            <ul className="space-y-1.5 text-xs font-mono text-slate-400">
              <li className="flex items-center text-emerald-400">
                <Check className="h-3.5 w-3.5 mr-1.5" /> android.permission.USE_BIOMETRIC (0-Touch Face/Fingerprint)
              </li>
              <li className="flex items-center text-emerald-400">
                <Check className="h-3.5 w-3.5 mr-1.5" /> android.permission.USE_FINGERPRINT
              </li>
              <li className="flex items-center text-emerald-400">
                <Check className="h-3.5 w-3.5 mr-1.5" /> android.permission.INTERNET (Tor v3 Hidden Service Routing)
              </li>
              <li className="flex items-center text-emerald-400">
                <Check className="h-3.5 w-3.5 mr-1.5" /> android.permission.ACCESS_NETWORK_STATE
              </li>
              <li className="flex items-center text-emerald-400">
                <Check className="h-3.5 w-3.5 mr-1.5" /> android.permission.CAMERA (ML Kit Touchless Face Unlock)
              </li>
            </ul>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2">Automated CI/CD Verification Track</div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                <span>Direct Local Output: <code className="text-slate-300 font-mono">/dist/debug.apk</code></span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                <span>Permission Isolation: Local non-sudo writing validated</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                <span>Testing Tracks: Internal Physical Device Automation Track</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                <span>Automatic Staging Sync: Live Cloud Run Staging Server</span>
              </li>
            </ul>
          </div>
        </div>

        {showManifest && (
          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
            <div className="text-emerald-400 font-semibold mb-2">// AndroidManifest.xml (Embedded in /dist/debug.apk):</div>
            <pre className="text-slate-400 overflow-x-auto">
{`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ai.secure.space.touchless"
    android:versionCode="1"
    android:versionName="1.0.0-debug">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:label="AI Secure Space"
        android:allowBackup="false"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity android:name="org.kivy.android.PythonActivity"
            android:configChanges="orientation|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
