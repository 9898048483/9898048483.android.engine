"""
Quadratic Voting & Liquid Democracy Governance DAO
File: server/services/governance_dao.py

Architecture:
- Advanced decentralized governance and treasury management engine for Token 9898048483.
- Core Pillars:
  1. Quadratic Voting (QV):
     - Effective Votes = sqrt(Tokens Allocated) or Token Cost = Votes^2.
     - Prevents plutocratic whale domination by making marginal vote influence exponentially expensive.
  2. Category-Specific Liquid Democracy:
     - Allows token holders to delegate their voting power to specialized domain experts
       either globally or for specific categories (e.g. TREASURY_SPEND, PROTOCOL_UPGRADE, PARAMETER_TUNING).
  3. Timelock Execution & Security Council Veto:
     - Passed proposals undergo a mandatory timelock delay (e.g. 48 hours).
     - A Multi-Sig Security Council retains emergency veto authority against malicious/compromised proposals.
"""

import time
import math
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum


class ProposalCategory(str, Enum):
    TREASURY_ALLOCATION = "TREASURY_ALLOCATION"
    PROTOCOL_UPGRADE = "PROTOCOL_UPGRADE"
    PARAMETER_TUNING = "PARAMETER_TUNING"
    EMERGENCY_ACTION = "EMERGENCY_ACTION"


class ProposalStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUCCEEDED = "SUCCEEDED"
    DEFEATED = "DEFEATED"
    QUEUED_TIMELOCK = "QUEUED_TIMELOCK"
    EXECUTED = "EXECUTED"
    VETOED = "VETOED"


@dataclass
class VoteRecord:
    voter_address: str
    effective_votes_for: float
    effective_votes_against: float
    token_cost: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class Proposal:
    proposal_id: str
    title: str
    description: str
    proposer_address: str
    category: ProposalCategory
    execution_target_payload: Dict[str, Any]
    start_time: float
    end_time: float
    timelock_delay_seconds: float
    quorum_effective_votes: float
    votes_for: float = 0.0
    votes_against: float = 0.0
    total_tokens_spent_on_voting: float = 0.0
    status: ProposalStatus = ProposalStatus.ACTIVE
    queued_at: Optional[float] = None
    executed_at: Optional[float] = None
    vetoed_by: Optional[str] = None
    voter_records: Dict[str, VoteRecord] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)


@dataclass
class Delegation:
    delegator_address: str
    delegate_address: str
    category: Optional[ProposalCategory]  # None = Global delegation
    delegated_tokens: float
    created_at: float = field(default_factory=time.time)


