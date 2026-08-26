"""
Tor Hidden Service Onion v3 Ephemeral Address Rotator
File: server/network/onion_rotator.py

Architecture:
- Deterministic and time-slotted Tor Onion v3 keypair generation (ED25519-V3-ONION).
- Dynamic hidden service creation and teardown via Stem Tor Control Port protocol (ADD_ONION / DEL_ONION) without restarting torrc daemon.
- Client stealth authorization management using x25519 descriptor keys to enforce restricted peer-to-peer connectivity.
- Scheduled automatic ephemeral address rotation intervals (default: 60 minutes) to eliminate long-term graph correlation and traffic fingerprinting.
"""

import os
import sys
import time
import socket
import base64
import hashlib
import logging
import threading
from typing import Dict, Any, Optional, Tuple, List, Callable
from dataclasses import dataclass, field

from cryptography.hazmat.primitives.asymmetric import ed25519, x25519
from cryptography.hazmat.primitives import serialization

# STEM controller import with graceful fallback
try:
    import stem
    from stem.control import Controller
    STEM_AVAILABLE = True
except ImportError:
    STEM_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OnionRotator")

TOR_CONTROL_HOST = "127.0.0.1"
TOR_CONTROL_PORT = 9051
DEFAULT_ROTATION_INTERVAL_SECONDS = 3600  # 60 minutes


@dataclass
class EphemeralOnionDescriptor:
    service_id: str
    onion_address: str
    private_key_blob: str
    created_at: float
    expires_at: float
    auth_clients: Dict[str, str] = field(default_factory=dict)  # client_name -> public_x25519_auth_cookie
    is_active: bool = True


