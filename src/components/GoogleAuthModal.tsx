import React, { useState } from 'react';
import { X, ShieldCheck, Check, Key, UserCheck, Lock, Fingerprint } from 'lucide-react';
import { registerWebAuthn, authenticateWebAuthn } from '../lib/webAuthnClient';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSaveEmail: (email: string) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSaveEmail,
}) => {
  const [emailInput, setEmailInput] = useState<string>(userEmail);
  const [role, setRole] = useState<string>('DevSecOps Lead & Build Admin');
  const [biometricStatus, setBiometricStatus] = useState<'none' | 'loading' | 'success' | 'error'>('none');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      onSaveEmail(emailInput);
      onClose();
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!emailInput) return;
    setBiometricStatus('loading');
    try {
      const verified = await registerWebAuthn(emailInput);
      if (verified) {
        setBiometricStatus('success');
      } else {
        setBiometricStatus('error');
      }
    } catch (err) {
      console.error(err);
      setBiometricStatus('error');
    }
  };

  const handleLoginBiometrics = async () => {
    if (!emailInput) return;
    setBiometricStatus('loading');
    try {
      const verified = await authenticateWebAuthn(emailInput);
      if (verified) {
        setBiometricStatus('success');
        onSaveEmail(emailInput);
        onClose();
      } else {
        setBiometricStatus('error');
      }
    } catch (err) {
      console.error(err);
      setBiometricStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          id="close-auth-modal-btn"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Google OAuth Authentication</h3>
            <p className="text-xs text-slate-400">Deployment Dashboard &amp; Physical Device Access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Authorized Google Account
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200">
              <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-slate-900 mr-2">
                G
              </div>
              <input
                id="google-email-input"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="bg-transparent flex-1 outline-none text-xs text-slate-200 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              RBAC Role Permissions
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="DevSecOps Lead & Build Admin">DevSecOps Lead & Build Admin (Full 0-Sudo /dist write access)</option>
              <option value="Release Engineer">Release Engineer (Physical Device Deploy only)</option>
              <option value="Security Auditor">Security Auditor (Read-only Audit Log access)</option>
            </select>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center space-x-1">
              <Check className="h-3.5 w-3.5" />
              <span>Identity Verified via Google Workspace</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Token signed with Google Identity Services. Scopes include CI/CD trigger dispatch, /dist APK binary download, and Tor v3 hidden service configuration.
            </p>
          </div>

          {/* WebAuthn Integration */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <label className="block font-semibold text-slate-300">
              2. WebAuthn Biometric Setup
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleRegisterBiometrics}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Fingerprint className="w-3.5 h-3.5" /> Register
              </button>
              <button
                type="button"
                onClick={handleLoginBiometrics}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Login
              </button>
            </div>
            {biometricStatus === 'loading' && <p className="text-amber-400 text-[10px]">Prompting security key...</p>}
            {biometricStatus === 'success' && <p className="text-emerald-400 text-[10px]">Biometric verification succeeded.</p>}
            {biometricStatus === 'error' && <p className="text-red-400 text-[10px]">Biometric verification failed.</p>}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-auth-btn"
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-colors shadow-md"
            >
              Save &amp; Authorize
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