class GovernanceDAOEngine:
    """
    Manages Quadratic Voting, Liquid Democracy delegations, and Timelock executions.
    """

    DEFAULT_TIMELOCK_SECONDS = 86400 * 2  # 48 hours
    DEFAULT_QUORUM = 1000.0  # Effective votes quorum

    def __init__(self, security_council_members: Optional[List[str]] = None) -> None:
        self.lock = threading.RLock()
        self.proposals: Dict[str, Proposal] = {}
        # delegator -> {category_or_global: delegate_address}
        self.delegations: Dict[str, Dict[Optional[ProposalCategory], str]] = {}
        self.token_balances: Dict[str, float] = {}

        # Multi-sig Security Council (e.g. 3 of 5)
        self.security_council: Set[str] = set(
            security_council_members if security_council_members else [
                "0xcouncil_member_1", "0xcouncil_member_2", "0xcouncil_member_3"
            ]
        )
        self.council_veto_votes: Dict[str, Set[str]] = {}  # proposal_id -> set of council members who voted veto

    def set_token_balance(self, address: str, balance: float) -> None:
        with self.lock:
            self.token_balances[address] = balance

    def delegate_voting_power(
        self,
        delegator: str,
        delegate: str,
        category: Optional[ProposalCategory] = None,
    ) -> Delegation:
        """
        Delegates voting power globally or scoped to a specific proposal category.
        """
        with self.lock:
            if delegator == delegate:
                raise ValueError("Cannot delegate to yourself.")

            if delegator not in self.delegations:
                self.delegations[delegator] = {}

            self.delegations[delegator][category] = delegate
            delegated_balance = self.token_balances.get(delegator, 0.0)

            return Delegation(
                delegator_address=delegator,
                delegate_address=delegate,
                category=category,
                delegated_tokens=delegated_balance,
            )

    def get_effective_voting_tokens(self, voter_address: str, category: ProposalCategory) -> float:
        """
        Calculates total tokens available to voter, including liquid delegations for the category.
        """
        with self.lock:
            total_tokens = self.token_balances.get(voter_address, 0.0)

            # Check if this voter has delegated their power away
            if voter_address in self.delegations:
                # If delegated specifically for this category or globally, self voting tokens = 0
                if category in self.delegations[voter_address] or None in self.delegations[voter_address]:
                    total_tokens = 0.0

            # Add incoming delegations
            for delegator, del_map in self.delegations.items():
                if delegator == voter_address:
                    continue

                # Category-specific match takes priority, then global delegation (None)
                target_delegate = del_map.get(category, del_map.get(None))
                if target_delegate == voter_address:
                    total_tokens += self.token_balances.get(delegator, 0.0)

            return total_tokens

    def create_proposal(
        self,
        title: str,
        description: str,
        proposer: str,
        category: ProposalCategory,
        execution_payload: Dict[str, Any],
        voting_period_seconds: float = 86400 * 3,
        quorum: float = DEFAULT_QUORUM,
    ) -> Proposal:
        """
        Creates a new governance proposal subject to quadratic voting.
        """
        with self.lock:
            now = time.time()
            pid = f"prop_{hashlib.sha256(f'{proposer}:{title}:{now}'.encode()).hexdigest()[:12]}"

            proposal = Proposal(
                proposal_id=pid,
                title=title,
                description=description,
                proposer_address=proposer,
                category=category,
                execution_target_payload=execution_payload,
                start_time=now,
                end_time=now + voting_period_seconds,
                timelock_delay_seconds=self.DEFAULT_TIMELOCK_SECONDS,
                quorum_effective_votes=quorum,
                status=ProposalStatus.ACTIVE,
            )
            self.proposals[pid] = proposal
            return proposal

    def cast_quadratic_vote(
        self,
        proposal_id: str,
        voter_address: str,
        tokens_allocated: float,
        vote_in_favor: bool = True,
    ) -> VoteRecord:
        """
        Casts a quadratic vote: Effective Votes = sqrt(Tokens Allocated).
        Cost = Tokens Allocated.
        """
        with self.lock:
            if proposal_id not in self.proposals:
                raise ValueError(f"Proposal {proposal_id} not found.")

            prop = self.proposals[proposal_id]
            now = time.time()

            if prop.status != ProposalStatus.ACTIVE:
                raise ValueError(f"Proposal {proposal_id} is not active (status: {prop.status.value}).")
            if now > prop.end_time:
                raise ValueError("Voting period has ended.")
            if tokens_allocated <= 0:
                raise ValueError("Tokens allocated to vote must be positive.")

            available_tokens = self.get_effective_voting_tokens(voter_address, prop.category)
            if tokens_allocated > available_tokens:
                raise ValueError(
                    f"Insufficient voting power: allocated {tokens_allocated}, available {available_tokens}."
                )

            # Quadratic voting math: Effective Influence = sqrt(Tokens)
            effective_votes = math.sqrt(tokens_allocated)

            if vote_in_favor:
                prop.votes_for += effective_votes
                rec = VoteRecord(
                    voter_address=voter_address,
                    effective_votes_for=effective_votes,
                    effective_votes_against=0.0,
                    token_cost=tokens_allocated,
                )
            else:
                prop.votes_against += effective_votes
                rec = VoteRecord(
                    voter_address=voter_address,
                    effective_votes_for=0.0,
                    effective_votes_against=effective_votes,
                    token_cost=tokens_allocated,
                )

            prop.total_tokens_spent_on_voting += tokens_allocated
            prop.voter_records[voter_address] = rec
            return rec

    def tally_and_queue_proposal(self, proposal_id: str) -> Proposal:
        """
        Tallies votes, checks quorum, and transitions proposal to Timelock queue if succeeded.
        """
        with self.lock:
            if proposal_id not in self.proposals:
                raise ValueError(f"Proposal {proposal_id} not found.")

            prop = self.proposals[proposal_id]
            if prop.status != ProposalStatus.ACTIVE:
                raise ValueError(f"Proposal {proposal_id} is not active.")

            total_effective = prop.votes_for + prop.votes_against
            if total_effective < prop.quorum_effective_votes:
                prop.status = ProposalStatus.DEFEATED
                return prop

            if prop.votes_for > prop.votes_against:
                prop.status = ProposalStatus.QUEUED_TIMELOCK
                prop.queued_at = time.time()
            else:
                prop.status = ProposalStatus.DEFEATED

            return prop

    def security_council_veto(self, proposal_id: str, council_member: str) -> Dict[str, Any]:
        """
        Allows Security Council members to vote for emergency veto of a queued proposal.
        """
        with self.lock:
            if proposal_id not in self.proposals:
                raise ValueError(f"Proposal {proposal_id} not found.")
            if council_member not in self.security_council:
                raise PermissionError("Signer is not an authorized Security Council member.")

            prop = self.proposals[proposal_id]
            if prop.status not in (ProposalStatus.ACTIVE, ProposalStatus.QUEUED_TIMELOCK):
                raise ValueError("Cannot veto a finalized or inactive proposal.")

            if proposal_id not in self.council_veto_votes:
                self.council_veto_votes[proposal_id] = set()

            self.council_veto_votes[proposal_id].add(council_member)

            # If 2 or more council members vote to veto (majority)
            threshold = (len(self.security_council) // 2) + 1
            if len(self.council_veto_votes[proposal_id]) >= threshold:
                prop.status = ProposalStatus.VETOED
                prop.vetoed_by = f"Security Council ({len(self.council_veto_votes[proposal_id])} signatures)"

            return {
                "proposal_id": proposal_id,
                "veto_votes_count": len(self.council_veto_votes[proposal_id]),
                "status": prop.status.value,
            }

    def execute_proposal(
        self,
        proposal_id: str,
        force_timelock_bypass_for_test: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes a queued proposal once timelock delay has elapsed.
        """
        with self.lock:
            if proposal_id not in self.proposals:
                raise ValueError(f"Proposal {proposal_id} not found.")

            prop = self.proposals[proposal_id]
            if prop.status != ProposalStatus.QUEUED_TIMELOCK:
                raise ValueError(f"Proposal cannot be executed; status is {prop.status.value}.")

            now = time.time()
            queued_time = prop.queued_at if prop.queued_at else prop.created_at
            if not force_timelock_bypass_for_test and (now - queued_time) < prop.timelock_delay_seconds:
                remaining = prop.timelock_delay_seconds - (now - queued_time)
                raise ValueError(f"Timelock active: {remaining:.1f}s remaining before execution.")

            prop.status = ProposalStatus.EXECUTED
            prop.executed_at = now
            tx_hash = f"0x_dao_exec_{hashlib.sha256(f'{proposal_id}:{now}'.encode()).hexdigest()[:32]}"

            return {
                "status": "PROPOSAL_EXECUTED",
                "proposal_id": proposal_id,
                "execution_tx_hash": tx_hash,
                "payload_applied": prop.execution_target_payload,
                "executed_at": now,
            }


# Global Governance DAO Engine Singleton
governance_dao_engine = GovernanceDAOEngine()
