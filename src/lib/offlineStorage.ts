import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QuantumOfflineDB extends DBSchema {
  pendingCredentials: {
    key: string;
    value: {
      id: string;
      userId: string;
      credentialData: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<QuantumOfflineDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<QuantumOfflineDB>('QuantumOfflineDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingCredentials')) {
          db.createObjectStore('pendingCredentials', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePendingCredential(userId: string, credentialData: any) {
  const db = await getDB();
  const id = credentialData.id || Date.now().toString();
  await db.put('pendingCredentials', {
    id,
    userId,
    credentialData,
    timestamp: Date.now(),
  });
  console.log(`[OfflineStorage] Saved pending WebAuthn credential for user ${userId}`);
}

export async function getPendingCredentials() {
  const db = await getDB();
  return db.getAll('pendingCredentials');
}

export async function removePendingCredential(id: string) {
  const db = await getDB();
  await db.delete('pendingCredentials', id);
  console.log(`[OfflineStorage] Removed pending WebAuthn credential ${id}`);
}
