"""
FastAPI Core Token REST & WebSocket API (server/routers/token_api.py)

Endpoints & Features:
- POST /api/v1/device/register: HWID verification, automated 1,000-token allocation from Master Vault.
- GET /api/v1/wallet/balance/{address}: Queries cryptographic ledger balance (shielded/PQC).
- POST /api/v1/token/transfer: Validates PQC signatures & executes zero-knowledge peer settlement.
- POST /api/v1/vault/unlock: Decrypts deniable storage (Master vs. Decoy Duress mode).
- WebSocket /api/v1/token/live-feed: Real-time broadcast of live transaction events, audits, and network stats.
- Security: Pydantic v2 validation, CORS configuration, and sliding window rate-limiting.
"""

import os
import sys
import time
import json
import asyncio
import logging
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator

from fastapi import APIRouter, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import backend ledger and crypto services
try:
    from server.services.master_vault_ledger import master_vault_ledger
    from server.services.token_audit_logger import audit_logger
    from server.crypto.pqc_mldsa import hybrid_pqc_signer
    from server.crypto.deniable_vault import deniable_vault
    from server.services.admin_control import admin_control
except ImportError:
    from services.master_vault_ledger import master_vault_ledger
    from services.token_audit_logger import audit_logger
    from crypto.pqc_mldsa import hybrid_pqc_signer
    from crypto.deniable_vault import deniable_vault
    from services.admin_control import admin_control

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TokenAPI")

router = APIRouter(prefix="/api/v1", tags=["Token 9898048483 Engine"])

# ---------------------------------------------------------------------------
# Rate Limiting Tracker
# ---------------------------------------------------------------------------
RATE_LIMIT_MAX_REQUESTS = 60
RATE_LIMIT_WINDOW_SECONDS = 60
_request_history: Dict[str, List[float]] = {}


