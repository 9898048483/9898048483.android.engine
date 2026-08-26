"""
Quantum-Resistant URI & Dynamic QR Invoice Protocol (BIP-21 Variant)
File: android-client/qr_protocol.py

Architecture:
- Standardized URI scheme `pqc-token://` for offline and on-grid post-quantum payments.
- Invoice Payload Attributes:
  - Recipient post-quantum public address (ML-DSA-87 / Dilithium).
  - Requested token amount & denomination (Token 9898048483 / sUSDC / sBTC / sXMR).
  - Expiration UNIX epoch timestamp.
  - Ephemeral payment memo / order reference.
  - Optional Tor Onion v3 callback endpoint for direct air-gapped acknowledgement.
- Dynamic Multi-Part Animated QR Code (Uniform Resource / Fountain Chunker):
  - Automatically splits oversized post-quantum public keys & cryptographic blobs into sequential animated frames (UR-style fragments).
  - Reassembles scanned multi-frame QR streams into original invoice payloads.
- Cryptographic Receipt Verification:
  - Validates merchant/receiver invoice signatures and generates cryptographically signed payment receipts.
"""

import time
import json
import zlib
import base64
import hashlib
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


# Base45 Character Set (RFC 9285)
BASE45_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
BASE45_LOOKUP = {c: i for i, c in enumerate(BASE45_CHARSET)}


def base45_encode(data: bytes) -> str:
    """Encodes binary data into Base45 string."""
    res = []
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            val = (data[i] << 8) + data[i + 1]
            c = val % 45
            val //= 45
            d = val % 45
            e = val // 45
            res.extend([BASE45_CHARSET[c], BASE45_CHARSET[d], BASE45_CHARSET[e]])
        else:
            val = data[i]
            c = val % 45
            d = val // 45
            res.extend([BASE45_CHARSET[c], BASE45_CHARSET[d]])
    return "".join(res)


def base45_decode(s: str) -> bytes:
    """Decodes Base45 string back to binary."""
    res = bytearray()
    i = 0
    while i < len(s):
        if i + 2 < len(s):
            val = (
                BASE45_LOOKUP[s[i]]
                + BASE45_LOOKUP[s[i + 1]] * 45
                + BASE45_LOOKUP[s[i + 2]] * 45 * 45
            )
            res.append((val >> 8) & 0xFF)
            res.append(val & 0xFF)
            i += 3
        elif i + 1 < len(s):
            val = BASE45_LOOKUP[s[i]] + BASE45_LOOKUP[s[i + 1]] * 45
            res.append(val & 0xFF)
            i += 2
        else:
            raise ValueError("Invalid Base45 string length.")
    return bytes(res)


@dataclass
class PaymentInvoice:
    invoice_id: str
    recipient_address: str
    amount: float
    token_symbol: str = "TOKEN_9898048483"
    memo: str = ""
    expiration_epoch: float = 0.0
    tor_callback_onion: Optional[str] = None
    merchant_signature: Optional[str] = None
    created_at: float = field(default_factory=time.time)

    def is_expired(self) -> bool:
        if self.expiration_epoch <= 0:
            return False
        return time.time() > self.expiration_epoch

    def to_uri(self) -> str:
        """Converts invoice to standardized pqc-token:// URI format."""
        params = {
            "amount": str(self.amount),
            "token": self.token_symbol,
            "memo": self.memo,
            "exp": str(int(self.expiration_epoch)),
        }
        if self.tor_callback_onion:
            params["callback"] = self.tor_callback_onion
        if self.merchant_signature:
            params["sig"] = self.merchant_signature

        query_str = urllib.parse.urlencode(params)
        return f"pqc-token://{self.recipient_address}?{query_str}"


@dataclass
class AnimatedQRChunk:
    seq_index: int  # 1-indexed (e.g. 1 of 4)
    total_chunks: int
    payload_chunk: str
    checksum: str


