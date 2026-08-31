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
          return;
        }

        for (const cred of pending) {
          // Push to Firebase directly as requested
          const userDocRef = doc(db, 'users', cred.userId);
          await setDoc(userDocRef, {
            webAuthnCredentials: arrayUnion(cred.credentialData)
          }, { merge: true });

          // Or also try to hit the API, but prompt says "push them to the Firebase database"
          await removePendingCredential(cred.id);
        }
        
        setSyncStatus(`Successfully synced ${pending.length} credentials.`);
      } catch (error) {
        console.error('Failed to sync credentials:', error);
        setSyncStatus('Failed to sync. Will retry later.');
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
