import fs from 'fs';
import path from 'path';

export interface LedgerRecord {
  balance: number;
  email?: string;
  role?: string;
  updatedAt: number;
}

export interface TransactionRecord {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  type: 'transfer' | 'genesis' | 'mint' | 'shielded';
  timestamp: string;
  txHash: string;
  status: 'confirmed';
}

const TOTAL_SUPPLY = 989804848300;
const ADMIN_EMAIL = 'india9898048483@gmail.com';
const ADMIN_STAKE_51 = 504799047233; // 51% of 989,804,848,300
const NEW_USER_WELCOME_BONUS = 1000;

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'ledgers.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class TokenLedgerManager {
  private ledgers: Map<string, LedgerRecord> = new Map();
  private transactions: TransactionRecord[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(LEDGER_FILE)) {
        const raw = fs.readFileSync(LEDGER_FILE, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [key, val] of Object.entries(obj)) {
          this.ledgers.set(key, val as LedgerRecord);
        }
      }
    } catch (e) {
      console.warn('[TokenLedger] Failed to load ledgers file, initializing fresh store:', e);
    }

    try {
      if (fs.existsSync(TX_FILE)) {
        const raw = fs.readFileSync(TX_FILE, 'utf-8');
        this.transactions = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[TokenLedger] Failed to load transactions file:', e);
    }

    // Ensure Master Admin account exists with 51% stake
    const adminKeys = [ADMIN_EMAIL, 'operator_alpha'];
    for (const key of adminKeys) {
      const existing = this.ledgers.get(key);
      if (!existing || existing.balance < ADMIN_STAKE_51) {
        this.ledgers.set(key, {
          balance: ADMIN_STAKE_51,
          email: ADMIN_EMAIL,
          role: 'Master Admin / Sovereign Stakeholder (51%)',
          updatedAt: Date.now()
        });
      }
    }
    this.saveState();
  }

  private saveState() {
    try {
      const obj: Record<string, LedgerRecord> = {};
      for (const [k, v] of this.ledgers.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(LEDGER_FILE, JSON.stringify(obj, null, 2), 'utf-8');
      fs.writeFileSync(TX_FILE, JSON.stringify(this.transactions, null, 2), 'utf-8');
    } catch (e) {
      console.error('[TokenLedger] Error saving state:', e);
    }
  }

  public isMasterAdmin(userId: string, email?: string): boolean {
    if (email && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) return true;
    if (userId.toLowerCase().includes('india9898048483')) return true;
    if (userId === 'operator_alpha') return true;
    return false;
  }

  public getBalance(userId: string, email?: string): number {
    if (!userId) return 0;
    const isAdmin = this.isMasterAdmin(userId, email);

    // If userId or email is master admin
    if (isAdmin) {
      const rec = this.ledgers.get(userId);
      if (!rec || rec.balance < ADMIN_STAKE_51) {
        this.ledgers.set(userId, {
          balance: ADMIN_STAKE_51,
          email: ADMIN_EMAIL,
          role: 'Master Admin (51%)',
          updatedAt: Date.now()
        });
        this.saveState();
        return ADMIN_STAKE_51;
      }
      return rec.balance;
    }

    // Normal user or new Android device/Google Account installation
    if (!this.ledgers.has(userId)) {
      this.ledgers.set(userId, {
        balance: NEW_USER_WELCOME_BONUS,
        email: email || undefined,
        role: 'Verified Google Account / Android Node',
        updatedAt: Date.now()
      });
      // Record Genesis / Welcome Bonus transaction
      this.transactions.unshift({
        id: 'tx_genesis_' + Math.random().toString(36).substring(2, 10),
        senderId: 'SYSTEM_FAUCET_GENESIS',
        receiverId: userId,
        amount: NEW_USER_WELCOME_BONUS,
        type: 'genesis',
        timestamp: new Date().toISOString(),
        txHash: '0x' + Math.random().toString(16).substring(2, 40) + Date.now().toString(16),
        status: 'confirmed'
      });
      this.saveState();
      return NEW_USER_WELCOME_BONUS;
    }

    return this.ledgers.get(userId)!.balance;
  }

  public transfer(senderId: string, receiverId: string, amount: number, senderEmail?: string): { success: boolean; senderBalance: number; receiverBalance: number; tx: TransactionRecord } {
    if (!senderId || !receiverId) throw new Error('Missing sender or receiver');
    if (senderId === receiverId) throw new Error('Cannot transfer to the same wallet address');
    if (amount <= 0 || isNaN(amount)) throw new Error('Transfer amount must be positive');

    const senderBal = this.getBalance(senderId, senderEmail);
    if (senderBal < amount) {
      throw new Error(`Insufficient balance. Current balance: ${senderBal.toFixed(4)} Tokens, requested: ${amount.toFixed(4)} Tokens`);
    }

    const receiverBal = this.getBalance(receiverId);

    const newSenderBal = senderBal - amount;
    const newReceiverBal = receiverBal + amount;

    const senderRec = this.ledgers.get(senderId) || { balance: senderBal, updatedAt: Date.now() };
    senderRec.balance = newSenderBal;
    senderRec.updatedAt = Date.now();
    this.ledgers.set(senderId, senderRec);

    const receiverRec = this.ledgers.get(receiverId) || { balance: receiverBal, updatedAt: Date.now() };
    receiverRec.balance = newReceiverBal;
    receiverRec.updatedAt = Date.now();
    this.ledgers.set(receiverId, receiverRec);

    const tx: TransactionRecord = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      senderId,
      receiverId,
      amount,
      type: 'transfer',
      timestamp: new Date().toISOString(),
      txHash: '0x' + Math.random().toString(16).substring(2, 42) + Date.now().toString(16),
      status: 'confirmed'
    };

    this.transactions.unshift(tx);
    // Keep max 200 transactions in history
    if (this.transactions.length > 200) {
      this.transactions = this.transactions.slice(0, 200);
    }

    this.saveState();
    return {
      success: true,
      senderBalance: newSenderBal,
      receiverBalance: newReceiverBal,
      tx
    };
  }

  public getHistory(userId: string): TransactionRecord[] {
    if (!userId) return [];
    return this.transactions.filter(
      (tx) => tx.senderId === userId || tx.receiverId === userId || tx.senderId === 'SYSTEM_FAUCET_GENESIS'
    );
  }

  public mint(userId: string, amount: number, actionType: string): { success: boolean; newBalance: number } {
    const currentBal = this.getBalance(userId);
    const newBal = currentBal + amount;
    const rec = this.ledgers.get(userId) || { balance: currentBal, updatedAt: Date.now() };
    rec.balance = newBal;
    rec.updatedAt = Date.now();
    this.ledgers.set(userId, rec);

    this.transactions.unshift({
      id: 'tx_mint_' + Date.now(),
      senderId: `SYSTEM_MINT_${actionType.toUpperCase()}`,
      receiverId: userId,
      amount,
      type: 'mint',
      timestamp: new Date().toISOString(),
      txHash: '0x' + Math.random().toString(16).substring(2, 42) + Date.now().toString(16),
      status: 'confirmed'
    });

    this.saveState();
    return { success: true, newBalance: newBal };
  }
}

export const tokenLedger = new TokenLedgerManager();
