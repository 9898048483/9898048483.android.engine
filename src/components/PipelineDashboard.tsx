import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldAlert, 
  Terminal, 
  Download, 
  Smartphone, 
  FolderCheck, 
  PackageCheck, 
  Lock, 
  UploadCloud, 
  Radio,
  FileCode,
  AlertTriangle
} from 'lucide-react';
import { PipelineRun, PipelineStep } from '../types';

interface PipelineDashboardProps {
  pipeline: PipelineRun;
  onRunPipeline: (simulateFailure?: boolean) => void;
  onFastBuildApk: () => void;
  loading: boolean;
  onNavigateToArtifacts: () => void;
}

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({
  pipeline,
  onRunPipeline,
  onFastBuildApk,
  loading,
  onNavigateToArtifacts,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string>('apk_build');

  const getStepIcon = (step: PipelineStep) => {
    if (step.status === 'running') return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
    if (step.status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (step.status === 'failed') return <XCircle className="h-4 w-4 text-rose-400" />;
    return <div className="h-2.5 w-2.5 rounded-full bg-slate-600"></div>;
  };

  const selectedStep = pipeline.steps.find((s) => s.id === selectedStepId) || pipeline.steps[0];

  const getStatusBadge = () => {
    switch (pipeline.status) {
      case 'running':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> In Progress ({pipeline.stage})
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Pipeline Succeeded (Passed 8/8)
          </span>
        );
      case 'failed':
      case 'rolled_back':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3 mr-1.5" /> Rollback Executed & Alerts Paged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Ready to Trigger
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Automated CI/CD Pipeline & Build Engine
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Configured for automated pushes, 0-sudo permission validation on <code className="text-emerald-300 font-mono">/dist</code>, vulnerability screening, test coverage validation, Android <code className="text-emerald-300 font-mono">debug.apk</code> artifact compilation, SHA256 integrity checks, automatic rollback, and centralized DevOps notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="trigger-pipeline-btn"
              onClick={() => onRunPipeline(false)}
              disabled={loading || pipeline.status === 'running'}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Trigger Pipeline Push</span>
            </button>

            <button
              id="fast-build-apk-btn"
              onClick={onFastBuildApk}
              disabled={loading || pipeline.status === 'running'}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Generate /dist/debug.apk</span>
            </button>

            <button
              id="test-rollback-btn"
              onClick={() => onRunPipeline(true)}
              disabled={loading || pipeline.status === 'running'}
              className="flex items-center space-x-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              title="Tests automatic rollback upon checksum integrity check failure"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Test Auto-Rollback</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Target Output</div>
            <div className="text-sm font-mono font-semibold text-emerald-400 mt-1 truncate">
              /dist/debug.apk
            </div>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Sudo Required</div>
            <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> No (0-Sudo Local)
            </div>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Test Coverage Gate</div>
            <div className="text-sm font-semibold text-slate-200 mt-1 text-teal-400">
              96.8% (Min &gt; 85%)
            </div>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Rollback Engine</div>
            <div className="text-sm font-semibold text-slate-200 mt-1 text-cyan-400">
              Active (SHA256 Guard)
            </div>
          </div>
        </div>
      </div>

      {/* Main Pipeline Step Runner & Log Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step List (Left Column) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <PackageCheck className="h-4 w-4 text-emerald-400" />
                <span>Pipeline Stage Sequences</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {pipeline.steps.filter((s) => s.status === 'success').length} / {pipeline.steps.length} Complete
              </span>
            </div>

            <div className="space-y-2">
              {pipeline.steps.map((step, idx) => {
                const isSelected = selectedStepId === step.id;
                return (
                  <button
                    key={step.id}
                    id={`step-item-${step.id}`}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/50 shadow-md'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-300">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 truncate">
                          {step.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {step.status === 'running' && 'Processing...'}
                          {step.status === 'success' && 'Passed without error'}
                          {step.status === 'failed' && 'Execution halted - Rollback paged'}
                          {step.status === 'pending' && 'Queued'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {getStepIcon(step)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Artifact Jump Card */}
          {pipeline.apkInfo && (
            <div className="mt-4 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-emerald-300">debug.apk generated in /dist</div>
                  <div className="text-[11px] text-slate-400 font-mono">Size: {(pipeline.apkInfo.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button
                id="view-apk-details-btn"
                onClick={onNavigateToArtifacts}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-colors"
              >
                Inspect APK
              </button>
            </div>
          )}
        </div>

        {/* Step Details & Live Terminal Output (Right Column) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Terminal Title Bar */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-xs font-mono text-slate-300 ml-2 font-medium flex items-center space-x-1.5">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span>{selectedStep.name}</span>
              </span>
            </div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
              selectedStep.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              selectedStep.status === 'failed' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
              selectedStep.status === 'running' ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse' :
              'bg-slate-800 text-slate-400'
            }`}>
              {selectedStep.status}
            </span>
          </div>

          {/* Terminal Console Output Body */}
          <div className="p-4 font-mono text-xs text-slate-300 overflow-y-auto flex-1 space-y-2 leading-relaxed bg-slate-950/90">
            <div className="text-slate-500">
              # CI/CD Execution Log for Stage: {selectedStep.id}
            </div>
            <div className="text-slate-500">
              # Directory scope: Root ./dist (No sudo permissions required)
            </div>

            {selectedStep.logs.length === 0 ? (
              <div className="text-slate-600 italic mt-4">
                [Awaiting execution trigger or pending earlier stages...]
              </div>
            ) : (
              selectedStep.logs.map((log, index) => (
                <div 
                  key={index}
                  className={`flex items-start space-x-2 ${
                    log.includes('FAILURE') || log.includes('ERROR') ? 'text-rose-400 bg-rose-950/20 p-1 rounded' :
                    log.includes('✓') ? 'text-emerald-300' :
                    log.includes('Checking') || log.includes('Compiling') ? 'text-amber-300' :
                    'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))
            )}

            {/* If in apk_build step and successful, show payload manifest preview */}
            {selectedStep.id === 'apk_build' && pipeline.apkInfo && (
              <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                <div className="text-emerald-400 font-bold mb-1">// Generated APK Package Manifest:</div>
                <pre className="text-slate-400 overflow-x-auto">
                  {JSON.stringify(pipeline.apkInfo.manifest, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Terminal Footer */}
          <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Actor: Google Auth (Admin)</span>
            <span>Trigger: Automated Push / Webhook</span>
          </div>
        </div>
      </div>
    </div>
  );
};
