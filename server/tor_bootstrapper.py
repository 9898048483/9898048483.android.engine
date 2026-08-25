import os
import subprocess
import time
import tempfile
import pathlib
from pathlib import Path
from stem.control import Controller
from stem.process import launch_tor_with_config

class TorBootstrapper:
    def __init__(self, tor_binary_path: str, data_dir: str = None):
        self.tor_binary = Path(tor_binary_path)
        self.data_dir = Path(data_dir or tempfile.mkdtemp())
        self.tor_process = None
        self.onion_dir = self.data_dir / "hidden_service"
        self.socks_port = 9050
        self.control_port = 9051

    def _generate_torrc(self):
        """Generates a transient, isolated torrc configuration."""
        torrc_path = self.data_dir / "torrc"
        torrc_content = f"""
DataDirectory {self.data_dir}
SocksPort {self.socks_port}
ControlPort {self.control_port}
CookieAuthentication 1
HiddenServiceDir {self.onion_dir}
HiddenServicePort 80 127.0.0.1:8080
"""
        with open(torrc_path, "w") as f:
            f.write(torrc_content)
        return str(torrc_path)

    def start(self):
        """Bootstraps the local Tor SOCKS5 proxy and Hidden Service."""
        torrc_path = self._generate_torrc()
        print(f"Starting Tor with config: {torrc_path}")
        
        # Use stem to launch Tor reliably
        self.tor_process = launch_tor_with_config(
            config={'Config': torrc_path},
            tor_cmd=str(self.tor_binary),
            take_ownership=True
        )
        print("Tor process launched.")

    def get_onion_address(self):
        """Reads the .onion address from the hidden service directory."""
        hostname_file = self.onion_dir / "hostname"
        while not hostname_file.exists():
            time.sleep(1)
        return hostname_file.read_text().strip()

    def health_check(self):
        """Verifies the Tor control port is accessible and healthy."""
        try:
            with Controller.from_port(port=self.control_port) as controller:
                controller.authenticate()
                return controller.is_alive()
        except Exception as e:
            print(f"Health check failed: {e}")
            return False

    def stop(self):
        """Performs clean process termination."""
        if self.tor_process:
            self.tor_process.terminate()
            self.tor_process.wait()
            print("Tor process terminated.")

    def expose_transport_channel(self, pqc_engine):
        """Placeholder for exposing transport to PQC engine."""
        # Implementation would setup SOCKS5 proxy using pysocks
        # and route traffic through the PQC_Hybrid_Engine
        print(f"Transport channel routed through PQC engine at {self.get_onion_address()}")
        pass
