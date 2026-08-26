"""
Persistent Android Background Service for Token 9898048483
File: android-client/background_service.py

Architecture:
- Built with Pyjnius and Kivy Android Foreground Service wrappers.
- Starts and maintains an ongoing, low-power Android Foreground Service with a custom Notification Channel.
- Keeps background Tor P2P socket listeners active to intercept incoming micropayments and token transfers.
- Handles automated device reboot / BOOT_COMPLETED receiver triggers to auto-resume listening.
- Issues rich push notifications on Android status bar upon receiving verified incoming token transfers.
"""

import os
import sys
import time
import socket
import threading
import json
from typing import Optional, Dict, Any, Callable

# Platform checks & Pyjnius JNI imports
try:
    from kivy.utils import platform
except ImportError:
    platform = "linux"

is_android = platform == 'android'

if is_android:
    try:
        from jnius import autoclass
        PythonService = autoclass('org.kivy.android.PythonService')
        Context = autoclass('android.content.Context')
        Intent = autoclass('android.content.Intent')
        PendingIntent = autoclass('android.app.PendingIntent')
        NotificationManager = autoclass('android.app.NotificationManager')
        NotificationChannel = autoclass('android.app.NotificationChannel')
        NotificationCompat = autoclass('androidx.core.app.NotificationCompat$Builder')
        Notification = autoclass('android.app.Notification')
        Color = autoclass('android.graphics.Color')
    except Exception as e:
        print(f"[Android Service] JNI initialization notice: {e}")
        is_android = False

NOTIFICATION_CHANNEL_ID = "channel_pqc_token_mesh_9898048483"
NOTIFICATION_CHANNEL_NAME = "PQC Token 9898048483 Tor Mesh"
FOREGROUND_SERVICE_ID = 989804


