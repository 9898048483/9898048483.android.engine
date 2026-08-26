"""
Relational Ledger Database Schema & Models
File: server/db/models.py

Supported Databases: SQLite (Local/Edge/Android Embedded) & PostgreSQL (Cloud Relational)
ORM: SQLAlchemy 2.0+

Models:
- MasterVault: Supply tracking, 51% locked reserve, public circulation, cap status, reward rate.
- HWIDRegistry: Hardware enclave ID binding, claims counter, registration timestamps.
- Wallets: Shielded & PQC wallet balances, monotonic sequence nonces, public key registry.
- Transactions: Immutable transaction log, sender/receiver addresses, cryptographic signatures.
"""

import time
import os
from typing import Optional, Dict, Any
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    BigInteger,
    Float,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

Base = declarative_base()

# ---------------------------------------------------------------------------
# 1. Master Vault Model
# ---------------------------------------------------------------------------
class MasterVault(Base):
    __tablename__ = "master_vault"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(String(64), unique=True, nullable=False, default="9898048483")
    total_supply = Column(Float, nullable=False, default=989_804_848_300.0)
    admin_balance = Column(Float, nullable=False, default=504_800_472_633.0)  # 51% locked reserve
    public_released_amount = Column(Float, nullable=False, default=0.0)       # 49% public max
    public_cap_limit = Column(Float, nullable=False, default=485_004_375_667.0)
    cap_status = Column(String(32), nullable=False, default="ACTIVE")          # "ACTIVE", "PAUSED", "RESERVE_UNLOCKED", "CAP_REACHED"
    reward_rate = Column(Float, nullable=False, default=1000.0)                # Per-device reward (e.g. 1000 -> 500)
    is_paused = Column(Boolean, nullable=False, default=False)
    unlocked_reserve_amount = Column(Float, nullable=False, default=0.0)
    admin_master_address = Column(String(128), default="vault_master_9898048483_admin_enclave")
    updated_at = Column(Float, default=time.time, onupdate=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "token_id": self.token_id,
            "total_supply": self.total_supply,
            "admin_balance": self.admin_balance,
            "public_released_amount": self.public_released_amount,
            "public_cap_limit": self.public_cap_limit,
            "cap_status": self.cap_status,
            "reward_rate": self.reward_rate,
            "is_paused": self.is_paused,
            "unlocked_reserve_amount": self.unlocked_reserve_amount,
            "updated_at": self.updated_at,
        }


# ---------------------------------------------------------------------------
# 2. HWID Registry Model
# ---------------------------------------------------------------------------
class HWIDRegistry(Base):
    __tablename__ = "hwid_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hwid_hash = Column(String(128), unique=True, index=True, nullable=False)
    wallet_address = Column(String(128), index=True, nullable=False)
    device_model = Column(String(128), default="Android Device")
    registered_at = Column(Float, default=time.time)
    claims_count = Column(Integer, default=1)
    attestation_verified = Column(Boolean, default=True)
    last_claim_tx = Column(String(128), nullable=True)

    __table_args__ = (
        Index("idx_hwid_wallet", "hwid_hash", "wallet_address"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hwid_hash": self.hwid_hash,
            "wallet_address": self.wallet_address,
            "device_model": self.device_model,
            "registered_at": self.registered_at,
            "claims_count": self.claims_count,
            "attestation_verified": self.attestation_verified,
            "last_claim_tx": self.last_claim_tx,
        }


# ---------------------------------------------------------------------------
# 3. Wallets Model
# ---------------------------------------------------------------------------
class Wallets(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    address = Column(String(128), unique=True, index=True, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    nonce = Column(Integer, default=0, nullable=False)
    pqc_pubkey = Column(Text, nullable=True)
    is_frozen = Column(Boolean, default=False)
    created_at = Column(Float, default=time.time)
    updated_at = Column(Float, default=time.time, onupdate=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "address": self.address,
            "balance": self.balance,
            "nonce": self.nonce,
            "is_frozen": self.is_frozen,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


# ---------------------------------------------------------------------------
# 4. Transactions Model
# ---------------------------------------------------------------------------
class Transactions(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_hash = Column(String(128), unique=True, index=True, nullable=False)
    sender = Column(String(128), index=True, nullable=False)
    receiver = Column(String(128), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    fee = Column(Float, default=0.0)
    signature = Column(Text, nullable=False)
    nonce = Column(Integer, default=1)
    status = Column(String(32), default="CONFIRMED")  # "PENDING", "CONFIRMED", "REJECTED"
    tx_type = Column(String(64), default="TRANSFER")   # "DEVICE_GRANT", "TRANSFER", "RESERVE_RELEASE"
    timestamp = Column(Float, default=time.time, index=True)
    block_height = Column(Integer, default=1)
    metadata_json = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_sender_nonce", "sender", "nonce"),
        Index("idx_tx_timestamp", "timestamp"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tx_hash": self.tx_hash,
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": self.amount,
            "fee": self.fee,
            "nonce": self.nonce,
            "status": self.status,
            "tx_type": self.tx_type,
            "timestamp": self.timestamp,
            "block_height": self.block_height,
        }


# ---------------------------------------------------------------------------
# Database Session & Initialization Factory
# ---------------------------------------------------------------------------
class DatabaseManager:
    """Manages SQLite / PostgreSQL engine instantiation, migration, and sessions."""

    def __init__(self, db_url: Optional[str] = None) -> None:
        if db_url is None:
            # Default to SQLite local database
            os.makedirs("data", exist_ok=True)
            db_url = os.getenv("DATABASE_URL", "sqlite:///data/token_ledger.db")

        # SQLite threading configuration
        connect_args = {}
        if db_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        self.engine = create_engine(db_url, connect_args=connect_args, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.create_tables()

    def create_tables(self) -> None:
        """Creates all relational schema tables if they do not exist."""
        Base.metadata.create_all(bind=self.engine)
        self._seed_master_vault_if_empty()

    def _seed_master_vault_if_empty(self) -> None:
        """Seeds initial MasterVault row on first startup."""
        session = self.get_session()
        try:
            vault = session.query(MasterVault).filter_by(token_id="9898048483").first()
            if not vault:
                vault = MasterVault(
                    token_id="9898048483",
                    total_supply=989_804_848_300.0,
                    admin_balance=504_800_472_633.0,
                    public_released_amount=0.0,
                    public_cap_limit=485_004_375_667.0,
                    cap_status="ACTIVE",
                    reward_rate=1000.0,
                    is_paused=False,
                )
                session.add(vault)
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def get_session(self) -> Session:
        """Returns a new thread-local database session."""
        return self.SessionLocal()


# Global Database Singleton
db_manager = DatabaseManager()
