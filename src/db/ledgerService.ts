import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

const LEDGER_COLLECTION = 'user_ledgers';

export const fetchBalance = async (userId: string): Promise<number> => {
  if (!userId) throw new Error('User ID is required to fetch balance');
  const docRef = doc(db, LEDGER_COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().balance;
  } else {
    // Initialize if not exists
    await setDoc(docRef, { balance: 0 });
    return 0;
  }
};

export const updateBalance = async (userId: string, amount: number): Promise<number> => {
  if (!userId) throw new Error('User ID is required to update balance');
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
};

export const transferTokens = async (senderId: string, receiverId: string, amount: number): Promise<void> => {
  if (!senderId || !receiverId) throw new Error('Sender and Receiver IDs are required');
  if (senderId === receiverId) throw new Error('Cannot send tokens to yourself');
  if (amount <= 0) throw new Error('Amount must be positive');

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
};