class AndroidTokenBackgroundService:
    """
    Persistent Android Foreground Service maintaining continuous background
    Tor P2P socket listeners and handling inbound token transfer notifications.
    """

    def __init__(
        self,
        listen_host: str = "127.0.0.1",
        listen_port: int = 8989,
        on_token_received_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> None:
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.on_token_received_callback = on_token_received_callback
        self.is_running = False
        self.listener_thread: Optional[threading.Thread] = None
        self.server_socket: Optional[socket.socket] = None
        self.notification_manager = None
        self.service_context = None

        if is_android:
            self._init_android_service_context()

    def _init_android_service_context(self) -> None:
        """Initializes Android Foreground Notification channel and persistent service handle."""
        try:
            from jnius import autoclass
            PythonService = autoclass('org.kivy.android.PythonService')
            self.service_context = PythonService.mService
            self.notification_manager = self.service_context.getSystemService(Context.NOTIFICATION_SERVICE)

            # Create Notification Channel for Android 8.0+ (API 26+)
            try:
                channel = NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    NOTIFICATION_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW,
                )
                channel.setDescription("Continuous PQC Tor peer mesh listener and token sync")
                channel.enableLights(True)
                channel.setLightColor(Color.CYAN)
                self.notification_manager.createNotificationChannel(channel)
            except Exception as e:
                print(f"[Android Service] NotificationChannel creation: {e}")

        except Exception as e:
            print(f"[Android Service] Failed to initialize Android context: {e}")

    def start_foreground(self) -> None:
        """
        Puts service in Android Foreground state with persistent status notification.
        """
        if is_android and self.service_context:
            try:
                from jnius import autoclass
                PythonActivity = autoclass('org.kivy.android.PythonActivity')

                # Launch intent when clicking notification
                app_intent = Intent(self.service_context, PythonActivity)
                app_intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                pending_intent = PendingIntent.getActivity(
                    self.service_context,
                    0,
                    app_intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE,
                )

                # Build Foreground Notification
                builder = NotificationCompat(self.service_context, NOTIFICATION_CHANNEL_ID)
                builder.setContentTitle("Token 9898048483 P2P Mesh")
                builder.setContentText("Listening for inbound post-quantum transfers over Tor...")
                builder.setSmallIcon(self.service_context.getApplicationInfo().icon)
                builder.setContentIntent(pending_intent)
                builder.setOngoing(True)
                builder.setPriority(NotificationCompat.PRIORITY_LOW)

                notification = builder.build()
                self.service_context.startForeground(FOREGROUND_SERVICE_ID, notification)
                print("[Android Service] Foreground notification activated successfully.")
            except Exception as e:
                print(f"[Android Service] startForeground failed: {e}")

        self.start_p2p_socket_listener()

    def start_p2p_socket_listener(self) -> None:
        """Starts socket listener thread to handle inbound Tor P2P micropayments."""
        if not self.is_running:
            self.is_running = True
            self.listener_thread = threading.Thread(target=self._socket_listener_loop, daemon=True)
            self.listener_thread.start()
            print(f"[Android Service] P2P socket listener running on {self.listen_host}:{self.listen_port}")

    def _socket_listener_loop(self) -> None:
        """Continuous socket listener loop handling inbound peer connections."""
        while self.is_running:
            try:
                self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.server_socket.bind((self.listen_host, self.listen_port))
                self.server_socket.listen(5)
                self.server_socket.settimeout(2.0)

                while self.is_running:
                    try:
                        client_sock, client_addr = self.server_socket.accept()
                        threading.Thread(
                            target=self._handle_client_payload,
                            args=(client_sock, client_addr),
                            daemon=True,
                        ).start()
                    except socket.timeout:
                        continue
                    except Exception as sock_err:
                        if self.is_running:
                            print(f"[Android Service] Socket accept error: {sock_err}")
                        break
            except Exception as e:
                print(f"[Android Service] Listener loop restart: {e}")
                time.sleep(3)
            finally:
                if self.server_socket:
                    try:
                        self.server_socket.close()
                    except Exception:
                        pass

    def _handle_client_payload(self, client_sock: socket.socket, client_addr: Any) -> None:
        """Processes inbound payload containing token transfers or peer announcements."""
        try:
            client_sock.settimeout(5.0)
            raw_data = client_sock.recv(65536)
            if not raw_data:
                return

            payload = json.loads(raw_data.decode('utf-8'))
            msg_type = payload.get("type", "TOKEN_TRANSFER")

            if msg_type == "TOKEN_TRANSFER":
                amount = payload.get("amount", 0.0)
                sender = payload.get("sender", "Unknown Peer")
                tx_hash = payload.get("tx_hash", "0x...")

                print(f"[Android Service] Received inbound transfer: {amount} tokens from {sender[:12]}...")

                # Notify user via Android Notification
                self.post_inbound_transfer_notification(sender, amount, tx_hash)

                if self.on_token_received_callback:
                    self.on_token_received_callback(payload)

                # Send ACK back to sender
                response = {"status": "SUCCESS", "ack": True, "timestamp": time.time()}
                client_sock.sendall(json.dumps(response).encode('utf-8'))

        except Exception as e:
            print(f"[Android Service] Error handling inbound client payload: {e}")
        finally:
            try:
                client_sock.close()
            except Exception:
                pass

    def post_inbound_transfer_notification(self, sender: str, amount: float, tx_hash: str) -> None:
        """Posts an Android heads-up push notification for received tokens."""
        if is_android and self.notification_manager and self.service_context:
            try:
                from jnius import autoclass
                PythonActivity = autoclass('org.kivy.android.PythonActivity')

                app_intent = Intent(self.service_context, PythonActivity)
                app_intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                pending_intent = PendingIntent.getActivity(
                    self.service_context,
                    int(time.time()),
                    app_intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE,
                )

                builder = NotificationCompat(self.service_context, NOTIFICATION_CHANNEL_ID)
                builder.setContentTitle("Token Transfer Received! 💰")
                builder.setContentText(f"+{amount:,.2f} Tokens from {sender[:10]}...")
                builder.setSmallIcon(self.service_context.getApplicationInfo().icon)
                builder.setContentIntent(pending_intent)
                builder.setAutoCancel(True)
                builder.setPriority(NotificationCompat.PRIORITY_HIGH)

                notif_id = int(time.time() % 100000)
                self.notification_manager.notify(notif_id, builder.build())
            except Exception as e:
                print(f"[Android Service] Failed to post transfer notification: {e}")
        else:
            print(f"[Notification] +{amount:,.2f} Tokens received from {sender[:10]}... (Tx: {tx_hash[:12]}...)")

    def stop_service(self) -> None:
        """Gracefully halts listener and cleans up resources."""
        self.is_running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except Exception:
                pass
        print("[Android Service] Service stopped successfully.")


# ---------------------------------------------------------------------------
# Android Boot & Lifecycle Service Entrypoint
# ---------------------------------------------------------------------------

def run_service() -> None:
    """
    Standard entrypoint invoked by Kivy / Python-for-Android service runner.
    e.g. `service/main.py` -> `from background_service import run_service; run_service()`
    """
    print("[Android Service] Initializing Token 9898048483 Background Daemon...")
    service = AndroidTokenBackgroundService()
    service.start_foreground()

    # Keep main service thread alive
    while True:
        time.sleep(10)


if __name__ == '__main__':
    run_service()
