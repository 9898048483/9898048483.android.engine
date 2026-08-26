import crypto from 'crypto';
import { auditLogger } from '../services/token_audit_logger.js';

export const TOKEN_ID = '9898048483';
export const TOTAL_SUPPLY = 989_804_848_300; // 989.8B tokens
export const LOCKED_ADMIN_RESERVE = 504_800_472_633; // 51%
export const MAX_PUBLIC_DISTRIBUTION = 485_004_375_667; // 49%
export const DEVICE_REGISTRATION_REWARD = 1_000;
export const ADMIN_MASTER_VAULT_ADDRESS = 'vault_master_9898048483_admin_enclave';

export interface LedgerTx {
  txId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  txType: string;
  deviceId?: string;
  timestamp: number;
  prevHash: string;
  txHash: string;
  metadata?: Record<string, any>;
}

export interface DeviceRecord {
  deviceId: string;
  walletAddress: string;
  pqcPubkeyHash: string;
  registeredAt: number;
  initialGrant: number;
}

class MasterVaultLedgerEngine {
  private adminVaultBalance: number = TOTAL_SUPPLY;
  private totalPublicDistributed: number = 0;
  private wallets: Map<string, number> = new Map();
  private registeredDevices: Map<string, DeviceRecord> = new Map();
  private deviceWalletMap: Map<string, string> = new Map();
  private isIssuancePaused: boolean = false;
  private adminManualOverride: boolean = false;
  private transactions: LedgerTx[] = [];
  private lastBlockHash: string = '0'.repeat(64);

  constructor() {
    this.wallets.set(ADMIN_MASTER_VAULT_ADDRESS, TOTAL_SUPPLY);
    this.initializeGenesis();
  }

  private initializeGenesis() {
    const timestamp = Date.now();
    const payload = {
      tokenId: TOKEN_ID,
      totalSupply: TOTAL_SUPPLY,
      lockedReserve: LOCKED_ADMIN_RESERVE,
      publicCap: MAX_PUBLIC_DISTRIBUTION,
    };
    const genesisHash = crypto
      .createHash('sha256')
      .update(`GENESIS|${JSON.stringify(payload)}`)
      .digest('hex');

    const genesisTx: LedgerTx = {
      txId: 'tx_genesis_9898048483',
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: ADMIN_MASTER_VAULT_ADDRESS,
      amount: TOTAL_SUPPLY,
      txType: 'GENESIS_MINT',
      timestamp,
      prevHash: this.lastBlockHash,
      txHash: genesisHash,
      metadata: payload,
    };

    this.transactions.push(genesisTx);
    this.lastBlockHash = genesisHash;
  }

