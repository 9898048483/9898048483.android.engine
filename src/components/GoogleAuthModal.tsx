import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, Lock, Fingerprint } from 'lucide-react';
import { registerWebAuthn, authenticateWebAuthn } from '../lib/webAuthnClient';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../db/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (userEmail !== 'unauthorized@devsecops.local') {
      setEmailInput(userEmail);
    }
  }, [userEmail]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email) {
        setEmailInput(result.user.email);
        // Save user profile to Firestore using UID
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          role: role,
          updatedAt: Date.now()
        }, { merge: true });
        
        onSaveEmail(result.user.email);
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        role: role,
        updatedAt: Date.now()
      }, { merge: true });
    }
    if (emailInput && emailInput !== 'unauthorized@devsecops.local') {
      onSaveEmail(emailInput);
      onClose();
    }
  };

  // We use the Firebase UID if available, otherwise fallback to email for WebAuthn demo purposes
  const getUserId = () => {
    return auth.currentUser ? auth.currentUser.uid : emailInput;
  };

  const handleRegisterBiometrics = async () => {
    const uid = getUserId();
    if (!uid || uid === 'unauthorized@devsecops.local') return;
    setBiometricStatus('loading');
    try {
      const verified = await registerWebAuthn(uid);
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
    const uid = getUserId();
    if (!uid || uid === 'unauthorized@devsecops.local') return;
    setBiometricStatus('loading');
    try {
      const verified = await authenticateWebAuthn(uid);
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

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-semibold text-slate-300">
                1. Authorized Google Account
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-500">Quick Switch:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput('india9898048483@gmail.com');
                    onSaveEmail('india9898048483@gmail.com');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-mono bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60"
                  title="Master Admin Account (51% Stake)"
                >
                  Admin (51%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const testEmail = `android_user_${Math.floor(Math.random()*900 + 100)}@gmail.com`;
                    setEmailInput(testEmail);
                    onSaveEmail(testEmail);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60"
                  title="New User Node (1,000 Tokens)"
                >
                  New Node (1k)
                </button>
              </div>
            </div>
            {!auth.currentUser ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center bg-white text-slate-900 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
                >
                  <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-bold text-white mr-2">
                    G
                  </div>
                  {isAuthenticating ? 'Signing in...' : 'Sign In with Google'}
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter Google Account Email"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (emailInput) {
                        onSaveEmail(emailInput);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition"
                  >
                    Set
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200">
                  <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-slate-900 mr-2">
                    G
                  </div>
                  <span className="flex-1 truncate font-mono">{auth.currentUser.email}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Override Active Email..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (emailInput) {
                        onSaveEmail(emailInput);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition border border-slate-700"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
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

          {auth.currentUser && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-1">
              <div className="font-semibold flex items-center space-x-1">
                <Check className="h-3.5 w-3.5" />
                <span>Identity Verified via Google Workspace</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Token signed with Google Identity Services. Scopes include CI/CD trigger dispatch, /dist APK binary download, and Tor v3 hidden service configuration.
              </p>
            </div>
          )}

          {/* WebAuthn Integration */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <label className="block font-semibold text-slate-300">
              2. WebAuthn Biometric Setup
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleRegisterBiometrics}
                disabled={!auth.currentUser}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${auth.currentUser ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`}
              >
                <Fingerprint className="w-3.5 h-3.5" /> Register
              </button>
              <button
                type="button"
                onClick={handleLoginBiometrics}
                disabled={!auth.currentUser}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${auth.currentUser ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`}
              >
                <Lock className="w-3.5 h-3.5" /> Login
              </button>
            </div>
            {biometricStatus === 'loading' && <p className="text-amber-400 text-[10px]">Prompting security key...</p>}
            {biometricStatus === 'success' && <p className="text-emerald-400 text-[10px]">Biometric verification succeeded.</p>}
            {biometricStatus === 'error' && <p className="text-red-400 text-[10px]">Biometric verification failed.</p>}
            {!auth.currentUser && <p className="text-slate-500 text-[10px]">Sign in with Google first to register biometrics.</p>}
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
              onClick={handleSubmit}
              disabled={!auth.currentUser}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors shadow-md ${auth.currentUser ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-900/50 text-emerald-700 cursor-not-allowed'}`}
            >
              Save &amp; Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

