import hashlib
import os
import secrets

# ==============================================================================
# AI SECURE SPACE - ZERO-KNOWLEDGE PROOF (ZKP) IDENTITY VERIFIER (PROMPT 18)
# Role: Applied Cryptography Scientist
# Requirements: Schnorr Non-Interactive Zero-Knowledge Proof (NIZK) using Fiat-Shamir
# ==============================================================================

# RFC 3526: 2048-bit MODP Group (Group 14)
# Safe prime p = 2q + 1
P_HEX = (
    "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1"
    "29024E088A67CC74020BBEA63B139B22514A08798E3404DD"
    "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245"
    "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
    "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D"
    "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F"
    "83655D23DCA3AD961C62F356208552BB9ED529077096966D"
    "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
    "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9"
    "DE2BCBF6955817183995497CEA956AE515D2261898FA0510"
    "15728E5A8AACAA68FFFFFFFFFFFFFFFF"
)

P = int(P_HEX, 16)
Q = (P - 1) // 2  # Order of the subgroup of quadratic residues
G = 2             # Generator for the subgroup

class ZKPSchnorrAuth:
    """
    Implements a Non-Interactive Zero-Knowledge Proof (NIZK) of Knowledge 
    of a Discrete Logarithm using the Schnorr protocol with the Fiat-Shamir heuristic.
    Allows proving knowledge of a password (secret scalar) without transmitting it.
    """

    @staticmethod
    def _hash_to_scalar(*args: bytes) -> int:
        """Cryptographic hash of inputs to generate the Fiat-Shamir challenge."""
        h = hashlib.sha256()
        for arg in args:
            h.update(arg)
        return int.from_bytes(h.digest(), byteorder='big')

    @staticmethod
    def derive_keys(password: str, salt: bytes = b'ZKP_AUTH_SALT_V1') -> tuple:
        """
        Derives a secret key (x) and public key (Y) from a password.
        x = Hash(password || salt) mod Q
        Y = G^x mod P
        """
        # Strengthen password using PBKDF2 before using as scalar
        x_bytes = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000, 32)
        x = int.from_bytes(x_bytes, byteorder='big') % Q
        Y = pow(G, x, P)
        return x, Y

    @staticmethod
    def generate_proof(secret_x: int, public_y: int) -> dict:
        """
        Generates a NIZK proof of knowledge of secret_x.
        Returns the commitment (t) and response (s).
        """
        # 1. Generate random nonce r in [1, Q-1]
        r = secrets.randbelow(Q - 1) + 1
        
        # 2. Compute commitment t = G^r mod P
        t = pow(G, r, P)
        
        # 3. Compute Fiat-Shamir challenge c = Hash(G, Y, t)
        c = ZKPSchnorrAuth._hash_to_scalar(
            str(G).encode(), 
            str(public_y).encode(), 
            str(t).encode()
        )
        
        # 4. Compute response s = r + c * secret_x (mod Q)
        s = (r + c * secret_x) % Q
        
        return {
            "t": t,
            "s": s
        }

    @staticmethod
    def verify_proof(public_y: int, proof: dict) -> bool:
        """
        Verifies the ZKP proof against the public key Y.
        Returns True if the prover knows the secret, False otherwise.
        """
        t = proof.get("t")
        s = proof.get("s")
        
        if t is None or s is None:
            return False
            
        if t <= 0 or t >= P or s <= 0 or s >= Q:
            return False

        # 1. Recompute challenge c = Hash(G, Y, t)
        c = ZKPSchnorrAuth._hash_to_scalar(
            str(G).encode(), 
            str(public_y).encode(), 
            str(t).encode()
        )
        
        # 2. Verify G^s == t * Y^c (mod P)
        # We calculate: t * Y^c (mod P)
        y_c = pow(public_y, c, P)
        rhs = (t * y_c) % P
        
        # Left hand side: G^s (mod P)
        lhs = pow(G, s, P)
        
        # 3. Constant-time comparison mitigations aren't strictly necessary for public values,
        # but the equality check proves knowledge of x.
        return lhs == rhs

if __name__ == "__main__":
    import time
    
    print("===========================================================================")
    print("  AI SECURE SPACE: ZERO-KNOWLEDGE PROOF (ZKP) IDENTITY VERIFIER (Prompt 18)")
    print("===========================================================================")
    
    password = "SuperSecretPassword123!"
    print(f"[*] Original Password (Secret)  : {password}")
    
    # 1. Registration phase
    t0 = time.perf_counter()
    secret_x, public_y = ZKPSchnorrAuth.derive_keys(password)
    t1 = time.perf_counter()
    print(f"[*] Derived ZKP Public Key (Y)  : {hex(public_y)[:64]}... [{((t1-t0)*1000):.2f} ms]")
    
    # 2. Proof Generation (Client side)
    t2 = time.perf_counter()
    proof = ZKPSchnorrAuth.generate_proof(secret_x, public_y)
    t3 = time.perf_counter()
    print(f"[*] Generated Schnorr ZKP Proof : t={hex(proof['t'])[:16]}..., s={hex(proof['s'])[:16]}... [{((t3-t2)*1000):.2f} ms]")
    
    # 3. Proof Verification (Server/IPC side)
    t4 = time.perf_counter()
    is_valid = ZKPSchnorrAuth.verify_proof(public_y, proof)
    t5 = time.perf_counter()
    print(f"[*] Verifying ZKP Proof         : {'VALID (Identity Confirmed)' if is_valid else 'INVALID'}")
    print(f"[*] Verification Latency        : {((t5-t4)*1000):.2f} ms")
    
    # 4. Impersonation Attack Test
    print("\n[!] Simulating Impersonation Attack with Fake Proof...")
    fake_proof = ZKPSchnorrAuth.generate_proof(secret_x + 1, public_y)
    is_fake_valid = ZKPSchnorrAuth.verify_proof(public_y, fake_proof)
    print(f"[*] Fake Proof Verification     : {'VALID' if is_fake_valid else 'INVALID (MitM/Impersonation Blocked)'}")
    
    print("===========================================================================")
