import React from 'react';
import { 
  Activity, 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCcw, 
  Server, 
  Cpu, 
  HardDrive, 
  Radio,
  Clock,
  Terminal,
  Send,
  Webhook
} from 'lucide-react';
import { DevOpsAlert, AuditEvent } from '../types';

interface MonitoringAndAlertsProps {
  alerts: DevOpsAlert[];
  auditEvents: AuditEvent[];
  onTriggerSimulatedAlert: () => void;
}

export const MonitoringAndAlerts: React.FC<MonitoringAndAlertsProps> = ({
  alerts,
  auditEvents,
  onTriggerSimulatedAlert,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Centralized Telemetry, Audit Logs & DevOps Alerts
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Real-Time Monitored
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Captures all CI/CD lifecycle stages, directory access validations, build artifact creations, and automatic rollback triggers. Automatically publishes real-time webhook notifications to the on-call DevOps response cluster.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="test-webhook-alert-btn"
              onClick={onTriggerSimulatedAlert}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors"
            >
              <Webhook className="h-4 w-4 text-amber-400" />
              <span>Simulate DevOps Alert Ping</span>
            </button>
          </div>
        </div>

        {/* Real-time Cluster Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Cluster Uptime</span>
              <Server className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">99.98%</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Zero Degradation</div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>CPU Core Allocation</span>
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">18.4%</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">4 Cores Active</div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Physical Device Tracks</span>
              <Radio className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">2 Active</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Auto-Distribution ON</div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Auto-Rollback Guard</span>
              <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">Enabled</div>
            <div className="text-[10px] text-cyan-400 font-mono mt-0.5">SHA256 Guard Active</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: DevOps Alert Feeds & Immutable Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: DevOps Notification Feeds */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center space-x-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <span>DevOps Notification Stream</span>
            </h3>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              SLACK / WEBHOOK
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.type === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : alert.type === 'SUCCESS'
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {alert.type === 'CRITICAL' ? (
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-bold">{alert.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: Centralized Audit Ledger */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Centralized Audit Ledger</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              IMMUTABLE AUDIT TRAIL
            </span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs max-h-[460px] overflow-y-auto space-y-3">
            {auditEvents.map((evt, idx) => (
              <div key={idx} className="pb-3 border-b border-slate-900 last:border-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${
                    evt.level === 'CRITICAL' ? 'text-rose-400' :
                    evt.level === 'WARN' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    [{evt.level}]
                  </span>
                  <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-300 text-xs">{evt.message}</div>
                <div className="text-[10px] text-slate-500">Actor: {evt.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