  private computeTxHash(
    prevHash: string,
    from: string,
    to: string,
    amount: number,
    timestamp: number,
    deviceId?: string
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${prevHash}|${from}|${to}|${amount}|${timestamp}|${deviceId || ''}`)
      .digest('hex');
  }

  public registerDevice(
    deviceId: string,
    walletAddress: string,
    pqcPubkeyHash: string
  ): { success: boolean; message: string; data?: any } {
    // 1. Deduplication
    if (this.registeredDevices.has(deviceId)) {
      return { success: false, message: `Device ${deviceId} is already registered.` };
    }
    if (this.deviceWalletMap.has(walletAddress)) {
      return { success: false, message: `Wallet ${walletAddress} is already registered to a device.` };
    }

    // 2. Cap Check
    const nextTotal = this.totalPublicDistributed + DEVICE_REGISTRATION_REWARD;
    if (nextTotal > MAX_PUBLIC_DISTRIBUTION) {
      this.isIssuancePaused = true;
      if (!this.adminManualOverride) {
        return {
          success: false,
          message: `Registration paused: 49% Public Distribution Cap (${MAX_PUBLIC_DISTRIBUTION.toLocaleString()} tokens) reached.`,
        };
      }
    }

    if (this.isIssuancePaused && !this.adminManualOverride) {
      return { success: false, message: 'Public token issuance is currently paused.' };
    }

    // 3. 51% Locked Admin Reserve Safeguard
    const remainingVault = this.adminVaultBalance - DEVICE_REGISTRATION_REWARD;
    if (remainingVault < LOCKED_ADMIN_RESERVE && !this.adminManualOverride) {
      return {
        success: false,
        message: `Transaction violates 51% Locked Admin Reserve (${LOCKED_ADMIN_RESERVE.toLocaleString()} tokens).`,
      };
    }

    // 4. Update balances
    this.adminVaultBalance -= DEVICE_REGISTRATION_REWARD;
    this.totalPublicDistributed += DEVICE_REGISTRATION_REWARD;
    this.wallets.set(ADMIN_MASTER_VAULT_ADDRESS, this.adminVaultBalance);

    const currentWalletBal = this.wallets.get(walletAddress) || 0;
    this.wallets.set(walletAddress, currentWalletBal + DEVICE_REGISTRATION_REWARD);

    // 5. Store record
    const timestamp = Date.now();
    const deviceRecord: DeviceRecord = {
      deviceId,
      walletAddress,
      pqcPubkeyHash,
      registeredAt: timestamp,
      initialGrant: DEVICE_REGISTRATION_REWARD,
    };
    this.registeredDevices.set(deviceId, deviceRecord);
    this.deviceWalletMap.set(walletAddress, deviceId);

    // 6. Chain Ledger Transaction
    const txId = `tx_reg_${timestamp}_${this.transactions.length}`;
    const txHash = this.computeTxHash(
      this.lastBlockHash,
      ADMIN_MASTER_VAULT_ADDRESS,
      walletAddress,
      DEVICE_REGISTRATION_REWARD,
      timestamp,
      deviceId
    );

    const tx: LedgerTx = {
      txId,
      fromAddress: ADMIN_MASTER_VAULT_ADDRESS,
      toAddress: walletAddress,
      amount: DEVICE_REGISTRATION_REWARD,
      txType: 'DEVICE_REGISTRATION',
      deviceId,
      timestamp,
      prevHash: this.lastBlockHash,
      txHash,
      metadata: {
        pqcPubkeyHash,
        totalPublicDistributed: this.totalPublicDistributed,
      },
    };

    this.transactions.push(tx);
    this.lastBlockHash = txHash;

    // Log to encrypted audit logger
    auditLogger.recordEvent('TOKEN_TRANSFER', ADMIN_MASTER_VAULT_ADDRESS, {
      type: 'DEVICE_REGISTRATION_GRANT',
      to: walletAddress,
      amount: DEVICE_REGISTRATION_REWARD,
      deviceId,
      txHash,
    });

    if (this.totalPublicDistributed >= MAX_PUBLIC_DISTRIBUTION) {
      this.isIssuancePaused = true;
    }

    return {
      success: true,
      message: 'Device successfully registered. 1,000 tokens credited from Admin Master Vault.',
      data: {
        txId,
        txHash,
        deviceId,
        walletAddress,
        creditedAmount: DEVICE_REGISTRATION_REWARD,
        walletBalance: this.wallets.get(walletAddress),
        adminVaultRemaining: this.adminVaultBalance,
        totalPublicDistributed: this.totalPublicDistributed,
        publicCapRemaining: Math.max(0, MAX_PUBLIC_DISTRIBUTION - this.totalPublicDistributed),
        isIssuancePaused: this.isIssuancePaused,
      },
    };
  }

  public getLedgerMetrics() {
    const distributedPct = (this.totalPublicDistributed / TOTAL_SUPPLY) * 100;
    const vaultPct = (this.adminVaultBalance / TOTAL_SUPPLY) * 100;

    return {
      tokenId: TOKEN_ID,
      totalSupply: TOTAL_SUPPLY,
      adminMasterVaultAddress: ADMIN_MASTER_VAULT_ADDRESS,
      adminMasterVaultBalance: this.adminVaultBalance,
      adminVaultPercentage: `${vaultPct.toFixed(4)}%`,
      lockedAdminReserve: LOCKED_ADMIN_RESERVE,
      lockedAdminReserveTarget: '51.0000%',
      maxPublicDistributionCap: MAX_PUBLIC_DISTRIBUTION,
      publicDistributionCapTarget: '49.0000%',
      totalPublicDistributed: this.totalPublicDistributed,
      publicDistributedPercentage: `${distributedPct.toFixed(4)}%`,
      remainingPublicAllowance: Math.max(0, MAX_PUBLIC_DISTRIBUTION - this.totalPublicDistributed),
      totalRegisteredDevices: this.registeredDevices.size,
      deviceRegistrationGrant: DEVICE_REGISTRATION_REWARD,
      isIssuancePaused: this.isIssuancePaused,
      adminManualOverride: this.adminManualOverride,
      totalLedgerTransactions: this.transactions.length,
      lastBlockHash: this.lastBlockHash,
      status: !this.isIssuancePaused ? 'OPERATIONAL' : 'PAUSED_CAP_REACHED',
    };
  }

  public setAdminOverride(enabled: boolean, unpause: boolean = true) {
    this.adminManualOverride = enabled;
    if (unpause) {
      this.isIssuancePaused = false;
    }
    return {
      success: true,
      adminManualOverride: this.adminManualOverride,
      isIssuancePaused: this.isIssuancePaused,
    };
  }

  public getBalance(walletAddress: string): number {
    return this.wallets.get(walletAddress) || 0;
  }
}

export const masterVaultLedger = new MasterVaultLedgerEngine();
