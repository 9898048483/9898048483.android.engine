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

from biometric_auth import BiometricAuthenticator
from zero_touch_service import ZeroTouchService

class SecureSpaceLayout(BoxLayout):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(orientation='vertical', padding=20, spacing=15, **kwargs)
        self.service: ZeroTouchService = ZeroTouchService()
        self.authenticator: BiometricAuthenticator = BiometricAuthenticator()

        self.status_label: Label = Label(text="ENCLAVE LOCKED", color=(1, 0, 0, 1), font_size=28, bold=True)
        self.add_widget(self.status_label)

        self.pin_input: TextInput = TextInput(
            hint_text='Enter Access PIN (or 9999 for Duress)', 
            password=True, 
            multiline=False, 
            font_size=24, 
            size_hint_y=0.2
        )
        self.add_widget(self.pin_input)

        self.auth_button: Button = Button(
            text="AUTHENTICATE", 
            font_size=24, 
            background_color=(0.1, 0.6, 1, 1), 
            size_hint_y=0.2
        )
        self.auth_button.bind(on_press=self.authenticate)
        self.add_widget(self.auth_button)

        self.duress_button: Button = Button(
            text="DURESS WIPE", 
            font_size=24, 
            background_color=(1, 0, 0, 1), 
            size_hint_y=0.2
        )
        self.duress_button.bind(on_press=self.duress_wipe)
        self.add_widget(self.duress_button)
        
        self.sync_button: Button = Button(
            text="SYNC TO DRIVE", 
            font_size=24, 
            background_color=(0.5, 0.5, 0.5, 1), 
            size_hint_y=0.2
        )
        self.sync_button.bind(on_press=self.sync_to_drive)
        self.add_widget(self.sync_button)
        
        # Schedule FLAG_SECURE enforcement on the main UI thread
        Clock.schedule_once(self.set_secure_flag, 0)
        self.service.start_daemon()

    def sync_to_drive(self, instance: Any) -> None:
        self.status_label.text = "SYNCING TO DRIVE..."
        # NOTE: You MUST place a valid 'client_secrets.json' file 
        # in the /android-client/ directory.
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
            from drive_backup import run_backup
            
            # This will attempt to open a browser for OAuth
            flow = InstalledAppFlow.from_client_secrets_file(
                'client_secrets.json',
                scopes=['https://www.googleapis.com/auth/drive.file']
            )
            creds = flow.run_local_server(port=0)
            
            # Run backup in a background thread
            import threading
            threading.Thread(target=run_backup, args=(creds.to_json(),)).start()
            
            self.status_label.text = "SYNC IN PROGRESS"
        except Exception as e:
            self.status_label.text = f"SYNC FAILED: {str(e)}"
            print(f"Sync error: {str(e)}")

    def set_secure_flag(self, dt: float) -> None:
        if platform == 'android':
            try:
                from jnius import autoclass
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                WindowManager = autoclass('android.view.WindowManager$LayoutParams')
                activity = PythonActivity.mActivity
                
                # Run on Android UI Thread to prevent threading crashes
                def enforce_flags():
                    activity.getWindow().setFlags(
                        WindowManager.FLAG_SECURE, 
                        WindowManager.FLAG_SECURE
                    )
                activity.runOnUiThread(enforce_flags)
            except Exception as e:
                print(f"Failed to set FLAG_SECURE: {str(e)}")

    def authenticate(self, instance: Any) -> None:
        pin: str = self.pin_input.text
        if pin == "9999":
            self.duress_wipe(instance)
            return
        
        # Try Biometric KeyStore Attestation
        if self.authenticator.authenticate_face_or_fingerprint():
            self.status_label.text = "ENCLAVE UNLOCKED (BIOMETRIC)"
            self.status_label.color = (0, 1, 0, 1)
        # Fallback to standard PIN
        elif pin == "1234":
            self.status_label.text = "ENCLAVE UNLOCKED (PIN)"
            self.status_label.color = (0, 1, 0, 1)
        else:
            self.status_label.text = "AUTH FAILED"
            self.status_label.color = (1, 0, 0, 1)

    def duress_wipe(self, instance: Any) -> None:
        self.service.panic_wipe()
        self.status_label.text = "DURESS WIPE EXECUTED"
        self.status_label.color = (1, 0, 0, 1)
        self.pin_input.text = ""

class SecureSpaceApp(App):
    def build(self) -> SecureSpaceLayout:
        return SecureSpaceLayout()

if __name__ == '__main__':
    SecureSpaceApp().run()
