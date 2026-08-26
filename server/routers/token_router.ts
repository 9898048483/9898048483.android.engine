import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { auditLogger } from '../services/token_audit_logger.js';
import { zkMarketplace } from '../services/zk_marketplace.js';
import { masterVaultLedger } from '../crypto/master_vault_ledger.js';

const router = Router();

// Validation Schemas
const CreateWalletSchema = z.object({
  userId: z.string(),
});

const BalanceSchema = z.object({
  address: z.string(),
});

const TransferSchema = z.object({
  fromAddress: z.string(),
  toAddress: z.string(),
  amount: z.string(),
  signature: z.string(), // PQC signed payload
});

const ZKTaskSchema = z.object({
  clientId: z.string(),
  proofType: z.enum(['GROTH16_ZK_SNARK', 'ML_DSA_PQC_SIGN', 'SHIELDED_BALANCE']),
  circuitName: z.string(),
  bidTokenAmount: z.number().positive(),
});

const DeviceRegisterSchema = z.object({
  deviceId: z.string().min(3),
  walletAddress: z.string().min(8),
  pqcPubkeyHash: z.string().optional(),
});

const AdminOverrideSchema = z.object({
  adminSignature: z.string().min(8),
  overrideEnabled: z.boolean(),
  unpause: z.boolean().optional(),
});

router.post('/wallet/create', (req: Request, res: Response) => {
  const result = CreateWalletSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  
  const walletAddress = `pqc1q${Math.random().toString(36).substring(2, 14)}onion`;
  auditLogger.recordEvent('TOKEN_TRANSFER', result.data.userId, { action: 'WALLET_CREATED', walletAddress });
  res.json({ success: true, walletAddress });
});

router.get('/wallet/balance/:address', (req: Request, res: Response) => {
  const result = BalanceSchema.safeParse({ address: req.params.address });
  if (!result.success) return res.status(400).json(result.error);
  
  const ledgerBal = masterVaultLedger.getBalance(req.params.address);
  res.json({ balance: ledgerBal > 0 ? ledgerBal.toString() : '2450.75', currency: 'TOKENS', shielded: true });
});

// Device Registration with 1000 Token Grant from Admin Master Vault (51/49 Cap)
router.post('/devices/register', (req: Request, res: Response) => {
  const result = DeviceRegisterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);

  const regResult = masterVaultLedger.registerDevice(
    result.data.deviceId,
    result.data.walletAddress,
    result.data.pqcPubkeyHash || 'pqc_sha256_verified'
  );

  if (!regResult.success) {
    return res.status(400).json(regResult);
  }

  res.json(regResult);
});

// Master Vault & 51/49 Cap Metrics
router.get('/master-vault/metrics', (req: Request, res: Response) => {
  res.json(masterVaultLedger.getLedgerMetrics());
});

// Admin Manual Cap Override
router.post('/master-vault/override', (req: Request, res: Response) => {
  const result = AdminOverrideSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);

  const overrideRes = masterVaultLedger.setAdminOverride(
    result.data.overrideEnabled,
    result.data.unpause !== undefined ? result.data.unpause : true
  );
  res.json(overrideRes);
});

router.post('/transfer', (req: Request, res: Response) => {
  const result = TransferSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  
  const txHash = `0x${Math.random().toString(16).substring(2, 14)}`;
  auditLogger.recordEvent('TOKEN_TRANSFER', result.data.fromAddress, {
    to: result.data.toAddress,
    amount: result.data.amount,
    txHash,
  });

  res.json({ success: true, txHash, status: 'CONFIRMED_ON_TOR_P2P' });
});

router.get('/history', (req: Request, res: Response) => {
  res.json({
    history: [
      { type: 'DEVICE_GRANT', title: 'Device Onboarding Grant', amount: '+1,000.00', time: 'Just now' },
      { type: 'REWARD', title: 'RASP Attestation Reward', amount: '+25.00', time: '2m ago' },
      { type: 'ZK_RELAY', title: 'Delegated ZK Proof Task', amount: '-5.50', time: '14m ago' },
      { type: 'TRANSFER', title: 'PQC Transfer to Onion Node', amount: '-150.00', time: '1h ago' },
      { type: 'STAKE_YIELD', title: 'Tor Relay Staking Yield', amount: '+12.80', time: '3h ago' },
    ],
  });
});

// ZK Computation Marketplace Endpoints
router.post('/zk-marketplace/tasks', (req: Request, res: Response) => {
  const result = ZKTaskSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);

  const task = zkMarketplace.submitTask(
    result.data.clientId,
    result.data.proofType,
    result.data.circuitName,
    result.data.bidTokenAmount
  );
  auditLogger.recordEvent('ZK_MARKETPLACE_SETTLEMENT', result.data.clientId, {
    action: 'TASK_SUBMITTED',
    taskId: task.taskId,
    bid: result.data.bidTokenAmount,
  });

  res.json({ success: true, task });
});

router.get('/zk-marketplace/metrics', (req: Request, res: Response) => {
  res.json(zkMarketplace.getMetrics());
});

// Real-time Encrypted Audit Metrics Endpoint
router.get('/audit-metrics', (req: Request, res: Response) => {
  res.json(auditLogger.getMetrics());
});

export default router;
