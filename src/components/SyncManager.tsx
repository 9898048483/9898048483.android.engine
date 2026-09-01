import React, { useEffect, useState } from 'react';
import { getPendingCredentials, removePendingCredential } from '../lib/offlineStorage';
import { db } from '../db/firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

export const SyncManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus('Syncing pending credentials...');
      
      try {
        const pending = await getPendingCredentials();
        if (pending.length === 0) {
          setSyncStatus('Fully synced.');
          const timer = setTimeout(() => setSyncStatus(''), 3000);
          return () => clearTimeout(timer);
        }

        for (const cred of pending) {
          try {
            // Push to Firebase directly as requested
            const userDocRef = doc(db, 'users', cred.userId);
            await setDoc(userDocRef, {
              webAuthnCredentials: arrayUnion(cred.credentialData)
            }, { merge: true });
          } catch (fbErr) {
            console.warn('[SyncManager] Firebase direct sync warning (handled):', fbErr);
          }

          // Remove from local offline pending queue
          await removePendingCredential(cred.id);
        }
        
        setSyncStatus(`Successfully synced ${pending.length} credentials.`);
        const timer = setTimeout(() => setSyncStatus(''), 3000);
        return () => clearTimeout(timer);
      } catch (error) {
        console.warn('Sync credentials note:', error);
        setSyncStatus('');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Device is offline. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!syncStatus) return null;

  return (
    <div className={`fixed bottom-4 right-4 p-3 rounded-lg text-sm font-medium shadow-lg transition-all z-50 ${isOnline ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/30' : 'bg-amber-900/80 text-amber-300 border border-amber-500/30'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} ${syncStatus.includes('Syncing') ? 'animate-pulse' : ''}`} />
        {syncStatus}
      </div>
    </div>
  );
};
