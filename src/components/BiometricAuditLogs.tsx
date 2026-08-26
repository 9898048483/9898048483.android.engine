import React from 'react';
import { ShieldCheck, ShieldAlert, Fingerprint, Lock } from 'lucide-react';

interface BiometricLogEntry {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE';
  teeAttestation: 'PASS' | 'FAIL' | 'UNKNOWN';
  method: string;
}

interface BiometricAuditLogsProps {
  logs: BiometricLogEntry[];
}

export const BiometricAuditLogs: React.FC<BiometricAuditLogsProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Fingerprint className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-100">Biometric Authentication Audit</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">TEE Attestation</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="px-4 py-4 font-mono text-slate-400">{log.timestamp}</td>
                <td className="px-4 py-4">{log.method}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.status === 'SUCCESS' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {log.status === 'SUCCESS' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.teeAttestation === 'PASS' ? 'bg-blue-900/30 text-blue-400' : 'bg-amber-900/30 text-amber-400'
                  }`}>
                    <Lock size={14} />
                    {log.teeAttestation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