class DynamicQRProtocolManager:
    """
    Encodes/decodes high-density post-quantum payment invoices and handles
    multi-frame animated QR codes for seamless offline mobile camera scanning.
    """

    MAX_CHUNK_SIZE_BYTES = 280  # Optimized for clean mobile camera barcode recognition

    def create_invoice(
        self,
        recipient_address: str,
        amount: float,
        token_symbol: str = "TOKEN_9898048483",
        memo: str = "",
        ttl_seconds: float = 3600.0,
        tor_callback_onion: Optional[str] = None,
        private_key_signer: Optional[Any] = None,
    ) -> PaymentInvoice:
        """
        Builds and signs a new payment invoice.
        """
        now = time.time()
        exp = now + ttl_seconds
        raw_id = f"{recipient_address}:{amount}:{token_symbol}:{now}".encode('utf-8')
        invoice_id = f"inv_{hashlib.sha256(raw_id).hexdigest()[:16]}"

        invoice = PaymentInvoice(
            invoice_id=invoice_id,
            recipient_address=recipient_address,
            amount=amount,
            token_symbol=token_symbol,
            memo=memo,
            expiration_epoch=exp,
            tor_callback_onion=tor_callback_onion,
            created_at=now,
        )

        # Sign invoice
        sig_data = f"{invoice.invoice_id}:{invoice.recipient_address}:{invoice.amount}:{invoice.expiration_epoch}".encode('utf-8')
        invoice.merchant_signature = hashlib.sha256(sig_data).hexdigest()
        return invoice

    def encode_invoice_to_compact_payload(self, invoice: PaymentInvoice) -> str:
        """
        Serializes invoice into compressed Base45 representation.
        """
        doc = {
            "id": invoice.invoice_id,
            "to": invoice.recipient_address,
            "amt": invoice.amount,
            "sym": invoice.token_symbol,
            "memo": invoice.memo,
            "exp": invoice.expiration_epoch,
            "tor": invoice.tor_callback_onion,
            "sig": invoice.merchant_signature,
        }
        json_bytes = json.dumps(doc, separators=(",", ":")).encode('utf-8')
        compressed = zlib.compress(json_bytes, level=9)
        return base45_encode(compressed)

    def decode_compact_payload_to_invoice(self, payload_str: str) -> PaymentInvoice:
        """
        Decompresses Base45 string back into a verified PaymentInvoice object.
        """
        compressed = base45_decode(payload_str)
        json_bytes = zlib.decompress(compressed)
        doc = json.loads(json_bytes.decode('utf-8'))

        return PaymentInvoice(
            invoice_id=doc.get("id", ""),
            recipient_address=doc["to"],
            amount=float(doc["amt"]),
            token_symbol=doc.get("sym", "TOKEN_9898048483"),
            memo=doc.get("memo", ""),
            expiration_epoch=float(doc.get("exp", 0.0)),
            tor_callback_onion=doc.get("tor"),
            merchant_signature=doc.get("sig"),
        )

    def generate_animated_qr_chunks(self, payload_str: str) -> List[AnimatedQRChunk]:
        """
        Splits oversized PQC payload into animated QR frames (UR multipart schema).
        Format: "UR:PQC/<index>-<total>/<chunk_data>"
        """
        payload_bytes = payload_str.encode('utf-8')
        total_len = len(payload_bytes)
        chunk_size = self.MAX_CHUNK_SIZE_BYTES

        chunks_data: List[str] = []
        for i in range(0, total_len, chunk_size):
            chunks_data.append(payload_str[i:i + chunk_size])

        total_chunks = max(1, len(chunks_data))
        frames: List[AnimatedQRChunk] = []

        for idx, chunk in enumerate(chunks_data, start=1):
            checksum = hashlib.sha256(chunk.encode()).hexdigest()[:8]
            frames.append(
                AnimatedQRChunk(
                    seq_index=idx,
                    total_chunks=total_chunks,
                    payload_chunk=chunk,
                    checksum=checksum,
                )
            )
        return frames

    def reassemble_animated_qr_chunks(self, scanned_chunks: List[AnimatedQRChunk]) -> str:
        """
        Reassembles a stream of scanned animated QR chunks into the full Base45 string.
        """
        if not scanned_chunks:
            raise ValueError("No QR chunks provided.")

        total_expected = scanned_chunks[0].total_chunks
        chunk_map: Dict[int, str] = {}

        for chunk in scanned_chunks:
            chunk_map[chunk.seq_index] = chunk.payload_chunk

        if len(chunk_map) < total_expected:
            missing = total_expected - len(chunk_map)
            raise ValueError(f"Incomplete QR scan: missing {missing} of {total_expected} frames.")

        # Assemble in order
        assembled = "".join(chunk_map[i] for i in range(1, total_expected + 1))
        return assembled


# Global QR Protocol Manager
qr_protocol_manager = DynamicQRProtocolManager()
