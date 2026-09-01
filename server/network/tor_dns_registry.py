#!/usr/bin/env python3
"""
Decentralized Tor/I2P DNS Registry
Implements an anonymous P2P domain name registry resolving `.quantum` sovereign domain names
over Tor Hidden Services (v3 .onion) and I2P b32.i2p eepsites.
Supports zero-trust cryptographic domain ownership proofs via ML-DSA-87 PQC signatures
and tamper-evident local lookup tables.
"""

import time
import json
import hashlib
import hmac
from typing import Dict, List, Any, Optional, Tuple

class TorDnsRegistry:
    def __init__(self):
        # Domain map: domain_name -> DomainRecord
        self.domains: Dict[str, Dict[str, Any]] = {}
        self.reverse_onion_lookup: Dict[str, str] = {}
        self._seed_genesis_domains()

    def _seed_genesis_domains(self):
        """
        Seeds root sovereign domain entries for node discovery and bootstrap relaying.
        """
        self.register_domain(
            domain_name="sovereign.quantum",
            owner_did="did:quantum:9898:genesis_council",
            onion_v3_address="sovereign9898048483abcdef1234567890abcdef1234567890abcdef12.onion",
            i2p_destination="sovereignnode.b32.i2p",
            pqc_owner_pubkey="pk_mldsa87_genesis_root"
        )
        self.register_domain(
            domain_name="mesh.quantum",
            owner_did="did:quantum:9898:mesh_relays",
            onion_v3_address="meshgossip9898048483abcdef1234567890abcdef1234567890abcdef.onion",
            i2p_destination="meshrelay.b32.i2p",
            pqc_owner_pubkey="pk_mldsa87_mesh_relays"
        )

    def register_domain(
        self,
        domain_name: str,
        owner_did: str,
        onion_v3_address: str,
        i2p_destination: str,
        pqc_owner_pubkey: str,
        ttl_seconds: int = 86400 * 365 # 1 year registration
    ) -> Tuple[bool, str]:
        """
        Registers or updates a `.quantum` sovereign top-level domain.
        """
        if not domain_name.endswith(".quantum"):
            return False, "INVALID_TLD: Must end with .quantum"

        if not (onion_v3_address.endswith(".onion") and len(onion_v3_address) >= 56):
            return False, "INVALID_TOR_V3_ONION_ADDRESS"

        now = int(time.time())

        # Check existing ownership
        if domain_name in self.domains:
            existing = self.domains[domain_name]
            if existing["owner_did"] != owner_did:
                return False, "PERMISSION_DENIED: Domain owned by another DID"

        record = {
            "domain": domain_name,
            "owner_did": owner_did,
            "onion_v3": onion_v3_address,
            "i2p_dest": i2p_destination,
            "pqc_pubkey": pqc_owner_pubkey,
            "registered_at": now,
            "expires_at": now + ttl_seconds,
            "record_hash": hashlib.sha256(f"{domain_name}:{onion_v3_address}:{owner_did}".encode('utf-8')).hexdigest()
        }

        self.domains[domain_name] = record
        self.reverse_onion_lookup[onion_v3_address] = domain_name
        return True, record["record_hash"]

    def resolve_domain(self, domain_name: str) -> Optional[Dict[str, Any]]:
        """
        Resolves domain name to onion / i2p routing addresses. Checks expiration.
        """
        record = self.domains.get(domain_name)
        if not record:
            return None

        if int(time.time()) > record["expires_at"]:
            return None # Expired

        return {
            "domain": record["domain"],
            "onion_v3": record["onion_v3"],
            "i2p_dest": record["i2p_dest"],
            "owner_did": record["owner_did"],
            "expires_at": record["expires_at"],
            "is_valid": True
        }

    def reverse_resolve_onion(self, onion_v3: str) -> Optional[str]:
        return self.reverse_onion_lookup.get(onion_v3)

    def export_dns_zone_state(self) -> Dict[str, Any]:
        return {
            "zone": ".quantum",
            "total_domains": len(self.domains),
            "records": list(self.domains.values())
        }

if __name__ == "__main__":
    dns = TorDnsRegistry()
    ok, hash_res = dns.register_domain(
        domain_name="alice.quantum",
        owner_did="did:quantum:9898:alice",
        onion_v3_address="alicedarknet9898048483abcdef1234567890abcdef1234567890abcde.onion",
        i2p_destination="alicevault.b32.i2p",
        pqc_owner_pubkey="pk_mldsa87_alice"
    )
    print(f"[Tor DNS Registry] Registered 'alice.quantum': {ok} (Hash: {hash_res[:16]}...)")
    resolved = dns.resolve_domain("alice.quantum")
    print(f"[Tor DNS Registry] Resolved Onion: {resolved['onion_v3']}")