def rate_limiter_dependency(request: Request):
    """Sliding-window IP rate limiting middleware."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    if client_ip not in _request_history:
        _request_history[client_ip] = []

    # Clean old requests
    _request_history[client_ip] = [
        t for t in _request_history[client_ip] if now - t < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(_request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 60 requests per minute.",
        )

    _request_history[client_ip].append(now)


# ---------------------------------------------------------------------------
# Pydantic Request / Response Models
# ---------------------------------------------------------------------------
class DeviceRegisterRequest(BaseModel):
    hwid_hash: str = Field(..., description="Titan M / StrongBox derived HWID hash (hwid_0x...)")
    wallet_address: str = Field(..., description="Target 0x... address to receive 1000 tokens")
    device_model: Optional[str] = Field(default="Android Device", description="Device hardware model")
    attestation_signature: Optional[str] = Field(default=None, description="Hardware enclave attestation")

    @field_validator("hwid_hash")
    def validate_hwid(cls, v: str) -> str:
        if not v.startswith("hwid_0x") or len(v) < 20:
            raise ValueError("Invalid HWID format. Must begin with 'hwid_0x'")
        return v

    @field_validator("wallet_address")
    def validate_address(cls, v: str) -> str:
        if not v.startswith("0x") or len(v) != 66:
            raise ValueError("Invalid wallet address. Must be 66 characters hex starting with '0x'")
        return v


class DeviceRegisterResponse(BaseModel):
    success: bool
    status: str
    wallet_address: str
    grant_amount: float
    remaining_vault_balance: float
    tx_hash: str
    message: str


class BalanceResponse(BaseModel):
    wallet_address: str
    token_id: str
    balance: float
    currency: str = "PQC-9898048483"
    shielded: bool = True


class TokenTransferRequest(BaseModel):
    from_wallet: str = Field(..., min_length=66, max_length=66)
    to_wallet: str = Field(..., min_length=66, max_length=66)
    amount: float = Field(..., gt=0)
    nonce: int = Field(default=1, ge=1)
    hybrid_signature: str = Field(..., min_length=10)
    pqc_public_key: Optional[str] = None


class TokenTransferResponse(BaseModel):
    success: bool
    tx_hash: str
    from_wallet: str
    to_wallet: str
    amount: float
    fee: float
    timestamp: float
    receipt: Dict[str, Any]


class VaultUnlockRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=32)


class VaultUnlockResponse(BaseModel):
    success: bool
    volume_type: str  # "MASTER" or "DECOY"
    message: str
    wallet_data: Optional[Dict[str, Any]] = None


class AdminReserveUnlockRequest(BaseModel):
    auth_token: str = Field(..., description="Admin cryptographic authentication token / signature")
    amount: float = Field(..., gt=0, description="Amount of tokens to unlock from 51% reserve")
    target_wallet: Optional[str] = Field(default=None, description="Designated treasury wallet address")
    reason: Optional[str] = Field(default="Strategic ecosystem liquidity release")


class AdminRewardRateRequest(BaseModel):
    auth_token: str = Field(..., description="Admin cryptographic authentication token / signature")
    new_reward_rate: float = Field(..., ge=0, description="New per-device installation reward amount")
    reason: Optional[str] = Field(default="Reward schedule adjustment / halving")


class AdminGlobalPauseRequest(BaseModel):
    auth_token: str = Field(..., description="Admin cryptographic authentication token / signature")
    is_paused: bool = Field(..., description="True to trigger emergency circuit breaker, False to resume")
    reason: Optional[str] = Field(default="Emergency security mitigation / circuit breaker")


class AdminWalletFreezeRequest(BaseModel):
    auth_token: str = Field(..., description="Admin cryptographic authentication token / signature")
    wallet_address: str = Field(..., description="Target wallet address to freeze or unfreeze")
    freeze: bool = Field(default=True, description="True to freeze, False to unfreeze")
    reason: Optional[str] = Field(default="Compromised key or malicious behavior isolation")


# ---------------------------------------------------------------------------
# WebSocket Live Feed Connection Manager
# ---------------------------------------------------------------------------
class LiveFeedManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"[WebSocket] Peer connected. Active sockets: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"[WebSocket] Peer disconnected. Active sockets: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]) -> None:
        data_text = json.dumps(message)
        async with self._lock:
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(data_text)
                except Exception:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)


live_feed = LiveFeedManager()


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/device/register",
    response_model=DeviceRegisterResponse,
    dependencies=[Depends(rate_limiter_dependency)],
)
async def register_device_and_grant_reward(payload: DeviceRegisterRequest):
    """
    Validates Android hardware enclave HWID binding and allocates 1,000 PQC Tokens
    from the Master Admin Vault (9898048483) directly to the user's KeyStore wallet.
    """
    logger.info(f"[API] Processing device onboarding for HWID: {payload.hwid_hash[:16]}...")

    success, msg, receipt = master_vault_ledger.register_device_and_grant(
        hwid_hash=payload.hwid_hash,
        user_wallet_address=payload.wallet_address,
        device_model=payload.device_model or "Android Client",
    )

    if not success or not receipt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg or "Device registration rejected or already claimed.",
        )

    # Broadcast on WebSocket Live Feed
    event_payload = {
        "event_type": "DEVICE_ONBOARDED_1000_GRANT",
        "hwid_hash": payload.hwid_hash[:16] + "...",
        "wallet_address": payload.wallet_address,
        "amount": 1000.0,
        "tx_hash": receipt.get("tx_hash"),
        "timestamp": time.time(),
    }
    asyncio.create_task(live_feed.broadcast(event_payload))

    vault_status = master_vault_ledger.get_vault_status()

    return DeviceRegisterResponse(
        success=True,
        status="GRANTED",
        wallet_address=payload.wallet_address,
        grant_amount=1000.0,
        remaining_vault_balance=vault_status.get("current_vault_balance", 0.0),
        tx_hash=receipt.get("tx_hash", "0x0"),
        message=msg,
    )


@router.get(
    "/wallet/balance/{address}",
    response_model=BalanceResponse,
    dependencies=[Depends(rate_limiter_dependency)],
)
async def get_wallet_balance(address: str):
    """Queries live on-chain balance for a PQC wallet address."""
    bal = master_vault_ledger.get_balance(address)
    return BalanceResponse(
        wallet_address=address,
        token_id="9898048483",
        balance=bal,
        shielded=True,
    )


@router.post(
    "/token/transfer",
    response_model=TokenTransferResponse,
    dependencies=[Depends(rate_limiter_dependency)],
)
async def transfer_tokens(payload: TokenTransferRequest):
    """
    Executes a PQC/Ed25519 hybrid verified token transfer between peer wallets.
    """
    # Check sender balance
    sender_bal = master_vault_ledger.get_balance(payload.from_wallet)
    if sender_bal < payload.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient token balance. Available: {sender_bal}, Requested: {payload.amount}",
        )

    # Execute transfer
    success, msg, receipt = master_vault_ledger.transfer_tokens(
        from_address=payload.from_wallet,
        to_address=payload.to_wallet,
        amount=payload.amount,
        signature_proof=payload.hybrid_signature,
    )

    if not success or not receipt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg or "Transfer execution failed.",
        )

    # Broadcast event
    event = {
        "event_type": "PQC_TOKEN_TRANSFER",
        "from": payload.from_wallet,
        "to": payload.to_wallet,
        "amount": payload.amount,
        "tx_hash": receipt.get("tx_hash"),
        "timestamp": time.time(),
    }
    asyncio.create_task(live_feed.broadcast(event))

    return TokenTransferResponse(
        success=True,
        tx_hash=receipt.get("tx_hash", ""),
        from_wallet=payload.from_wallet,
        to_wallet=payload.to_wallet,
        amount=payload.amount,
        fee=0.0,
        timestamp=time.time(),
        receipt=receipt,
    )


@router.post(
    "/vault/unlock",
    response_model=VaultUnlockResponse,
    dependencies=[Depends(rate_limiter_dependency)],
)
async def unlock_deniable_vault(payload: VaultUnlockRequest):
    """
    Mounts plausible deniability vault.
    - Master PIN unlocks True Hidden Volume.
    - Duress PIN (e.g., 9999) unlocks Decoy Volume (minimal balance, zero trace).
    """
    ok, msg, data, vol_type = deniable_vault.unlock_vault(payload.pin)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Invalid PIN code.",
        )

    return VaultUnlockResponse(
        success=True,
        volume_type=vol_type,
        message=msg,
        wallet_data=data,
    )


# ---------------------------------------------------------------------------
# Admin Control & Emergency Governance Routes
# ---------------------------------------------------------------------------

@router.post(
    "/admin/reserve/unlock",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_unlock_reserve(payload: AdminReserveUnlockRequest):
    """
    Administrative manual release from the 51% locked reserve pool.
    """
    success, msg, receipt = admin_control.unlock_reserve_pool(
        auth_token=payload.auth_token,
        amount=payload.amount,
        target_treasury_wallet=payload.target_wallet,
        reason=payload.reason or "Strategic manual reserve release",
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Broadcast event on Live Feed
    event = {
        "event_type": "ADMIN_RESERVE_UNLOCKED",
        "amount": payload.amount,
        "tx_hash": receipt.get("tx_hash"),
        "timestamp": time.time(),
    }
    asyncio.create_task(live_feed.broadcast(event))

    return {
        "success": True,
        "message": msg,
        "receipt": receipt,
    }


@router.post(
    "/admin/reward-rate",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_adjust_reward_rate(payload: AdminRewardRateRequest):
    """
    Administrative adjustment of per-device onboarding incentive reward (e.g. 1000 -> 500).
    """
    success, msg, data = admin_control.adjust_reward_rate(
        auth_token=payload.auth_token,
        new_reward_rate=payload.new_reward_rate,
        reason=payload.reason or "Protocol reward recalibration",
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    event = {
        "event_type": "REWARD_RATE_ADJUSTED",
        "new_reward_rate": payload.new_reward_rate,
        "timestamp": time.time(),
    }
    asyncio.create_task(live_feed.broadcast(event))

    return {
        "success": True,
        "message": msg,
        "data": data,
    }


@router.post(
    "/admin/pause",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_set_global_pause(payload: AdminGlobalPauseRequest):
    """
    Global Emergency Circuit Breaker: Instantly halts/resumes network activity.
    """
    success, msg, data = admin_control.set_global_pause(
        auth_token=payload.auth_token,
        is_paused=payload.is_paused,
        emergency_reason=payload.reason or "Admin protocol pause command",
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    event = {
        "event_type": "GLOBAL_PAUSE_STATE_CHANGED",
        "is_paused": payload.is_paused,
        "status": data.get("status"),
        "timestamp": time.time(),
    }
    asyncio.create_task(live_feed.broadcast(event))

    return {
        "success": True,
        "message": msg,
        "data": data,
    }


@router.post(
    "/admin/wallet/freeze",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_freeze_wallet(payload: AdminWalletFreezeRequest):
    """Freezes or unfreezes a target wallet address."""
    success, msg = admin_control.freeze_wallet(
        auth_token=payload.auth_token,
        wallet_address=payload.wallet_address,
        freeze=payload.freeze,
        reason=payload.reason or "Admin incident intervention",
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )
    return {"success": True, "message": msg}


@router.get(
    "/admin/metrics",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_get_system_metrics():
    """Returns real-time token economics, supply metrics, and security status."""
    metrics = admin_control.get_system_metrics()
    return {"success": True, "metrics": metrics}


@router.get(
    "/admin/actions",
    dependencies=[Depends(rate_limiter_dependency)],
)
async def admin_get_action_history():
    """Returns signed administrative action history log."""
    history = admin_control.get_action_history()
    return {"success": True, "actions": history}


@router.websocket("/token/live-feed")
async def websocket_token_live_feed(websocket: WebSocket):
    """
    Real-time WebSocket stream publishing token transfers, device registrations, and block audits.
    """
    await live_feed.connect(websocket)
    try:
        # Send initial sync payload
        sync_msg = {
            "event_type": "NETWORK_SYNC_STATUS",
            "token_id": "9898048483",
            "active_devices": len(master_vault_ledger.device_registry),
            "vault_status": master_vault_ledger.get_vault_status(),
            "timestamp": time.time(),
        }
        await websocket.send_text(json.dumps(sync_msg))

        while True:
            # Keep-alive loop & inbound ping handler
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "PING":
                    await websocket.send_text(json.dumps({"event_type": "PONG", "time": time.time()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        await live_feed.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WebSocket] Stream error: {e}")
        await live_feed.disconnect(websocket)


# ---------------------------------------------------------------------------
# FastAPI App Factory
# ---------------------------------------------------------------------------
def create_fastapi_token_app() -> FastAPI:
    """Factory creating standalone FastAPI instance with CORS and Router."""
    app = FastAPI(
        title="PQC Token 9898048483 Ledger & Hardware Enclave API",
        description="NIST FIPS 204 ML-DSA, Titan M HWID Enclave & VeraCrypt Deniable Vault API",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


fastapi_token_app = create_fastapi_token_app()
