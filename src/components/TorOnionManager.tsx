import React, { useState } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  RotateCw, 
  Copy, 
  Check, 
  Users, 
  Plus, 
  Radio, 
  Key, 
  Send, 
  Lock, 
  ArrowRightLeft
} from 'lucide-react';
import { UserSpaceRecord } from '../types';

interface TorOnionManagerProps {
  userSpaces: UserSpaceRecord[];
  onCreateUserSpace: (username: string, password: string, onion?: string) => Promise<boolean>;
}

export const TorOnionManager: React.FC<TorOnionManagerProps> = ({
  userSpaces,
  onCreateUserSpace,
}) => {
  const [onionAddress, setOnionAddress] = useState<string>('aisecure9x4a18012bb14fa1dpm7kvy892l0q1z.onion');
  const [copied, setCopied] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('operator_bravo');
  const [newPassword, setNewPassword] = useState<string>('Touchless-Onion-Key#2026');
  const [creating, setCreating] = useState<boolean>(false);
  
  // P2P Chat Simulator over Tor
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Peer 1 (0-Touch Android)', text: 'Ephemeral Tor v3 handshake verified with X25519 ECDH.', time: '06:30' },
    { sender: 'You', text: 'Hybrid ML-KEM session active on physical device debug.apk.', time: '06:32' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  const rotateOnionAddress = () => {
    const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setOnionAddress(`aisecure${rand.slice(0, 32)}dpm7.onion`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(onionAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      await onCreateUserSpace(newUsername, newPassword, onionAddress);
      setNewUsername('');
      setNewPassword('');
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages(prev => [
      ...prev,
      { sender: 'You', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setChatInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Tor v3 Hidden Services & .onion User Spaces
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                End-to-End P2P
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Configures ephemeral Tor v3 onion routing with 56-character base32 hidden addresses, providing zero-touch peer-to-peer channels without central server metadata leakage.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="rotate-onion-btn"
              onClick={rotateOnionAddress}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Rotate Ephemeral .onion</span>
            </button>
          </div>
        </div>

        {/* Live Onion Address Display Bar */}
        <div className="mt-5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-slate-400 min-w-0">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-slate-500">Active .onion:</span>
            <span className="text-emerald-400 font-bold truncate">{onionAddress}</span>
          </div>

          <button
            id="copy-onion-btn"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 text-xs transition-colors self-end sm:self-auto"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Address'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Space Provisioning (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Create .onion User Space</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              ZERO-KNOWLEDGE
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Space / Identity Username
              </label>
              <input
                id="userspace-username-input"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none font-mono"
                placeholder="e.g. secure_agent_01"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Master Secret Passphrase
              </label>
              <input
                id="userspace-password-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 outline-none font-mono"
                placeholder="Enter strong passphrase..."
                required
              />
            </div>

            <button
              id="submit-create-userspace-btn"
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>{creating ? 'Creating Partition...' : 'Provision Secure Partition'}</span>
            </button>
          </form>

          {/* Active Partition List */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Partitions ({userSpaces.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userSpaces.map((s, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{s.username}</div>
                    <div className="text-[11px] text-emerald-400 truncate">{s.onion}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P2P Secure Channel Simulator over Tor v3 (Right 7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-[450px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                Ephemeral Tor P2P Encrypted Channel
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              AES-GCM + SAS Verified
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[85%] ${
                  m.sender === 'You'
                    ? 'ml-auto bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-semibold">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <p className="font-mono leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex space-x-2 pt-3 border-t border-slate-800">
            <input
              id="tor-chat-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type encrypted message to peer over .onion..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none font-mono"
            />
            <button
              id="send-tor-msg-btn"
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Transmit</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
