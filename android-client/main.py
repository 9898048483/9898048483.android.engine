import os
import sys
from typing import Any
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.label import Label
from kivy.clock import Clock
from kivy.utils import platform
from kivy.core.window import Window

from biometric_auth import BiometricAuthenticator
from zero_touch_service import ZeroTouchService
from rasp_manager import RaspManager
from storage_bridge import StorageBridge

class SecureSpaceLayout(BoxLayout):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(orientation='vertical', padding=24, spacing=16, **kwargs)
        Window.clearcolor = (0.05, 0.05, 0.05, 1) # Dark background

        # Initialize security modules
        self.rasp = RaspManager()
        self.rasp.run_security_check() # Immediate RASP check
        
        self.storage = StorageBridge(container_path="vault.bin", size=1024*1024)
        self.authenticator: BiometricAuthenticator = BiometricAuthenticator()
        
        # UI Elements
        self.status_label = Label(text="SYSTEM SECURE", color=(0, 1, 0, 1), font_size=20, size_hint_y=0.1)
        self.tor_status = Label(text="TOR: BOOTSTRAPPING...", color=(1, 1, 0, 1), font_size=14, size_hint_y=0.05)
        
        self.add_widget(self.status_label)
        self.add_widget(self.tor_status)

        self.pin_input = TextInput(
            hint_text='Enter PIN (Decoy/Hidden)',
            password=True,
            multiline=False,
            font_size=20,
            size_hint_y=0.1,
            background_color=(0.15, 0.15, 0.15, 1),
            foreground_color=(1, 1, 1, 1)
        )
        self.add_widget(self.pin_input)

        self.auth_button = Button(
            text="ACCESS VAULT",
            font_size=20,
            background_color=(0.2, 0.5, 0.8, 1),
            size_hint_y=0.1
        )
        self.auth_button.bind(on_press=self.authenticate)
        self.add_widget(self.auth_button)
        
        Clock.schedule_once(self.set_secure_flag, 0)
        
    def set_secure_flag(self, dt: float) -> None:
        if platform == 'android':
            try:
                from jnius import autoclass
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                WindowManager = autoclass('android.view.WindowManager$LayoutParams')
                activity = PythonActivity.mActivity
                def enforce_flags():
                    activity.getWindow().setFlags(WindowManager.FLAG_SECURE, WindowManager.FLAG_SECURE)
                activity.runOnUiThread(enforce_flags)
            except Exception as e:
                print(f"Failed to set FLAG_SECURE: {str(e)}")

    def authenticate(self, instance: Any) -> None:
        pin = self.pin_input.text
        # Simplified routing: Decoy="1234", Hidden="4321"
        if pin in ["1234", "4321"]:
            self.storage.mount_volume(pin, b"fixed_salt", 0)
            self.status_label.text = "VAULT MOUNTED"
            self.status_label.color = (0, 1, 0, 1)
        else:
            self.status_label.text = "AUTH FAILED"
            self.status_label.color = (1, 0, 0, 1)

class SecureSpaceApp(App):
    def build(self) -> SecureSpaceLayout:
        return SecureSpaceLayout()

if __name__ == '__main__':
    SecureSpaceApp().run()
