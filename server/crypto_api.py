import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import os
import hashlib
import secrets

# Ensure the crypto modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from crypto.pqc_mldsa import MLDSA87Signer, HybridPQCSigner
from crypto.falcon_bridge_signer import Falcon1024CrossChainBridgeEngine
from crypto.zk_privacy_mixer import ZKPrivacyMixerEngine

app = FastAPI(title="9898048483 Quantum Crypto API")

try:
    mldsa_signer = MLDSA87Signer()
except Exception as e:
    mldsa_signer = None
    print(f"Warning: Could not initialize MLDSA87Signer natively ({e})")

try:
    falcon_engine = Falcon1024CrossChainBridgeEngine()
except Exception as e:
    falcon_engine = None
    print(f"Warning: Could not initialize Falcon1024CrossChainBridgeEngine natively ({e})")

try:
    zk_mixer = ZKPrivacyMixerEngine()
except Exception as e:
    zk_mixer = None
    print(f"Warning: Could not initialize ZKPrivacyMixerEngine natively ({e})")

class SignMLDSARequest(BaseModel):
    message: str

class SignFalconRequest(BaseModel):
    sender: str
    destination_chain: str
    amount: float
    destination_address: str

class ZKNullifierRequest(BaseModel):
    token_symbol: str
    denomination: float
    sender: str
    recipient: str

@app.post("/sign/mldsa")
def sign_mldsa(req: SignMLDSARequest):
    try:
        if mldsa_signer is not None:
            try:
                pk, sk = mldsa_signer.keypair()
                msg_bytes = req.message.encode('utf-8')
                signature = mldsa_signer.sign(msg_bytes, sk)
                return {
                    "success": True,
                    "algorithm": "ML-DSA-87",
                    "message": req.message,
                    "public_key_hex": pk.hex()[:64] + "...", 
                    "signature_hex": signature.hex()
                }
            except Exception as e:
                print(f"Native MLDSA failed during sign: {e}")
                
        # Fallback for demonstration if liboqs is missing
        fake_sig = hashlib.sha512((req.message + "MLDSA-SIMULATED").encode()).hexdigest() * 10
        fake_pk = hashlib.sha512(b"PUBKEY").hexdigest()
        return {
            "success": True,
            "algorithm": "ML-DSA-87 (Simulated)",
            "message": req.message,
            "public_key_hex": fake_pk,
            "signature_hex": fake_sig
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sign/falcon")
def sign_falcon(req: SignFalconRequest):
    try:
        if falcon_engine is not None:
            tx_id = falcon_engine.initiate_cross_chain_lock(
                sender=req.sender,
                destination_chain=req.destination_chain,
                amount=req.amount,
                destination_address=req.destination_address
            )
            return {
                "success": True,
                "algorithm": "Falcon-1024",
                "transaction_id": tx_id
            }
        
        # Fallback
        tx_id = "cross_chain_" + hashlib.sha256(req.sender.encode()).hexdigest()[:16]
        return {
            "success": True,
            "algorithm": "Falcon-1024 (Simulated)",
            "transaction_id": tx_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/zk/generate-nullifier")
def generate_nullifier(req: ZKNullifierRequest):
    try:
        if zk_mixer is not None:
            deposit_note = zk_mixer.deposit_tokens_into_pool(
                token_symbol=req.token_symbol,
                denomination=req.denomination
            )
            return {
                "success": True,
                "nullifier_hash": hashlib.sha256(deposit_note.nullifier.encode()).hexdigest(),
                "commitment": deposit_note.commitment,
                "secret": deposit_note.secret,
                "leaf_index": deposit_note.leaf_index,
                "note_string": deposit_note.export_note_string()
            }
        
        # Fallback
        nullifier = secrets.token_hex(32)
        secret = secrets.token_hex(32)
        commitment = "0x" + hashlib.sha256(f"COMMITMENT:{nullifier}:{secret}".encode()).hexdigest()
        
        return {
            "success": True,
            "nullifier_hash": hashlib.sha256(nullifier.encode()).hexdigest(),
            "commitment": commitment,
            "secret": secret,
            "leaf_index": 0,
            "note_string": f"zk9898-{req.token_symbol.lower()}-{int(req.denomination)}-{nullifier}-{secret} (Simulated)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
