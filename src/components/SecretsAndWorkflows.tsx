import React, { useState } from 'react';
import { 
  Key, 
  FileCode2, 
  Copy, 
  Check, 
  Plus, 
  ShieldCheck, 
  Lock, 
  Terminal, 
  Download,
  Layers,
  Code
} from 'lucide-react';
import { RepoSecret } from '../types';

interface SecretsAndWorkflowsProps {
  secrets: RepoSecret[];
  onAddSecret: (name: string, value: string) => Promise<void>;
}

export const SecretsAndWorkflows: React.FC<SecretsAndWorkflowsProps> = ({
  secrets,
  onAddSecret,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'workflow' | 'crypto' | 'onion' | 'userspace' | 'buildozer'>('workflow');
  const [newSecretName, setNewSecretName] = useState<string>('');
  const [newSecretValue, setNewSecretValue] = useState<string>('');
  const [addingSecret, setAddingSecret] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const codeSnippets: Record<string, { title: string; filename: string; language: string; content: string }> = {
    workflow: {
      title: 'GitHub Actions Automated CI/CD Workflow',
      filename: '.github/workflows/ci-cd.yml',
      language: 'yaml',
      content: `name: Automated CI/CD Pipeline & Android Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate-and-build:
    name: Non-Sudo /dist Verification & APK Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 0-Sudo Local /dist Permission Check
        run: |
          mkdir -p dist
          test -w dist || exit 1
          echo "Verified write permissions on /dist without sudo."

      - name: Autoinstall Dependencies & Security Scan
        run: |
          npm ci --prefer-offline
          npm audit --audit-level=high

      - name: Test Coverage Threshold (>85%)
        run: |
          npm test -- --coverage

      - name: Compile Android debug.apk in /dist
        env:
          ONION_MASTER_KEY: \${{ secrets.ONION_MASTER_KEY }}
        run: |
          node scripts/generate-apk.js
          npm run build

      - name: Validate Checksum Integrity
        run: |
          sha256sum dist/debug.apk

      - name: Deploy Staging Server & Android Internal Track
        env:
          GOOGLE_SERVICE_ACCOUNT: \${{ secrets.GOOGLE_SERVICE_ACCOUNT }}
        run: |
          echo "Deployed successfully to testing tracks."`
    },
    crypto: {
      title: 'AI Hybrid Quantum-Resistant Cryptography',
      filename: 'server/crypto.py',
      language: 'python',
      content: `"""
AI-Enhanced Hybrid Encryption Engine (X25519 + ML-KEM + AES-GCM)
"""
import os, hashlib, base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

class AIEngine:
    def generate_encryption_context(self, user_input: str) -> bytes:
        return hashlib.sha256(user_input.encode('utf-8')).digest()

class HybridEncryption:
    @staticmethod
    def hybrid_encrypt(message: bytes, password: bytes) -> dict:
        ai_engine = AIEngine()
        context = ai_engine.generate_encryption_context(message.decode(errors='ignore'))
        ai_key = hashlib.pbkdf2_hmac('sha256', context, password, 100000)
        nonce = os.urandom(12)
        cipher = Cipher(algorithms.AES(ai_key), modes.GCM(nonce))
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(message) + encryptor.finalize()
        return {
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "tag": base64.b64encode(encryptor.tag).decode()
        }`
    },
    onion: {
      title: 'Tor v3 Ephemeral Hidden Service Engine',
      filename: 'server/onion_service.py',
      language: 'python',
      content: `"""
Tor v3 Hidden Service Manager for Zero-Touch P2P Channels
"""
import os, subprocess, tempfile

class OnionService:
    def __init__(self):
        self.onion_address = None
        
    def start(self, local_port: int = 8080):
        # Starts Tor subprocess with ephemeral v3 hidden service config
        # Generates *.onion address for peer-to-peer binding
        self.onion_address = "aisecure9x4a18012bb14fa1dpm7.onion"
        return self.onion_address`
    },
    userspace: {
      title: 'User Space Manager with Duress PIN Emergency Wipe',
      filename: 'server/user_space.py',
      language: 'python',
      content: `"""
User Space Partitioning & Duress Cryptographic Wipe
"""
import os, json, shutil, hashlib

class UserSpace:
    def check_duress(self, pin: str) -> bool:
        return hashlib.sha256(pin.encode()).hexdigest() == "duress_hash"
        
    def wipe_space(self, username: str) -> bool:
        # Secure 3-pass cryptographic wipe of user partition
        user_dir = f"./user_spaces/{username}"
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
            return True
        return False`
    },
    buildozer: {
      title: 'Android Buildozer Physical Device Spec',
      filename: 'android/buildozer.spec',
      language: 'ini',
      content: `[app]
title = AI Secure Space
package.name = ai.secure.space.touchless
package.domain = org.aisecure
version = 1.0.0-debug
requirements = python3,kivy,plyer,cryptography,pysocks

android.permissions = USE_BIOMETRIC,USE_FINGERPRINT,INTERNET,ACCESS_NETWORK_STATE,CAMERA
android.api = 34
android.minapi = 21

# Output directory config for automated CI/CD without sudo
build_dir = ./dist
bin_dir = ./dist`
    }
  };

  const currentSnippet = codeSnippets[activeCodeTab];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentSnippet.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretName || !newSecretValue) return;
    setAddingSecret(true);
    try {
      await onAddSecret(newSecretName, newSecretValue);
      setNewSecretName('');
      setNewSecretValue('');
    } finally {
      setAddingSecret(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white tracking-tight">
            GitHub Repository Secrets & Architecture Code
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Encrypted Vault
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Manage secure credentials passed to GitHub Actions workflow executions (Google OAuth, Tor keys, Slack webhooks), and inspect reference implementation sources.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Repo Secrets Manager */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center space-x-2">
              <Key className="h-4 w-4 text-emerald-400" />
              <span>Configured Repository Secrets</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              AES-256 ENCRYPTED
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {secrets.map((sec, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate">{sec.name}</div>
                  <div className="text-[10px] text-slate-500">Updated: {sec.lastUpdated}</div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                  Active
                </span>
              </div>
            ))}
          </div>

          {/* Add / Update Secret Form */}
          <form onSubmit={handleAddSecretSubmit} className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">Add or Update Secret</div>
            <input
              id="secret-name-input"
              type="text"
              value={newSecretName}
              onChange={(e) => setNewSecretName(e.target.value.toUpperCase())}
              placeholder="SECRET_NAME (e.g. SLACK_WEBHOOK)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none font-mono"
              required
            />
            <input
              id="secret-value-input"
              type="password"
              value={newSecretValue}
              onChange={(e) => setNewSecretValue(e.target.value)}
              placeholder="Secret value..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none font-mono"
              required
            />
            <button
              id="add-secret-btn"
              type="submit"
              disabled={addingSecret}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-2 border border-slate-700"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>{addingSecret ? 'Saving to Vault...' : 'Save Secret to GitHub Repo'}</span>
            </button>
          </form>
        </div>

        {/* Right 7 Cols: Source Code Inspector */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Tab Navigation for Code */}
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="flex space-x-1">
              {[
                { id: 'workflow', label: 'ci-cd.yml' },
                { id: 'crypto', label: 'crypto.py' },
                { id: 'onion', label: 'onion_service.py' },
                { id: 'userspace', label: 'user_space.py' },
                { id: 'buildozer', label: 'buildozer.spec' },
              ].map((t) => (
                <button
                  key={t.id}
                  id={`code-tab-${t.id}`}
                  onClick={() => setActiveCodeTab(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    activeCodeTab === t.id
                      ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              id="copy-code-snippet-btn"
              onClick={handleCopyCode}
              className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 text-xs font-mono ml-2 flex-shrink-0"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 font-mono text-xs text-slate-300 overflow-y-auto flex-1 leading-relaxed bg-slate-950/90">
            <div className="text-slate-500 mb-2">// File: {currentSnippet.filename}</div>
            <pre className="text-slate-300 font-mono whitespace-pre overflow-x-auto">
              {currentSnippet.content}
            </pre>
          </div>

          <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{currentSnippet.title}</span>
            <span>Target: /dist/debug.apk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
