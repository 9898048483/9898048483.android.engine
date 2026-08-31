import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

const LEDGER_COLLECTION = 'user_ledgers';

export const fetchBalance = async (userId: string, email?: string): Promise<number> => {
  if (!userId) throw new Error('User ID is required to fetch balance');
  
  const isAdmin = email === 'india9898048483@gmail.com';
  const adminBalance = 504799047233; // 51% of 989,804,848,300

  try {
    const docRef = doc(db, LEDGER_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const currentBal = docSnap.data().balance;
      if (isAdmin && (currentBal === 0 || currentBal === 1000)) {
        await updateDoc(docRef, { balance: adminBalance });
        return adminBalance;
      }
      return currentBal;
    } else {
      // Admin gets 51% of total tokens, others get 1000
      const initialBalance = isAdmin ? adminBalance : 1000;
      await setDoc(docRef, { balance: initialBalance });
      return initialBalance;
    }
  } catch (error: any) {
    console.warn("Firestore unavailable, falling back to local storage:", error.message);
    const localKey = `ledger_${userId}`;
    const stored = localStorage.getItem(localKey);
    if (stored !== null) return Number(stored);
    
    const initialBalance = isAdmin ? adminBalance : 1000;
    localStorage.setItem(localKey, initialBalance.toString());
    return initialBalance;
  }
};

export const updateBalance = async (userId: string, amount: number): Promise<number> => {
  if (!userId) throw new Error('User ID is required to update balance');
  
  try {
    const docRef = doc(db, LEDGER_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, { balance: amount });
      return amount;
    } else {
      const currentBalance = docSnap.data().balance;
      const newBalance = currentBalance + amount;
      
      if (newBalance < 0) {
        throw new Error('Insufficient funds');
      }

      await updateDoc(docRef, { balance: increment(amount) });
      return newBalance;
    }
  } catch (error: any) {
    console.warn("Firestore unavailable, updating local storage:", error.message);
    const localKey = `ledger_${userId}`;
    const stored = localStorage.getItem(localKey);
    let currentBalance = stored ? Number(stored) : 0;
    
    const newBalance = currentBalance + amount;
    if (newBalance < 0) throw new Error('Insufficient funds');
    
    localStorage.setItem(localKey, newBalance.toString());
    return newBalance;
  }
};

export const transferTokens = async (senderId: string, receiverId: string, amount: number): Promise<void> => {
  if (!senderId || !receiverId) throw new Error('Sender and Receiver IDs are required');
  if (senderId === receiverId) throw new Error('Cannot send tokens to yourself');
  if (amount <= 0) throw new Error('Amount must be positive');

  try {
    await runTransaction(db, async (transaction) => {
      const senderDocRef = doc(db, LEDGER_COLLECTION, senderId);
      const receiverDocRef = doc(db, LEDGER_COLLECTION, receiverId);

      const senderDoc = await transaction.get(senderDocRef);
      if (!senderDoc.exists() || senderDoc.data().balance < amount) {
        throw new Error('Insufficient funds');
      }

      transaction.update(senderDocRef, { balance: increment(-amount) });
      
      const receiverDoc = await transaction.get(receiverDocRef);
      if (!receiverDoc.exists()) {
          transaction.set(receiverDocRef, { balance: amount });
      } else {
          transaction.update(receiverDocRef, { balance: increment(amount) });
      }
    });
  } catch (error: any) {
    if (error.message === 'Insufficient funds') throw error;
    console.warn("Firestore unavailable, performing local transfer:", error.message);
    
    const senderKey = `ledger_${senderId}`;
    const receiverKey = `ledger_${receiverId}`;
    
    const senderStored = localStorage.getItem(senderKey);
    const senderBalance = senderStored ? Number(senderStored) : 0;
    
    if (senderBalance < amount) throw new Error('Insufficient funds');
    
    const receiverStored = localStorage.getItem(receiverKey);
    const receiverBalance = receiverStored ? Number(receiverStored) : 0;
    
    localStorage.setItem(senderKey, (senderBalance - amount).toString());
    localStorage.setItem(receiverKey, (receiverBalance + amount).toString());
  }
};
