import threading
import time
import socket
import requests
from typing import Optional

class ZeroTouchService:
    """
    Low-power background daemon that manages key lifecycle, handles background 
    context generation, and routes secure telemetry through local Tor SOCKS5 proxies.
    """
    def __init__(self) -> None:
        self.is_running: bool = False
        self.daemon_thread: Optional[threading.Thread] = None
        self.tor_proxy_host: str = "127.0.0.1"
        self.tor_proxy_port: int = 9050
        
        # Simulating the hardware master key memory buffer
        self.hardware_master_key: Optional[bytearray] = bytearray(b"HARDWARE_BACKED_MASTER_KEY_ACTIVE")

    def start_daemon(self) -> None:
        if not self.is_running:
            self.is_running = True
            self.daemon_thread = threading.Thread(target=self._background_loop, daemon=True)
            self.daemon_thread.start()

    def _background_loop(self) -> None:
        while self.is_running:
            try:
                time.sleep(15)
                if self.is_running:
                    self._route_tor_telemetry()
            except Exception as e:
                print(f"Daemon error: {str(e)}")

    def _route_tor_telemetry(self) -> None:
        try:
            session = requests.Session()
            session.proxies = {
                'http': f'socks5h://{self.tor_proxy_host}:{self.tor_proxy_port}',
                'https': f'socks5h://{self.tor_proxy_host}:{self.tor_proxy_port}'
            }
            # Silent telemetry tick simulating Tor hidden service ping
            session.get(f"http://{self.tor_proxy_host}:{self.tor_proxy_port}", timeout=2)
        except (requests.RequestException, socket.error):
            # Fails gracefully if local tor daemon is not actually running
            pass

    def panic_wipe(self) -> None:
        """
        Triggers emergency duress wiping. Safely and explicitly zeroizes 
        cryptographic keys directly from the bytearray memory buffer.
        """
        self.is_running = False
        
        if self.hardware_master_key is not None:
            # Explicit bzero logic / Python memory overwrite
            for i in range(len(self.hardware_master_key)):
                self.hardware_master_key[i] = 0
            self.hardware_master_key = None
            
        if self.daemon_thread and self.daemon_thread.is_alive():
            self.daemon_thread.join(timeout=2.0)