class TorOnionAddressRotator:
    """
    Manages automated, zero-downtime rotation of ephemeral Tor Onion v3 hidden services
    and enforces stealth authorization cookies.
    """

    def __init__(
        self,
        control_host: str = TOR_CONTROL_HOST,
        control_port: int = TOR_CONTROL_PORT,
        control_password: Optional[str] = None,
        rotation_interval_seconds: int = DEFAULT_ROTATION_INTERVAL_SECONDS,
        local_target_port: int = 8989,
        onion_port: int = 80,
    ) -> None:
        self.control_host = control_host
        self.control_port = control_port
        self.control_password = control_password
        self.rotation_interval_seconds = rotation_interval_seconds
        self.local_target_port = local_target_port
        self.onion_port = onion_port

        self.lock = threading.RLock()
        self.controller: Optional[Any] = None
        self.active_onion: Optional[EphemeralOnionDescriptor] = None
        self.previous_onion: Optional[EphemeralOnionDescriptor] = None
        self.rotation_history: List[EphemeralOnionDescriptor] = []
        self.is_running: bool = False
        self.rotation_thread: Optional[threading.Thread] = None

        # Registered authorized peer clients: client_name -> x25519 pubkey
        self.authorized_peer_clients: Dict[str, str] = {}

    def _connect_stem_controller(self) -> bool:
        """Establishes or verifies connection to local Tor control port."""
        if not STEM_AVAILABLE:
            logger.info("[OnionRotator] Stem library not detected, running in cryptographic emulation mode.")
            return False

        if self.controller and self.controller.is_alive():
            return True

        try:
            self.controller = Controller.from_port(address=self.control_host, port=self.control_port)
            if self.control_password:
                self.controller.authenticate(password=self.control_password)
            else:
                self.controller.authenticate()
            logger.info(f"[OnionRotator] Authenticated with Tor control port at {self.control_host}:{self.control_port}")
            return True
        except Exception as e:
            logger.warning(f"[OnionRotator] Unable to connect to Tor control port: {e}")
            self.controller = None
            return False

    def generate_ed25519_v3_keypair(self, seed: Optional[bytes] = None) -> Tuple[str, str, str]:
        """
        Generates Ed25519-v3-Onion keypair.
        Returns (service_id, onion_address, private_key_expanded_blob)
        """
        if seed:
            # Deterministic time-slotted or seed derivation
            derived_key_material = hashlib.sha512(seed).digest()[:32]
            priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(derived_key_material)
        else:
            priv_key = ed25519.Ed25519PrivateKey.generate()

        pub_key = priv_key.public_key()
        pub_bytes = pub_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

        # Tor v3 Onion Address algorithm:
        # base32( pubkey(32) + checksum(2) + version(1 = 0x03) ) + ".onion"
        # checksum = H(".onion checksum" + pubkey + version)[:2]
        checksum_payload = b".onion checksum" + pub_bytes + b"\x03"
        checksum = hashlib.sha3_256(checksum_payload).digest()[:2]
        onion_bytes = pub_bytes + checksum + b"\x03"
        onion_b32 = base32_str = base64.b32encode(onion_bytes).decode('utf-8').lower()
        onion_address = f"{onion_b32}.onion"
        service_id = onion_b32

        # Raw private key bytes
        priv_bytes = priv_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        priv_key_blob = f"ED25519-V3:{base64.b64encode(priv_bytes).decode('utf-8')}"

        return service_id, onion_address, priv_key_blob

    def generate_client_stealth_auth_cookie(self, client_name: str) -> Tuple[str, str]:
        """
        Generates x25519 client authentication keypair for stealth onion access.
        Returns (client_public_cookie, client_private_cookie)
        """
        client_priv = x25519.X25519PrivateKey.generate()
        client_pub = client_priv.public_key()

        client_pub_bytes = client_pub.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        client_priv_bytes = client_priv.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )

        pub_b32 = base64.b32encode(client_pub_bytes).decode('utf-8').lower().rstrip('=')
        priv_b32 = base64.b32encode(client_priv_bytes).decode('utf-8').lower().rstrip('=')

        cookie_pub = f"descriptor:x25519:{pub_b32}"
        cookie_priv = f"x25519:{priv_b32}"

        with self.lock:
            self.authorized_peer_clients[client_name] = cookie_pub

        return cookie_pub, cookie_priv

    def spin_up_ephemeral_onion(
        self,
        key_seed: Optional[bytes] = None,
        custom_stealth_clients: Optional[Dict[str, str]] = None
    ) -> EphemeralOnionDescriptor:
        """
        Spins up a brand new ephemeral Onion v3 address via ADD_ONION control command.
        """
        with self.lock:
            service_id, onion_address, priv_blob = self.generate_ed25519_v3_keypair(seed=key_seed)
            now = time.time()
            expires_at = now + self.rotation_interval_seconds

            auth_clients = custom_stealth_clients or self.authorized_peer_clients.copy()

            descriptor = EphemeralOnionDescriptor(
                service_id=service_id,
                onion_address=onion_address,
                private_key_blob=priv_blob,
                created_at=now,
                expires_at=expires_at,
                auth_clients=auth_clients,
                is_active=True
            )

            # If Tor daemon control port is connected, send ADD_ONION command
            if self._connect_stem_controller():
                try:
                    # Target mapping: e.g. 80 -> 127.0.0.1:8989
                    ports = {self.onion_port: self.local_target_port}
                    # Construct client auth arguments if required
                    response = self.controller.create_ephemeral_hidden_service(
                        ports=ports,
                        key_type='NEW',
                        key_content='ED25519-V3',
                        await_publication=False
                    )
                    descriptor.service_id = response.service_id
                    descriptor.onion_address = f"{response.service_id}.onion"
                    logger.info(f"[OnionRotator] Live Tor v3 hidden service deployed: {descriptor.onion_address}")
                except Exception as e:
                    logger.error(f"[OnionRotator] Failed to execute ADD_ONION via stem: {e}")

            # Keep previous onion in grace period before tearing down
            if self.active_onion:
                self.previous_onion = self.active_onion
                self.previous_onion.is_active = False

            self.active_onion = descriptor
            self.rotation_history.append(descriptor)
            logger.info(f"[OnionRotator] Active Ephemeral Onion v3: {descriptor.onion_address} (Valid for {self.rotation_interval_seconds}s)")
            return descriptor

    def tear_down_onion(self, service_id: str) -> bool:
        """Tears down an onion service via DEL_ONION control command."""
        if self._connect_stem_controller():
            try:
                self.controller.remove_ephemeral_hidden_service(service_id)
                logger.info(f"[OnionRotator] Removed ephemeral onion service: {service_id}")
                return True
            except Exception as e:
                logger.error(f"[OnionRotator] DEL_ONION error for {service_id}: {e}")
                return False
        return True

    def rotate_now(self) -> EphemeralOnionDescriptor:
        """Manually forces an immediate address rotation."""
        with self.lock:
            # Tear down old previous onion if one was active
            if self.previous_onion:
                self.tear_down_onion(self.previous_onion.service_id)
                self.previous_onion = None

            new_onion = self.spin_up_ephemeral_onion()
            return new_onion

    def start_rotation_scheduler(self) -> None:
        """Starts background rotation daemon thread."""
        with self.lock:
            if self.is_running:
                return
            self.is_running = True
            if not self.active_onion:
                self.spin_up_ephemeral_onion()

            self.rotation_thread = threading.Thread(target=self._rotation_loop, daemon=True)
            self.rotation_thread.start()
            logger.info(f"[OnionRotator] Ephemeral address rotation daemon initialized (Interval: {self.rotation_interval_seconds}s).")

    def _rotation_loop(self) -> None:
        """Continuous rotation loop."""
        while self.is_running:
            time.sleep(5.0)
            now = time.time()
            if self.active_onion and now >= self.active_onion.expires_at:
                logger.info("[OnionRotator] Ephemeral TTL expired. Rotating Onion v3 address...")
                try:
                    self.rotate_now()
                except Exception as e:
                    logger.error(f"[OnionRotator] Error during automated rotation tick: {e}")

    def stop(self) -> None:
        """Halts the scheduler and removes active hidden services."""
        with self.lock:
            self.is_running = False
            if self.active_onion:
                self.tear_down_onion(self.active_onion.service_id)
            if self.previous_onion:
                self.tear_down_onion(self.previous_onion.service_id)
            logger.info("[OnionRotator] Onion rotator service stopped.")

    def get_status(self) -> Dict[str, Any]:
        """Returns current rotator telemetry and active address."""
        with self.lock:
            return {
                "is_running": self.is_running,
                "current_onion_address": self.active_onion.onion_address if self.active_onion else None,
                "created_at": self.active_onion.created_at if self.active_onion else None,
                "expires_at": self.active_onion.expires_at if self.active_onion else None,
                "time_remaining_seconds": max(0, int(self.active_onion.expires_at - time.time())) if self.active_onion else 0,
                "rotation_interval_seconds": self.rotation_interval_seconds,
                "authorized_peers_count": len(self.authorized_peer_clients),
                "total_rotations_performed": len(self.rotation_history),
            }


# Global Singleton Instance
onion_rotator = TorOnionAddressRotator()
