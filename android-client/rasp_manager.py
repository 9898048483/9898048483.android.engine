from jnius import autoclass

class RaspManager:
    """
    Kivy-side bridge to the Native RASP engine.
    Must be called at app startup, before KeyStore or Crypto initialization.
    """
    
    def __init__(self):
        # Dynamically load the JNI-wrapped RASP library
        # Ensure the library is named librasp_engine.so (or similar)
        # and bundled in the APK.
        self.rasp = autoclass('ai.securespace.securespaceclient.RaspManager')()

    def run_security_check(self):
        """Executes native anti-instrumentation checks."""
        try:
            self.rasp.initRasp()
            print("RASP checks passed.")
        except Exception as e:
            print(f"RASP check failed: {e}")
            # The native side calls exit(0) on failure,
            # so we should ideally not reach here if a violation occurs.
