import os
import sys
import ctypes
import logging
from typing import Optional, List

try:
    from jnius import autoclass
    JNIUS_AVAILABLE = True
except (ImportError, KeyError):
    JNIUS_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RASPManager")


class RaspManager:
    """
    Bridge to the Native C++ RASP Memory Zeroization & Anti-Tamper Burn Engine.
    Executes anti-hooking, debugger detection, and RAM key zeroization before KeyStore or PQC initialization.
    """

    TAMPER_SIGNATURES = [
        "frida", "xposed", "edxposed", "lsposed", "magisk", "zygisk",
        "substrate", "cydia", "gdb", "lldb"
    ]

    def __init__(self, native_lib_path: Optional[str] = None):
        self.native_lib = None
        self.java_rasp = None
        self._registered_buffers: List[ctypes.Array] = []

        if JNIUS_AVAILABLE:
            try:
                self.java_rasp = autoclass('com.pqctoken.wallet.RASPManager')()
            except Exception as e:
                logger.info(f"[RASP] Java JNI binding bypassed: {e}")

        # Attempt direct ctypes loading of compiled NDK .so
        paths_to_try = [
            native_lib_path,
            "librasp_burn_hook.so",
            "/data/data/com.pqctoken.wallet/lib/librasp_burn_hook.so",
            "./native/librasp_burn_hook.so",
        ]
        for path in filter(None, paths_to_try):
            if os.path.exists(path):
                try:
                    self.native_lib = ctypes.CDLL(path)
                    logger.info(f"[RASP] Native C++ RASP library loaded from {path}")
                    break
                except Exception as e:
                    logger.warning(f"[RASP] Failed loading native library at {path}: {e}")

    def run_security_check(self) -> bool:
        """
        Executes multi-layer defensive security audit.
        Zeroizes RAM and triggers process termination if tampering is detected.
        """
        # 1. Native JNI check
        if self.java_rasp:
            try:
                return bool(self.java_rasp.performInstantSecurityAudit())
            except Exception as e:
                logger.warning(f"[RASP] JNI audit call exception: {e}")

        # 2. Direct Python-level /proc/self verification
        if self._inspect_proc_maps_tampering() or self._inspect_proc_status_debugger():
            self.emergency_zeroize_and_burn("Proc filesystem detected active reverse engineering instrumentation")
            return False

        logger.info("[RASP] Security and anti-tamper audit verified clean.")
        return True

    def _inspect_proc_maps_tampering(self) -> bool:
        """Scans /proc/self/maps for injected hooks."""
        if not os.path.exists("/proc/self/maps"):
            return False

        try:
            with open("/proc/self/maps", "r") as f:
                for line in f:
                    lower_line = line.lower()
                    for sig in self.TAMPER_SIGNATURES:
                        if sig in lower_line:
                            logger.error(f"[RASP] Detected tampering signature in memory maps: {sig}")
                            return True
        except Exception:
            pass
        return False

    def _inspect_proc_status_debugger(self) -> bool:
        """Checks /proc/self/status for TracerPid."""
        if not os.path.exists("/proc/self/status"):
            return False

        try:
            with open("/proc/self/status", "r") as f:
                for line in f:
                    if line.startswith("TracerPid:"):
                        tracer_pid = int(line.split(":")[1].strip())
                        if tracer_pid > 0:
                            logger.error(f"[RASP] Debugger attached (TracerPid={tracer_pid})")
                            return True
        except Exception:
            pass
        return False

    def register_secure_key_buffer(self, buffer_obj: ctypes.Array) -> None:
        """Registers in-memory key buffer for emergency zeroization."""
        self._registered_buffers.append(buffer_obj)
        if self.native_lib and hasattr(self.native_lib, "Java_com_pqctoken_wallet_RASPManager_registerSecureBuffer"):
            try:
                addr = ctypes.addressof(buffer_obj)
                length = ctypes.sizeof(buffer_obj)
                self.native_lib.Java_com_pqctoken_wallet_RASPManager_registerSecureBuffer(None, None, addr, length)
            except Exception as e:
                logger.warning(f"[RASP] Native buffer registration error: {e}")

    def emergency_zeroize_and_burn(self, reason: str = "Tamper Detection") -> None:
        """Multi-pass memory zeroization of all cryptographic keys followed by process exit."""
        logger.critical(f"[RASP BURN TRIGGERED] Reason: {reason}")

        # Multi-pass RAM overwrite on all registered Python/ctypes buffers
        for buf in self._registered_buffers:
            try:
                addr = ctypes.addressof(buf)
                size = ctypes.sizeof(buf)
                # Overwrite passes: 0xFF, 0xAA, 0x55, 0x00
                for pattern in (0xFF, 0xAA, 0x55, 0x00):
                    ctypes.memset(addr, pattern, size)
            except Exception as e:
                logger.error(f"[RASP] Buffer zeroization error: {e}")

        self._registered_buffers.clear()

        # Call native emergency burn if available
        if self.native_lib and hasattr(self.native_lib, "emergency_zeroize_and_burn"):
            try:
                self.native_lib.emergency_zeroize_and_burn(reason.encode('utf-8'))
            except Exception:
                pass

        # Immediate exit
        sys.exit(0)
