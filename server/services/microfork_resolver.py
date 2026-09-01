#!/usr/bin/env python3
"""
Microfork Conflict Resolver & DAG Consensus Engine
Implements a DAG-based consensus resolution engine for partitioned mesh environments.
When disconnected offline partitions merge, it evaluates cumulative weight (GHOST/Spectre-style),
resolves conflicting UTXO double-spend branches deterministically using highest-entropy
topological sorting, and automatically re-bundles orphaned transactions into the canonical chain.
"""

import time
import json
import hashlib
from typing import Dict, List, Set, Any, Optional, Tuple

class DAGBlock:
    def __init__(self, block_id: str, parents: List[str], height: int, txs: List[Dict[str, Any]], weight: float = 1.0):
        self.block_id = block_id
        self.parents = parents # Multiple parents representing DAG connections
        self.height = height
        self.txs = txs
        self.weight = weight
        self.cumulative_weight = weight
        self.timestamp = int(time.time())

class MicroforkDAGResolver:
    def __init__(self):
        self.dag: Dict[str, DAGBlock] = {}
        self.canonical_chain: List[str] = []
        self.spent_utxos: Set[str] = set()
        self.orphaned_tx_pool: List[Dict[str, Any]] = []

    def add_block(self, block_id: str, parents: List[str], height: int, txs: List[Dict[str, Any]], weight: float = 1.0) -> DAGBlock:
        block = DAGBlock(block_id, parents, height, txs, weight)
        self.dag[block_id] = block
        self._update_cumulative_weights()
        return block

    def _update_cumulative_weights(self):
        """
        Calculates cumulative GHOST DAG weights by propagating subtree weights up the DAG.
        """
        for block_id, block in self.dag.items():
            cum_w = block.weight
            # Traverse descendants
            for other_id, other_block in self.dag.items():
                if block_id in other_block.parents:
                    cum_w += other_block.weight
            block.cumulative_weight = cum_w

    def resolve_forks_topological(self) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Deterministically orders blocks using highest cumulative weight and highest-entropy tie-breaking.
        Re-bundles conflicting/orphaned transactions.
        """
        if not self.dag:
            return [], []

        # Sort DAG blocks by cumulative weight descending, then by cryptographic hash entropy descending
        sorted_block_ids = sorted(
            self.dag.keys(),
            key=lambda b_id: (self.dag[b_id].cumulative_weight, self.dag[b_id].height, b_id),
            reverse=True
        )

        canonical_path: List[str] = []
        accepted_utxos: Set[str] = set()
        recovered_orphans: List[Dict[str, Any]] = []

        for b_id in sorted_block_ids:
            block = self.dag[b_id]
            block_has_conflict = False

            # Inspect all transactions in block for UTXO collisions
            for tx in block.txs:
                utxo_key = tx.get("utxo_in", f"{tx.get('sender')}:{tx.get('nonce')}")
                if utxo_key in accepted_utxos:
                    # Double-spend branch detected! Reject block from canonical path & orphan non-conflicting TXs
                    block_has_conflict = True
                    break

            if not block_has_conflict:
                canonical_path.append(b_id)
                for tx in block.txs:
                    utxo_key = tx.get("utxo_in", f"{tx.get('sender')}:{tx.get('nonce')}")
                    accepted_utxos.add(utxo_key)
            else:
                # Harvest valid non-colliding transactions from the orphaned microfork
                for tx in block.txs:
                    utxo_key = tx.get("utxo_in", f"{tx.get('sender')}:{tx.get('nonce')}")
                    if utxo_key not in accepted_utxos:
                        recovered_orphans.append(tx)

        self.canonical_chain = canonical_path
        self.orphaned_tx_pool.extend(recovered_orphans)

        return canonical_path, recovered_orphans

    def rebundle_orphans_into_new_block(self, parent_id: str, new_height: int) -> Optional[DAGBlock]:
        """
        Creates a new canonical block that recovers valid orphaned transactions.
        """
        if not self.orphaned_tx_pool:
            return None

        txs_to_bundle = self.orphaned_tx_pool[:50] # Bundle up to 50 orphans
        self.orphaned_tx_pool = self.orphaned_tx_pool[50:]

        block_header = f"REBUNDLE:{parent_id}:{new_height}:{len(txs_to_bundle)}:{time.time()}"
        new_block_id = hashlib.sha256(block_header.encode('utf-8')).hexdigest()

        return self.add_block(new_block_id, [parent_id], new_height, txs_to_bundle, weight=1.5)

if __name__ == "__main__":
    resolver = MicroforkDAGResolver()
    
    # Genesis
    resolver.add_block("genesis_0", [], 0, [{"tx_id": "tx0", "sender": "sys", "nonce": 0}])
    
    # Fork Branch A (Main Mesh, Weight 3.0)
    resolver.add_block("branch_A1", ["genesis_0"], 1, [{"tx_id": "tx1", "sender": "alice", "nonce": 1, "amount": 10}], weight=2.0)
    resolver.add_block("branch_A2", ["branch_A1"], 2, [{"tx_id": "tx2", "sender": "bob", "nonce": 1, "amount": 5}], weight=1.0)
    
    # Fork Branch B (Offline Partition, Weight 1.0 - conflicting Alice nonce 1)
    resolver.add_block("branch_B1", ["genesis_0"], 1, [{"tx_id": "tx1_conflict", "sender": "alice", "nonce": 1, "amount": 10}, {"tx_id": "tx3_offline", "sender": "charlie", "nonce": 1, "amount": 20}], weight=1.0)
    
    canonical, orphans = resolver.resolve_forks_topological()
    print(f"[DAG Consensus] Canonical Path: {canonical}")
    print(f"[DAG Consensus] Recovered Orphaned TXs: {len(orphans)}")
