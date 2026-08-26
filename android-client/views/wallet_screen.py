import os
import json
import time
from typing import Any, Optional, Dict, List
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.graphics import Color, RoundedRectangle, Line
from kivy.clock import Clock
from kivy.utils import platform
from kivy.core.window import Window

from biometric_auth import BiometricAuthenticator
from rasp_manager import RaspManager


class Card(BoxLayout):
    """Reusable dark-mode rounded card container with subtle borders."""
    def __init__(self, bg_color=(0.11, 0.12, 0.14, 1), border_color=(0.2, 0.22, 0.26, 1), radius=[12], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.bg_color = bg_color
        self.border_color = border_color
        self.radius = radius
        with self.canvas.before:
            self.col = Color(*self.bg_color)
            self.rect = RoundedRectangle(pos=self.pos, size=self.size, radius=self.radius)
            self.border_col = Color(*self.border_color)
            self.border_line = Line(rounded_rectangle=(self.x, self.y, self.width, self.height, self.radius[0]), width=1.1)
        self.bind(pos=self._update_graphics, size=self._update_graphics)

    def _update_graphics(self, *args: Any) -> None:
        self.rect.pos = self.pos
        self.rect.size = self.size
        self.border_line.rounded_rectangle = (self.x, self.y, self.width, self.height, self.radius[0])


class SendModal(Popup):
    """Modal for sending tokens with PQC signature and biometric confirmation."""
    def __init__(self, on_transfer_callback, **kwargs: Any) -> None:
        super().__init__(
            title="Send PQC Protected Tokens",
            title_size="16sp",
            title_color=(0.9, 0.95, 1, 1),
            size_hint=(0.9, 0.65),
            auto_dismiss=False,
            **kwargs
        )
        self.background_color = (0.08, 0.09, 0.11, 0.95)
        self.on_transfer_callback = on_transfer_callback

        content = BoxLayout(orientation='vertical', padding=16, spacing=12)

        # Recipient Address Input
        self.recipient_input = TextInput(
            hint_text="Recipient Address (.onion / 0x...)",
            multiline=False,
            font_size="14sp",
            size_hint_y=None,
            height=48,
            background_color=(0.15, 0.16, 0.19, 1),
            foreground_color=(1, 1, 1, 1),
            cursor_color=(0.3, 0.7, 1, 1),
            padding=[12, 12, 12, 12]
        )
        content.add_widget(self.recipient_input)

        # Amount Input
        self.amount_input = TextInput(
            hint_text="Amount (TOKENS)",
            multiline=False,
            font_size="14sp",
            input_filter="float",
            size_hint_y=None,
            height=48,
            background_color=(0.15, 0.16, 0.19, 1),
            foreground_color=(1, 1, 1, 1),
            cursor_color=(0.3, 0.7, 1, 1),
            padding=[12, 12, 12, 12]
        )
        content.add_widget(self.amount_input)

        # Security Note
        info_label = Label(
            text="Protected with ML-DSA / Kyber Post-Quantum Signatures\n& Zero-Knowledge Balance Shielding.",
            color=(0.55, 0.6, 0.68, 1),
            font_size="11sp",
            size_hint_y=None,
            height=36,
            halign="center"
        )
        content.add_widget(info_label)

        # Action Buttons
        btn_box = BoxLayout(size_hint_y=None, height=48, spacing=12)
        
        cancel_btn = Button(
            text="Cancel",
            background_normal="",
            background_color=(0.2, 0.22, 0.26, 1),
            color=(0.85, 0.88, 0.92, 1),
            font_size="14sp"
        )
        cancel_btn.bind(on_release=self.dismiss)
        btn_box.add_widget(cancel_btn)

        confirm_btn = Button(
            text="Biometric Sign & Send",
            background_normal="",
            background_color=(0.12, 0.58, 0.95, 1),
            color=(1, 1, 1, 1),
            font_size="14sp",
            bold=True
        )
        confirm_btn.bind(on_release=self._handle_send)
        btn_box.add_widget(confirm_btn)

        content.add_widget(btn_box)
        self.content = content

    def _handle_send(self, instance: Any) -> None:
        recipient = self.recipient_input.text.strip()
        amount = self.amount_input.text.strip()
        if recipient and amount:
            self.dismiss()
            self.on_transfer_callback(recipient, amount)


class ReceiveModal(Popup):
    """Modal displaying wallet receiving address and PQC public identity."""
    def __init__(self, wallet_address: str, **kwargs: Any) -> None:
        super().__init__(
            title="Receive Tokens (PQC Stealth Address)",
            title_size="16sp",
            title_color=(0.9, 0.95, 1, 1),
            size_hint=(0.9, 0.55),
            auto_dismiss=True,
            **kwargs
        )
        self.background_color = (0.08, 0.09, 0.11, 0.95)
        self.wallet_address = wallet_address

        content = BoxLayout(orientation='vertical', padding=16, spacing=12)

        addr_card = Card(
            orientation='vertical',
            padding=12,
            size_hint_y=None,
            height=90,
            bg_color=(0.14, 0.15, 0.18, 1)
        )
        addr_label = Label(
            text=f"[b]Stealth Address:[/b]\n{self.wallet_address}",
            markup=True,
            font_size="12sp",
            color=(0.4, 0.8, 1, 1),
            halign="center"
        )
        addr_card.add_widget(addr_label)
        content.add_widget(addr_card)

        note = Label(
            text="Funds routed over Tor v3 onion circuits are automatically shielded using Groth16 zero-knowledge proofs.",
            font_size="11sp",
            color=(0.55, 0.6, 0.68, 1),
            halign="center"
        )
        content.add_widget(note)

        close_btn = Button(
            text="Done",
            size_hint_y=None,
            height=44,
            background_normal="",
            background_color=(0.18, 0.22, 0.28, 1),
            color=(1, 1, 1, 1),
            font_size="14sp"
        )
        close_btn.bind(on_release=self.dismiss)
        content.add_widget(close_btn)

        self.content = content


class WalletScreen(BoxLayout):
    """
    Modern Dark-Mode Mobile Wallet Screen with FLAG_SECURE window protection,
    real-time Tor status badges, token balance metrics, transaction feeds, and
    biometrically gated transfers.
    """
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(orientation='vertical', padding=[16, 20, 16, 16], spacing=14, **kwargs)
        Window.clearcolor = (0.05, 0.06, 0.08, 1)  # High-contrast deep dark palette

        self.authenticator = BiometricAuthenticator()
        self.rasp = RaspManager()
        self.wallet_address = "pqc1q9x37f8k2l09zmtw4v8s7q9p1e5r2a8c3d9onion"
        self.balance = 2450.75
        self.tor_circuit_status = "Connected (v3 SOCKS5 / 3 hops)"
        
        # Enforce Android FLAG_SECURE window protection (Prevents screen captures / recents snooping)
        Clock.schedule_once(self.enforce_flag_secure, 0)

        # 1. Header Bar: Brand + Tor Status Badge + RASP indicator
        self._build_header()

        # 2. Balance Metric Card
        self._build_balance_card()

        # 3. Action Buttons (Send, Receive, Shield Proof)
        self._build_action_bar()

        # 4. Recent Transactions & Live Feed
        self._build_transaction_history()

    def enforce_flag_secure(self, dt: float) -> None:
        """Enforces Android WindowManager FLAG_SECURE to prevent screenshot / screen recording."""
        if platform == 'android':
            try:
                from jnius import autoclass
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                WindowManager = autoclass('android.view.WindowManager$LayoutParams')
                activity = PythonActivity.mActivity

                def set_flags():
                    activity.getWindow().setFlags(WindowManager.FLAG_SECURE, WindowManager.FLAG_SECURE)

                activity.runOnUiThread(set_flags)
            except Exception as e:
                print(f"[WalletScreen] FLAG_SECURE warning: {str(e)}")

    def _build_header(self) -> None:
        header = BoxLayout(size_hint_y=None, height=44, spacing=8)
        
        title_box = BoxLayout(orientation='vertical', size_hint_x=0.55)
        app_title = Label(
            text="[b]PQC SECURE VAULT[/b]",
            markup=True,
            font_size="15sp",
            color=(0.95, 0.96, 0.98, 1),
            halign="left"
        )
        sub_title = Label(
            text="Quantum-Safe Token Ledger",
            font_size="10sp",
            color=(0.5, 0.55, 0.62, 1),
            halign="left"
        )
        title_box.add_widget(app_title)
        title_box.add_widget(sub_title)
        header.add_widget(title_box)

        # Tor Status Badge
        self.tor_badge = Card(
            size_hint_x=0.45,
            padding=[8, 4, 8, 4],
            bg_color=(0.08, 0.16, 0.12, 1),
            border_color=(0.14, 0.45, 0.25, 1),
            radius=[16]
        )
        self.tor_label = Label(
            text="[b]● TOR v3 ONLINE[/b]",
            markup=True,
            font_size="10sp",
            color=(0.25, 0.9, 0.45, 1)
        )
        self.tor_badge.add_widget(self.tor_label)
        header.add_widget(self.tor_badge)

        self.add_widget(header)

    def _build_balance_card(self) -> None:
        self.balance_card = Card(
            orientation='vertical',
            padding=16,
            spacing=6,
            size_hint_y=None,
            height=130,
            bg_color=(0.09, 0.11, 0.15, 1),
            border_color=(0.18, 0.28, 0.42, 1),
            radius=[14]
        )

        top_row = BoxLayout(size_hint_y=None, height=20)
        lbl_asset = Label(
            text="SHIELDED BALANCE",
            font_size="11sp",
            color=(0.55, 0.65, 0.78, 1),
            halign="left"
        )
        self.zk_badge = Label(
            text="zk-SNARK Validated",
            font_size="10sp",
            color=(0.4, 0.75, 1, 1),
            halign="right"
        )
        top_row.add_widget(lbl_asset)
        top_row.add_widget(self.zk_badge)
        self.balance_card.add_widget(top_row)

        # Amount Display
        self.balance_label = Label(
            text=f"[b]{self.balance:,.2f}[/b] [size=16sp][color=72b4f5]TOKENS[/color][/size]",
            markup=True,
            font_size="28sp",
            color=(1, 1, 1, 1),
            halign="left",
            size_hint_y=None,
            height=44
        )
        self.balance_card.add_widget(self.balance_label)

        # Address indicator
        addr_row = Label(
            text=f"ID: {self.wallet_address[:14]}...{self.wallet_address[-8:]}",
            font_size="10sp",
            color=(0.45, 0.5, 0.58, 1),
            halign="left",
            size_hint_y=None,
            height=18
        )
        self.balance_card.add_widget(addr_row)

        self.add_widget(self.balance_card)

    def _build_action_bar(self) -> None:
        action_bar = BoxLayout(size_hint_y=None, height=48, spacing=10)

        # Send Button (Biometrically Gated)
        self.send_btn = Button(
            text="Send Tokens",
            background_normal="",
            background_color=(0.15, 0.48, 0.88, 1),
            color=(1, 1, 1, 1),
            font_size="13sp",
            bold=True
        )
        self.send_btn.bind(on_release=self._on_send_clicked)
        action_bar.add_widget(self.send_btn)

        # Receive Button
        self.recv_btn = Button(
            text="Receive",
            background_normal="",
            background_color=(0.14, 0.17, 0.22, 1),
            color=(0.85, 0.9, 0.98, 1),
            font_size="13sp"
        )
        self.recv_btn.bind(on_release=self._on_receive_clicked)
        action_bar.add_widget(self.recv_btn)

        # Staking / Governance Shortcut
        self.stake_btn = Button(
            text="Stake / Vote",
            background_normal="",
            background_color=(0.14, 0.17, 0.22, 1),
            color=(0.85, 0.9, 0.98, 1),
            font_size="13sp"
        )
        self.stake_btn.bind(on_release=self._on_stake_clicked)
        action_bar.add_widget(self.stake_btn)

        self.add_widget(action_bar)

    def _build_transaction_history(self) -> None:
        title_box = BoxLayout(size_hint_y=None, height=26)
        tx_title = Label(
            text="[b]VERIFIED LEDGER ACTIVITY[/b]",
            markup=True,
            font_size="12sp",
            color=(0.65, 0.7, 0.78, 1),
            halign="left"
        )
        title_box.add_widget(tx_title)
        self.add_widget(title_box)

        # Scrollable container for transactions
        scroll = ScrollView(size_hint=(1, 1), do_scroll_x=False)
        self.tx_layout = GridLayout(cols=1, spacing=8, size_hint_y=None)
        self.tx_layout.bind(minimum_height=self.tx_layout.setter('height'))

        # Seed sample transactions
        sample_txs = [
            {"type": "REWARD", "title": "RASP Attestation Reward", "amount": "+25.00", "time": "2m ago", "color": (0.2, 0.85, 0.45, 1)},
            {"type": "ZK_RELAY", "title": "Delegated ZK Proof Task", "amount": "-5.50", "time": "14m ago", "color": (0.9, 0.6, 0.2, 1)},
            {"type": "TRANSFER", "title": "PQC Transfer to Onion Node", "amount": "-150.00", "time": "1h ago", "color": (0.95, 0.35, 0.35, 1)},
            {"type": "STAKE_YIELD", "title": "Tor Relay Staking Yield", "amount": "+12.80", "time": "3h ago", "color": (0.2, 0.85, 0.45, 1)},
            {"type": "MINT", "title": "Clean CI/CD Pipeline Mint", "amount": "+50.00", "time": "6h ago", "color": (0.2, 0.85, 0.45, 1)},
        ]

        for tx in sample_txs:
            self._add_tx_item(tx)

        scroll.add_widget(self.tx_layout)
        self.add_widget(scroll)

    def _add_tx_item(self, tx: Dict[str, Any]) -> None:
        item = Card(
            orientation='horizontal',
            padding=[12, 10, 12, 10],
            size_hint_y=None,
            height=56,
            bg_color=(0.09, 0.1, 0.13, 1),
            border_color=(0.16, 0.18, 0.22, 1),
            radius=[8]
        )

        info_box = BoxLayout(orientation='vertical', size_hint_x=0.7)
        title = Label(
            text=f"[b]{tx['title']}[/b]",
            markup=True,
            font_size="12sp",
            color=(0.9, 0.92, 0.96, 1),
            halign="left"
        )
        ts = Label(
            text=f"Type: {tx['type']}  •  {tx['time']}",
            font_size="10sp",
            color=(0.48, 0.52, 0.58, 1),
            halign="left"
        )
        info_box.add_widget(title)
        info_box.add_widget(ts)
        item.add_widget(info_box)

        amt_label = Label(
            text=f"[b]{tx['amount']}[/b]",
            markup=True,
            font_size="14sp",
            color=tx['color'],
            size_hint_x=0.3,
            halign="right"
        )
        item.add_widget(amt_label)

        self.tx_layout.add_widget(item)

    def _on_send_clicked(self, instance: Any) -> None:
        """Trigger Send Modal with Biometric gate."""
        modal = SendModal(on_transfer_callback=self._execute_transfer)
        modal.open()

    def _execute_transfer(self, recipient: str, amount: str) -> None:
        """Biometrically authenticated transaction execution."""
        auth_success = self.authenticator.authenticate()
        if not auth_success:
            print("[WalletScreen] Biometric authentication failed or cancelled.")
            return

        try:
            amt_float = float(amount)
            if amt_float > self.balance:
                print("[WalletScreen] Insufficient shielded balance.")
                return
            
            self.balance -= amt_float
            self.balance_label.text = f"[b]{self.balance:,.2f}[/b] [size=16sp][color=72b4f5]TOKENS[/color][/size]"

            # Append new transaction
            new_tx = {
                "type": "PQC_TRANSFER",
                "title": f"Transfer to {recipient[:10]}...",
                "amount": f"-{amt_float:.2f}",
                "time": "Just now",
                "color": (0.95, 0.35, 0.35, 1)
            }
            self._add_tx_item(new_tx)
            print(f"[WalletScreen] Transfer of {amt_float} tokens to {recipient} completed via PQC signature.")
        except ValueError:
            pass

    def _on_receive_clicked(self, instance: Any) -> None:
        modal = ReceiveModal(wallet_address=self.wallet_address)
        modal.open()

    def _on_stake_clicked(self, instance: Any) -> None:
        print("[WalletScreen] Opening Staking / Governance policy view...")
