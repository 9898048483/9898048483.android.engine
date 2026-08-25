import numpy as np
import qrcode
import base64
import io
import time
from scipy.io import wavfile

class AirGapExchange:
    """
    Implements air-gapped Out-of-Band (OOB) key exchange for ML-KEM-1024 public keys.
    Utilizes animated QR sequences and ultrasonic audio chirps (18kHz–20kHz).
    """

    def __init__(self, key_data: bytes):
        self.key_data = key_data
        self.chunk_size = 64  # Bytes per QR chunk for density management
        self.chunks = self._chunk_data()

    def _chunk_data(self):
        """Chunks binary data for animated QR sequence transmission."""
        data_b64 = base64.b64encode(self.key_data).decode('utf-8')
        return [data_b64[i:i+self.chunk_size] for i in range(0, len(data_b64), self.chunk_size)]

    def generate_qr_sequence(self):
        """Generates QR codes for each chunk, intended for rapid cycling."""
        qr_images = []
        for i, chunk in enumerate(self.chunks):
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            # Add index for reassembly
            payload = f"{i}/{len(self.chunks)}:{chunk}"
            qr.add_data(payload)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            qr_images.append(img)
        return qr_images

    def synthesize_ultrasound(self, frequency=19000, sample_rate=44100, duration=0.05):
        """
        Synthesizes a high-frequency ultrasonic chirp for OOB signaling.
        18kHz–20kHz is typically audible to some adults/pets, 19kHz is a good baseline.
        """
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        # Generate sine wave at target frequency
        wave = 0.5 * np.sin(2 * np.pi * frequency * t)
        # Apply windowing to prevent clicking
        window = np.hanning(len(wave))
        return (wave * window).astype(np.float32)

    def transmit_oob(self):
        """Orchestrates the OOB transmission sequence."""
        print("Starting air-gapped OOB transmission...")
        # 1. Trigger QR cycling logic in the Kivy UI layer
        # 2. Trigger audio hardware to play synthesized chirps
        pass
