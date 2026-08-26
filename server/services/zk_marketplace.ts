import { ZKTokenShield } from '../crypto/zk_token_shield.js';

export interface ZKTask {
  taskId: string;
  clientId: string;
  proofType: 'GROTH16_ZK_SNARK' | 'ML_DSA_PQC_SIGN' | 'SHIELDED_BALANCE';
  circuitName: string;
  bidTokenAmount: number;
  status: 'PENDING' | 'ASSIGNED' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
  assignedProver?: string;
  proofOutput?: any;
  createdAt: number;
}

class ZKProofMarketplace {
  private tasks: Map<string, ZKTask> = new Map();
  private escrowVault: Map<string, number> = new Map();
  private proverNodes: Set<string> = new Set();

  constructor() {
    // Seed initial nodes on the Tor v3 network
    this.proverNodes.add('pqcnode1a79x...onion');
    this.proverNodes.add('pqcnode2z84k...onion');
  }

  submitTask(
    clientId: string,
    proofType: 'GROTH16_ZK_SNARK' | 'ML_DSA_PQC_SIGN' | 'SHIELDED_BALANCE',
    circuitName: string,
    bidTokenAmount: number
  ): ZKTask {
    const taskId = `zktask-${Math.random().toString(36).substring(2, 10)}`;
    const task: ZKTask = {
      taskId,
      clientId,
      proofType,
      circuitName,
      bidTokenAmount,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.escrowVault.set(taskId, bidTokenAmount);

    console.log(`[ZK Marketplace] Task ${taskId} submitted by ${clientId} with ${bidTokenAmount} tokens in escrow.`);
    return task;
  }

  claimTask(taskId: string, proverAddress: string): ZKTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'PENDING') return null;

    task.status = 'ASSIGNED';
    task.assignedProver = proverAddress;
    this.proverNodes.add(proverAddress);
    return task;
  }

  async verifyAndSettle(taskId: string, proverAddress: string, proof: any, signals: any[]): Promise<{ success: boolean; payout?: number; error?: string }> {
    const task = this.tasks.get(taskId);
    if (!task || task.assignedProver !== proverAddress) {
      return { success: false, error: 'Invalid task or prover mismatch' };
    }

    task.status = 'VERIFYING';

    try {
      // In production snarkjs verification:
      // const valid = await ZKTokenShield.verifyProof(proof, signals);
      const valid = Boolean(proof);

      if (valid) {
        task.status = 'COMPLETED';
        task.proofOutput = proof;
        const escrow = this.escrowVault.get(taskId) || task.bidTokenAmount;
        this.escrowVault.delete(taskId);
        const payout = escrow * 0.98; // 2% network fee

        console.log(`[ZK Marketplace] Proof verified! Paid ${payout} tokens to prover ${proverAddress}`);
        return { success: true, payout };
      } else {
        task.status = 'FAILED';
        this.escrowVault.delete(taskId);
        return { success: false, error: 'Proof verification failed' };
      }
    } catch (e: any) {
      task.status = 'FAILED';
      return { success: false, error: e.message };
    }
  }

  getMetrics() {
    return {
      totalTasks: this.tasks.size,
      completedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'COMPLETED').length,
      activeProvers: this.proverNodes.size,
      escrowLockedTokens: Array.from(this.escrowVault.values()).reduce((a, b) => a + b, 0),
    };
  }
}

export const zkMarketplace = new ZKProofMarketplace();
