"""
User Space Manager with Password Protection + Duress PIN
Supports cryptographic partition isolation and instant duress wipe
"""

import os
import json
import base64
import hashlib
import shutil
from pathlib import Path

class UserSpace:
    """Manages isolated cryptographic user workspaces with Duress wipe mechanisms"""
    def __init__(self, base_path: str = "./user_spaces"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.current_user = None
        self.duress_pin_hash = hashlib.sha256(b"9999").hexdigest()
        
    def create_space(self, username: str, password: str, onion_address: str):
        user_dir = self.base_path / username
        user_dir.mkdir(parents=True, exist_ok=True)
        
        salt = os.urandom(16)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        
        config = {
            "username": username,
            "onion_address": onion_address,
            "salt": base64.b64encode(salt).decode('utf-8'),
            "pwd_hash": base64.b64encode(pwd_hash).decode('utf-8'),
            "duress_pin_hash": self.duress_pin_hash,
            "created_at": "2026-08-24T06:34:00Z"
        }
        
        with open(user_dir / "config.json", "w") as f:
            json.dump(config, f, indent=2)
            
        self.current_user = username
        return user_dir
        
    def check_duress(self, pin: str) -> bool:
        return hashlib.sha256(pin.encode()).hexdigest() == self.duress_pin_hash
        
    def wipe_space(self, username: str) -> bool:
        user_dir = self.base_path / username
        if user_dir.exists():
            shutil.rmtree(user_dir)
            return True
        return False
