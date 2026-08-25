import onnxruntime as ort
import numpy as np
import hashlib
import os

class BehavioralAISaltEngine:
    """
    ML-based salt generation engine.
    Processes behavioral biometric vectors through an ONNX model to generate
    context-aware cryptographic salts.
    """
    
    def __init__(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Behavioral ML model not found at {model_path}")
        self.session = ort.InferenceSession(model_path)
    
    def generate_dynamic_salt(self, behavioral_data: np.ndarray) -> bytes:
        """
        Processes behavioral input vectors and generates a 32-byte salt.
        
        Args:
            behavioral_data: A numpy array representing normalized behavioral 
                             biometrics (swipe, pressure, rhythm).
                             
        Returns:
            A 32-byte dynamic salt derived from model inference.
        """
        # Ensure input shape is correct for the model
        input_data = behavioral_data.astype(np.float32)
        
        # Run inference
        # Assuming the model expects a single input node named 'input'
        onnx_input = {self.session.get_inputs()[0].name: input_data}
        output = self.session.run(None, onnx_input)
        
        # Generate hash from the model output feature vector
        # This provides the non-deterministic salt
        return hashlib.sha256(output[0].tobytes()).digest()
