<div align="center">

# 🛡️ AI-Enhanced Secure Space (ai-onion-secure-space) 🧅

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](#)
[![Target SDK](https://img.shields.io/badge/Target_SDK-34-orange.svg?style=flat-square)](#)
[![Security](https://img.shields.io/badge/Security-PQC_ML--KEM--1024-purple.svg?style=flat-square)](#)
[![Anonymity](https://img.shields.io/badge/Anonymity-Tor_v3-black.svg?style=flat-square)](#)
[![NIST](https://img.shields.io/badge/Compliance-NIST_SP_800--63B_AAL3-darkgreen.svg?style=flat-square)](#)

*A sovereign, post-quantum, and serverless zero-trust security framework for mobile and desktop.*

</div>

## 📖 Overview

This AI-Enhanced Android Engine is a serverless, zero-trust security framework designed to protect sensitive data and enable anonymous peer-to-peer communication directly on Android devices. It combines hardware-backed biometrics, post-quantum cryptography, and local AI behavioral modeling to eliminate central servers and reliance on third-party cloud infrastructure.

---

## ⚙️ How It Works

The engine functions through four interconnected layers executing on the local device:

### 1. Zero-Touch Biometric Access Control
The mobile client utilizes Android's hardware-backed KeyStore and biometric APIs (Fingerprint, Iris, and Google ML Kit Face Detection) to authenticate the operator seamlessly. Successful biometric verification yields access to an isolated, password-protected local user space partition.

### 2. Context-Aware AI Hybrid Encryption
When encrypting data, an AI engine captures real-time contextual vectors (typing/swipe patterns, timestamp, and location hashes). It combines these behavioral inputs via HKDF to generate dynamic encryption salts. Data is then secured using a hybrid post-quantum cipher combining classical X25519 (ECDH) key exchange with NIST FIPS 203 ML-KEM-1024 (Kyber) and AES-256-GCM.

### 3. Anonymous Tor v3 Ephemeral Transport
Network traffic operates over a embedded Tor daemon running locally (via Termux/Python). The engine auto-generates ephemeral `.onion` hidden service addresses for direct peer-to-peer data transfers, bypassing central servers entirely. Connections are visually verified against Man-in-the-Middle (MitM) attacks using a 6-word Short Authentication String (SAS).

### 4. Storage Partitioning & Emergency Defense
Files inside the user space are encrypted at rest using PBKDF2 key-stretching and Fernet/AES algorithms. If an unauthorized party forces unlock access, entering a pre-configured Duress PIN triggers an immediate anti-forensic cryptographic wipe that zeroizes keys in memory and detaches storage directories.

---

## 🎯 What It Is Used For

| Core Application | Practical Use Case |
| :--- | :--- |
| **Metadata-Resistant P2P Communication** | Direct, serverless text and payload exchange over Tor where no central party tracks IP addresses, timestamps, or contact lists. |
| **Post-Quantum Vault Storage** | Long-term defense of sensitive local files against "harvest now, decrypt later" attacks by quantum computers. |
| **High-Risk Field Defense** | Secure operations where physical device seizure is a risk—the Duress PIN guarantees immediate data destruction. |
| **Automated Mobile Workflows** | Low-overhead background daemons (ZeroTouchService) that manage secure channel connections without user intervention. |

---

## 🏗️ System Architecture

```text
+--------------------------------------------------------------------+
|                  AI-Enhanced Secure Space Ecosystem                |
+--------------------------------------------------------------------+
|                                                                    |
|  [ 📱 Android Kivy 0-Touch Client (android-client/) ]              |
|   ├─ UI: Kivy Framework (FLAG_SECURE Window Protection)            |
|   ├─ Auth: ML Kit Face Detection & StrongBox TEE Hardware Keys     |
|   └─ Daemon: ZeroTouchService (Low-Power Background Monitor)       |
|                                                                    |
+-------------------------------+------------------------------------+
                                |
                                | (Local REST API / IPC)
                                v
+-------------------------------+------------------------------------+
|  [ ⚙️ FastAPI Python Backend Engine (server/) ]                      |
|   ├─ Cryptography: ML-KEM-1024 + X25519 Hybrid (FIPS 203)          |
|   ├─ AI Metrics: HKDF Derivation via Behavioral Keystroke Dynamics |
|   ├─ Partition: User Space File Manager & Duress Wiping            |
|   └─ Router: OnionService P2P Handler                              |
+-------------------------------+------------------------------------+
                                |
                                | (SOCKS5 Proxy - 127.0.0.1:9050)
                                v
+-------------------------------+------------------------------------+
|  [ 🧅 Embedded Tor v3 Daemon ]                                     |
|   ├─ Ephemeral .onion Hidden Service Generation                    |
|   └─ 6-Word SAS (Short Auth String) MitM Verification              |
+-------------------------------+------------------------------------+
                                |
                                v
                       [ 🌐 Global Tor Mesh ]
```

---

## 📂 Directory Layout

```text
ai-onion-secure-space/
├── android-client/               # Mobile GUI & Hardware Integration Layer
│   ├── main.py                   # Kivy UI entry point with FLAG_SECURE bindings
│   ├── biometric_auth.py         # Hardware Keystore & Biometric bindings
│   ├── zero_touch_service.py     # Background daemon for key lifecycle & Tor SOCKS proxy
│   └── buildozer.spec            # Android packaging specs (SDK 34, NDK, ML Kit)
├── server/                       # Core FastAPI & Cryptographic Backend
│   ├── app.py                    # FastAPI application & REST routing
│   ├── ai_crypto_engine.py       # PQC Hybrid Engine (ML-KEM-1024 + X25519)
│   ├── onion_service.py          # Tor v3 hidden service manager
│   └── user_space.py             # Encrypted file storage & Duress PIN wiping logic
├── shared/                       # Shared Data & Utilities
│   └── utils.py                  # Common logging, formatting, and helper funcs
├── tests/                        # E2E Distributed Systems Tests
│   └── test_full_engine.py       # Asyncio Unittests validating the entire lifecycle
├── build_apk_colab.sh            # Automated CI script for Google Colab APK generation
├── setup_and_push_github.sh      # Automated Git Init & GitHub Push bootstrapping
└── README.md                     # This documentation file
```

---

## 🚀 Quickstart & Deployment Guide

### 1. Local Desktop Setup (Linux / macOS / Windows)
```bash
# Clone the repository
git clone https://github.com/USER/REPO.git && cd ai-onion-secure-space

# Set up Virtual Environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Dependencies
pip install -r server/requirements.txt

# Start local Tor daemon (Requires tor installed on system: apt install tor / brew install tor)
tor &

# Launch FastAPI Backend
uvicorn server.app:app --host 127.0.0.1 --port 8000
```

### 2. Android Termux Setup
For rapid CLI testing directly on an Android device:
```bash
pkg install root-repo x11-repo
pkg install python tor build-essential openssl
pip install cryptography fastapi uvicorn
tor &
uvicorn server.app:app --host 127.0.0.1 --port 8000
```

### 3. Compiling Android APK (Google Colab / Buildozer)
We support fully automated, cloud-based APK compilation using Google Colab.
1. Upload the repository to Google Drive/Colab.
2. Execute the included shell script:
```bash
!bash build_apk_colab.sh
```
*The output `.apk` will be available in `android-client/bin/`.*

### 4. Dockerized Server Deployment
```bash
docker build -t ai-secure-space .
docker run -d --name secure-node -p 8000:8000 ai-secure-space
```

---

## 🔌 FastAPI REST API & P2P Protocol

The local backend exposes a secure REST API for the Kivy frontend to interact with. 

### `POST /api/auth/0touch`
**Description:** Authenticates the user via biometric confirmation and unlocks the cryptographic enclave.
```json
// Request
{
  "biometric_token": "ey...hw_backed_token",
  "behavioral_context": {"typing_speed": 420, "gyro_variance": 0.04}
}
// Response
{
  "status": "unlocked",
  "risk_score": 0.02,
  "enclave_active": true
}
```

### `POST /api/encrypt`
**Description:** Encrypts data utilizing the PQC Hybrid cipher and active AI contextual salts.
```json
// Request
{
  "plaintext": "Sensitive field report.",
  "recipient_pubkey": "b64_encoded_kyber_key..."
}
// Response
{
  "ciphertext": "v1_pqc_enc_...",
  "hkdf_salt": "..."
}
```

### `POST /api/decrypt`
**Description:** Decrypts inbound P2P payloads. Triggers auto-wipe if a Duress PIN is detected in the intercept payload.
```json
// Request
{
  "ciphertext": "v1_pqc_enc_..."
}
// Response
{
  "plaintext": "Sensitive field report."
}
```

### `GET /api/onion/address`
**Description:** Retrieves the active, ephemeral Tor v3 hidden service address for P2P routing.
```json
// Response
{
  "onion_address": "vww6ybal4bd7szmgncyru9...onion",
  "sas_6_word": ["apple", "bravo", "delta", "echo", "foxtrot", "golf"]
}
```

---

## 🛡️ Security Threat Model & Cryptographic Audit Matrix

| Threat Vector | Description | Primary Mitigation Technology |
| :--- | :--- | :--- |
| **Quantum Key Breaking** | Attackers storing intercepted traffic to decrypt with future QCs. | **ML-KEM-1024 (Kyber)**: NIST FIPS 203 standardized post-quantum encapsulation. |
| **Physical Device Seizure** | Hostile forces capturing the unlocked device. | **Duress PIN Emergency Zeroization**: Explicit memory overwriting (`explicit_bzero`) & unmounting. |
| **Man-in-the-Middle (MitM)** | Rogue Tor exit nodes or relay spoofing. | **SAS 6-Word Code**: Out-of-band voice/visual verification of the Diffie-Hellman key exchange. |
| **RAM / Cold-Boot Forensics** | Extracting keys directly from volatile memory. | **JNI/Python Memory Scrubbing**: Immediate zeroization of bytearrays after cipher block processing. |
| **Screen Scraping / Malware** | Malicious background apps recording the screen. | **`FLAG_SECURE`**: OS-level rendering block for screen recording & recent app caching. |

---

## 🔄 CI/CD Build Pipelines & Cross-Platform Support

This repository is equipped with robust **GitHub Actions** workflows (`.github/workflows/`) that automatically build, test, and release binaries for all major operating systems.

1. **Android APK Builder** (`build-android.yml`): Compiles the Kivy UI via Buildozer, embedding the Tor daemon and ML Kit SDKs.
2. **Linux Executable** (`build-linux.yml`): Bundles the FastAPI server and Python PQC libraries into a standalone ELF binary via PyInstaller.
3. **Windows Executable** (`build-windows.yml`): Cross-compiles a self-contained `.exe` for Windows environments.
4. **macOS Executable** (`build-macos.yml`): Builds an Apple Silicon / Intel compatible `.app` bundle.
5. **Unified Release** (`release.yml`): Automatically aggregates artifacts, computes SHA256 checksums, and publishes official GitHub Releases on tag creation (`v*.*.*`).

---

## 🤝 Contributing, Compliance, & License

### Operational Security (OpSec) for Pull Requests
* **No Telemetry**: Do not introduce analytics, crashlytics, or tracking dependencies.
* **FIPS Compliance**: Ensure any cryptographic modifications strictly adhere to NIST SP 800-63B AAL3 guidelines and utilize FIPS-approved curves.
* **Memory Safety**: Any C/C++ JNI additions *must* implement `secure_bzero()` for buffer sanitization.

### Bug Bounty & Vulnerability Disclosure
If you discover a critical vulnerability (e.g., cryptographic bypass, memory leak, or deanonymization vector), please **DO NOT** open a public issue. Reach out to the maintainers securely. 

### License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.

> *"Privacy is necessary for an open society in the electronic age. Privacy is not secrecy."*
> — A Cypherpunk's Manifesto

</div>
