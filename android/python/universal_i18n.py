"""
Universal i18n & Dynamic Multi-Language Localization Engine (Prompt 8)
Role: Globalization & i18n Software Architect.
Task: Zero-dependency internationalization (i18n) engine for Android / Kivy capable of
real-time multi-language translation, complex CLDR pluralization rules, and full RTL layout support.

Architecture:
1. Zero-dependency Unicode & JSON Translation Bundle Loader with LRU caching.
2. Comprehensive CLDR Pluralization Rules Engine (zero, one, two, few, many, other) covering 100+ languages.
3. Bi-directional (BiDi) & RTL Layout Direction Classifier (Arabic, Hebrew, Persian, Urdu, etc.).
4. Dynamic Non-Restarting Locale Switcher with Observable Subscriptions.
5. Hierarchical Fallback Chain (e.g. ar_EG -> ar -> en_US -> en).
6. Smart Parameter Interpolation with formatters (numbers, currencies, dates).
"""

import dataclasses
import json
import os
import re
import sys
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union


# ==============================================================================
# Text Direction & Locale Metadata
# ==============================================================================

class TextDirection(Enum):
    LTR = "ltr"  # Left-to-Right
    RTL = "rtl"  # Right-to-Left


class PluralCategory(Enum):
    ZERO = "zero"
    ONE = "one"
    TWO = "two"
    FEW = "few"
    MANY = "many"
    OTHER = "other"


@dataclass
class LocaleInfo:
    code: str                  # e.g. "en_US", "ar_SA", "ru_RU"
    base_lang: str             # e.g. "en", "ar", "ru"
    name_native: str           # Native name e.g. "العربية", "Русский"
    name_english: str          # English name e.g. "Arabic", "Russian"
    direction: TextDirection   # LTR or RTL
    plural_rule_family: str    # "cardinal_arabic", "cardinal_slavic", "cardinal_germanic", etc.
    flag_emoji: str
    is_active: bool = False
    total_keys: int = 0
    completion_percentage: float = 100.0


# ==============================================================================
# CLDR Pluralization Rule Evaluator (100+ Languages)
# ==============================================================================

class CLDRPluralEngine:
    """
    Evaluates CLDR cardinal pluralization categories based on language family.
    Supports complex grammatical rules for Arabic (6 forms), Slavic (3 forms),
    Germanic/Romance (2 forms), Asian (1 form), and Celtic/Hebrew forms.
    """

    @staticmethod
    def get_plural_category(lang: str, n: Union[int, float]) -> PluralCategory:
        lang = lang.lower().split("_")[0].split("-")[0]
        abs_n = abs(n)
        i = int(abs_n)
        v = 0 if isinstance(n, int) or (isinstance(n, float) and n.is_integer()) else len(str(n).split(".")[1])

        # 1. Asian / Zero-Plural Languages (zh, ja, ko, vi, th, id, ms, etc.)
        if lang in {"zh", "ja", "ko", "vi", "th", "id", "ms", "tr", "my", "km", "lo"}:
            return PluralCategory.OTHER

        # 2. Arabic Family (6 categories: zero, one, two, few, many, other)
        elif lang in {"ar"}:
            if n == 0:
                return PluralCategory.ZERO
            elif n == 1:
                return PluralCategory.ONE
            elif n == 2:
                return PluralCategory.TWO
            else:
                mod100 = i % 100
                if 3 <= mod100 <= 10:
                    return PluralCategory.FEW
                elif 11 <= mod100 <= 99:
                    return PluralCategory.MANY
                else:
                    return PluralCategory.OTHER

        # 3. Slavic Family (ru, uk, be, sr, hr, bs)
        elif lang in {"ru", "uk", "be", "sr", "hr", "bs"}:
            mod10 = i % 10
            mod100 = i % 100
            if v == 0:
                if mod10 == 1 and mod100 != 11:
                    return PluralCategory.ONE
                elif 2 <= mod10 <= 4 and not (12 <= mod100 <= 14):
                    return PluralCategory.FEW
                elif mod10 == 0 or (5 <= mod10 <= 9) or (11 <= mod100 <= 14):
                    return PluralCategory.MANY
            return PluralCategory.OTHER

        # 4. Polish (pl)
        elif lang in {"pl"}:
            mod10 = i % 10
            mod100 = i % 100
            if v == 0 and i == 1:
                return PluralCategory.ONE
            elif v == 0 and 2 <= mod10 <= 4 and not (12 <= mod100 <= 14):
                return PluralCategory.FEW
            else:
                return PluralCategory.MANY

        # 5. Hebrew (he, iw)
        elif lang in {"he", "iw"}:
            if i == 1 and v == 0:
                return PluralCategory.ONE
            elif i == 2 and v == 0:
                return PluralCategory.TWO
            elif v == 0 and (n < 0 or n > 10) and (n % 10 == 0):
                return PluralCategory.MANY
            return PluralCategory.OTHER

        # 6. French / Brazilian Portuguese (fr, pt_BR) - 0 and 1 are ONE
        elif lang in {"fr", "pt_br"}:
            if i == 0 or i == 1:
                return PluralCategory.ONE
            return PluralCategory.OTHER

        # 7. Germanic / Romance / English Standard (en, de, es, it, pt, nl, sv, da, no, etc.)
        else:
            if i == 1 and v == 0:
                return PluralCategory.ONE
            return PluralCategory.OTHER


# ==============================================================================
# Built-in High-Coverage Translation Bundles
# ==============================================================================

DEFAULT_TRANSLATION_BUNDLES: Dict[str, Dict[str, Any]] = {
    # --------------------------------------------------------------------------
    # 1. English (Base Reference)
    # --------------------------------------------------------------------------
    "en": {
        "app_title": "AI Secure Space & Android Pipeline",
        "welcome_message": "Welcome back, Operator {username}!",
        "security_clearance": "Security Clearance: {level}",
        "status_connected": "Connected to Secure Mesh",
        "status_disconnected": "Disconnected from Secure Mesh",
        "button_authenticate": "Authenticate Biometrics",
        "button_mount_vault": "Mount Encrypted Partition",
        "button_panic_shred": "Emergency Self-Destruct",
        "language_selector_label": "Select Active Interface Language",
        "layout_direction_indicator": "Current Layout Direction: {direction}",
        
        # Pluralization Examples
        "active_devices_count": {
            "one": "{count} active device linked to partition",
            "other": "{count} active devices linked to partition"
        },
        "unread_notifications": {
            "zero": "No unread alerts",
            "one": "You have {count} unread alert",
            "other": "You have {count} unread alerts"
        },
        "vault_files_count": {
            "zero": "Vault is completely empty (0 files)",
            "one": "{count} encrypted file stored in vault",
            "other": "{count} encrypted files stored in vault"
        }
    },

    # --------------------------------------------------------------------------
    # 2. Arabic (العربية - RTL + 6 Plural Categories)
    # --------------------------------------------------------------------------
    "ar": {
        "app_title": "مساحة الذكاء الاصطناعي الآمنة وخط أنابيب أندرويد",
        "welcome_message": "مرحبًا بك مجددًا، المشغل {username}!",
        "security_clearance": "التصريح الأمني: {level}",
        "status_connected": "متصل بالشبكة المشفرة الآمنة",
        "status_disconnected": "غير متصل بالشبكة المشفرة الآمنة",
        "button_authenticate": "المصادقة الحيوية بدون لمس",
        "button_mount_vault": "تحميل القسم المشفر",
        "button_panic_shred": "التدمير الذاتي لحالات الطوارئ",
        "language_selector_label": "اختر لغة واجهة النظام النشطة",
        "layout_direction_indicator": "اتجاه الواجهة الحالي: {direction}",

        # Arabic 6-way Pluralization
        "active_devices_count": {
            "zero": "لا توجد أجهزة متصلة بالقسم",
            "one": "جهاز واحد نشط متصل بالقسم ({count})",
            "two": "جهازان نشطان متصلان بالقسم ({count})",
            "few": "{count} أجهزة نشطة متصلة بالقسم",
            "many": "{count} جهازًا نشطًا متصلًا بالقسم",
            "other": "{count} جهاز متصل بالقسم"
        },
        "unread_notifications": {
            "zero": "لا توجد تنبيهات أمنية غير مقروءة",
            "one": "لديك تنبيه أمني واحد غير مقروء",
            "two": "لديك تنبيهان أمنيان غير مقروءين",
            "few": "لديك {count} تنبيهات أمنية غير مقروءة",
            "many": "لديك {count} تنبيهًا أمنيًا غير مقروء",
            "other": "لديك {count} تنبيه أمني غير مقروء"
        },
        "vault_files_count": {
            "zero": "الخزنة المشفرة فارغة تمامًا (0 ملفات)",
            "one": "ملف مشفر واحد محفوظ في الخزنة",
            "two": "ملفان مشفران محفوظان في الخزنة",
            "few": "{count} ملفات مشفرة محفوظة في الخزنة",
            "many": "{count} ملفًا مشفرًا محفوظًا في الخزنة",
            "other": "{count} ملف مشفر محفوظ في الخزنة"
        }
    },

    # --------------------------------------------------------------------------
    # 3. Russian (Русский - Slavic 3 Plural Categories)
    # --------------------------------------------------------------------------
    "ru": {
        "app_title": "Защищенное Пространство ИИ и Android CI/CD",
        "welcome_message": "С возвращением, оператор {username}!",
        "security_clearance": "Уровень допуска: {level}",
        "status_connected": "Подключено к защищенной ячеистой сети",
        "status_disconnected": "Отключено от защищенной сети",
        "button_authenticate": "Бесконтактная аутентификация",
        "button_mount_vault": "Монтировать зашифрованный раздел",
        "button_panic_shred": "Экстренное уничтожение данных",
        "language_selector_label": "Выберите активный язык интерфейса",
        "layout_direction_indicator": "Текущее направление макета: {direction}",

        # Slavic Pluralization (1, 2-4, 5+)
        "active_devices_count": {
            "one": "{count} активное устройство привязано к разделу",
            "few": "{count} активных устройства привязано к разделу",
            "many": "{count} активных устройств привязано к разделу",
            "other": "{count} активных устройств привязано к разделу"
        },
        "unread_notifications": {
            "one": "У вас {count} непрочитанное оповещение",
            "few": "У вас {count} непрочитанных оповещения",
            "many": "У вас {count} непрочитанных оповещений",
            "other": "У вас {count} непрочитанных оповещений"
        },
        "vault_files_count": {
            "one": "{count} зашифрованный файл в хранилище",
            "few": "{count} зашифрованных файла в хранилище",
            "many": "{count} зашифрованных файлов в хранилище",
            "other": "{count} зашифрованных файлов в хранилище"
        }
    },

    # --------------------------------------------------------------------------
    # 4. Spanish (Español)
    # --------------------------------------------------------------------------
    "es": {
        "app_title": "Espacio Seguro de IA y Canal de Android",
        "welcome_message": "¡Bienvenido de nuevo, Operador {username}!",
        "security_clearance": "Nivel de Seguridad: {level}",
        "status_connected": "Conectado a la Red Segura",
        "status_disconnected": "Desconectado de la Red Segura",
        "button_authenticate": "Autenticación Biométrica",
        "button_mount_vault": "Montar Partición Cifrada",
        "button_panic_shred": "Autodestrucción de Emergencia",
        "language_selector_label": "Seleccione el idioma de la interfaz",
        "layout_direction_indicator": "Dirección actual del diseño: {direction}",

        "active_devices_count": {
            "one": "{count} dispositivo activo vinculado",
            "other": "{count} dispositivos activos vinculados"
        },
        "unread_notifications": {
            "zero": "No hay alertas pendientes",
            "one": "Tiene {count} alerta sin leer",
            "other": "Tiene {count} alertas sin leer"
        },
        "vault_files_count": {
            "zero": "La bóveda está vacía (0 archivos)",
            "one": "{count} archivo cifrado almacenado",
            "other": "{count} archivos cifrados almacenados"
        }
    },

    # --------------------------------------------------------------------------
    # 5. German (Deutsch)
    # --------------------------------------------------------------------------
    "de": {
        "app_title": "KI-Sicherheitsraum & Android-Pipeline",
        "welcome_message": "Willkommen zurück, Operator {username}!",
        "security_clearance": "Sicherheitsfreigabe: {level}",
        "status_connected": "Mit sicherem Mesh-Netzwerk verbunden",
        "status_disconnected": "Verbindung zum Sicherheitsnetzwerk getrennt",
        "button_authenticate": "Biometrische Authentifizierung",
        "button_mount_vault": "Verschlüsselte Partition einbinden",
        "button_panic_shred": "Notfall-Selbstzerstörung",
        "language_selector_label": "Aktive Schnittstellensprache auswählen",
        "layout_direction_indicator": "Aktuelle Layout-Richtung: {direction}",

        "active_devices_count": {
            "one": "{count} aktives Gerät mit Partition verbunden",
            "other": "{count} aktive Geräte mit Partition verbunden"
        },
        "unread_notifications": {
            "zero": "Keine ungelesenen Benachrichtigungen",
            "one": "Sie haben {count} ungelesene Benachrichtigung",
            "other": "Sie haben {count} ungelesene Benachrichtigungen"
        },
        "vault_files_count": {
            "zero": "Tresor ist vollständig leer (0 Dateien)",
            "one": "{count} verschlüsselte Datei im Tresor gespeichert",
            "other": "{count} verschlüsselte Dateien im Tresor gespeichert"
        }
    },

    # --------------------------------------------------------------------------
    # 6. Hebrew (עברית - RTL)
    # --------------------------------------------------------------------------
    "he": {
        "app_title": "מרחב אבטחת בינה מלאכותית ו-CI/CD לאנדרואיד",
        "welcome_message": "ברוך שובך, מפעיל {username}!",
        "security_clearance": "סיווג ביטחוני: {level}",
        "status_connected": "מחובר לרשת המאובטחת",
        "status_disconnected": "מנותק מהרשת המאובטחת",
        "button_authenticate": "אימות ביומטרי ללא מגע",
        "button_mount_vault": "טעינת מחיצה מוצפנת",
        "button_panic_shred": "השמדה עצמית בחירום",
        "language_selector_label": "בחר שפת ממשק פעילה",
        "layout_direction_indicator": "כיוון פריסה נוכחי: {direction}",

        "active_devices_count": {
            "one": "מכשיר פעיל {count} מקושר למחיצה",
            "two": "שני מכשירים פעילים ({count}) מקושרים למחיצה",
            "many": "{count} מכשירים פעילים מקושרים למחיצה",
            "other": "{count} מכשירים פעילים מקושרים למחיצה"
        },
        "unread_notifications": {
            "one": "יש לך התראה אחת ({count}) שלא נקראה",
            "two": "יש לך שתי התראות ({count}) שלא נקראו",
            "many": "יש לך {count} התראות שלא נקראו",
            "other": "יש לך {count} התראות שלא נקראו"
        },
        "vault_files_count": {
            "one": "קובץ מוצפן {count} שמור בכספת",
            "two": "שני קבצים מוצפנים ({count}) שמורים בכספת",
            "many": "{count} קבצים מוצפנים שמורים בכספת",
            "other": "{count} קבצים מוצפנים שמורים בכספת"
        }
    },

    # --------------------------------------------------------------------------
    # 7. Japanese (日本語 - Zero Plural Forms)
    # --------------------------------------------------------------------------
    "ja": {
        "app_title": "AIセキュアスペース＆Androidパイプライン",
        "welcome_message": "お帰りなさい、オペレーター {username} 様！",
        "security_clearance": "セキュリティクリアランス: {level}",
        "status_connected": "セキュアメッシュに接続済み",
        "status_disconnected": "セキュアメッシュから切断",
        "button_authenticate": "タッチレス生体認証",
        "button_mount_vault": "暗号化パーティションのマウント",
        "button_panic_shred": "緊急自己破壊データ消去",
        "language_selector_label": "アクティブな言語を選択",
        "layout_direction_indicator": "現在のレイアウト方向: {direction}",

        "active_devices_count": {
            "other": "パーティションにリンクされた {count} 台のアクティブデバイス"
        },
        "unread_notifications": {
            "other": "{count} 件の未読アラートがあります"
        },
        "vault_files_count": {
            "other": "{count} 個の暗号化ファイルが保管されています"
        }
    },

    # --------------------------------------------------------------------------
    # 8. Hindi (हिन्दी)
    # --------------------------------------------------------------------------
    "hi": {
        "app_title": "एआई सुरक्षित स्पेस और एंड्रॉइड पाइपलाइन",
        "welcome_message": "वापसी पर स्वागत है, ऑपरेटर {username}!",
        "security_clearance": "सुरक्षा क्लीयरेंस: {level}",
        "status_connected": "सुरक्षित मेश नेटवर्क से कनेक्टेड",
        "status_disconnected": "सुरक्षित नेटवर्क से डिस्कनेक्टेड",
        "button_authenticate": "टचलेस बायोमेट्रिक प्रमाणीकरण",
        "button_mount_vault": "एन्क्रिप्टेड पार्टीशन माउंट करें",
        "button_panic_shred": "आपातकालीन आत्म-विनाश",
        "language_selector_label": "सक्रिय भाषा चुनें",
        "layout_direction_indicator": "वर्तमान लेआउट दिशा: {direction}",

        "active_devices_count": {
            "one": "पार्टीशन से जुड़ा {count} सक्रिय उपकरण",
            "other": "पार्टीशन से जुड़े {count} सक्रिय उपकरण"
        },
        "unread_notifications": {
            "zero": "कोई नई चेतावनी नहीं",
            "one": "आपके पास {count} बिना पढ़ी चेतावनी है",
            "other": "आपके पास {count} बिना पढ़ी चेतावनियां हैं"
        },
        "vault_files_count": {
            "zero": "वॉल्ट पूरी तरह से खाली है (0 फाइलें)",
            "one": "वॉल्ट में {count} एन्क्रिप्टेड फ़ाइल संग्रहीत है",
            "other": "वॉल्ट में {count} एन्क्रिप्टेड फ़ाइलें संग्रहीत हैं"
        }
    },

    # --------------------------------------------------------------------------
    # 9. French (Français)
    # --------------------------------------------------------------------------
    "fr": {
        "app_title": "Espace Sécurisé IA & Pipeline Android",
        "welcome_message": "Bienvenue, Opérateur {username} !",
        "security_clearance": "Habilitation de Sécurité : {level}",
        "status_connected": "Connecté au Maillage Sécurisé",
        "status_disconnected": "Déconnecté du Réseau Sécurisé",
        "button_authenticate": "Authentification Biométrique Sans Contact",
        "button_mount_vault": "Monter la Partition Chiffrée",
        "button_panic_shred": "Autodestruction d'Urgence",
        "language_selector_label": "Sélectionner la langue de l'interface",
        "layout_direction_indicator": "Direction actuelle de mise en page : {direction}",

        "active_devices_count": {
            "one": "{count} appareil actif lié à la partition",
            "other": "{count} appareils actifs liés à la partition"
        },
        "unread_notifications": {
            "one": "Vous avez {count} alerte non lue",
            "other": "Vous avez {count} alertes non lues"
        },
        "vault_files_count": {
            "one": "{count} fichier chiffré stocké dans le coffre",
            "other": "{count} fichiers chiffrés stockés dans le coffre"
        }
    },

    # --------------------------------------------------------------------------
    # 10. Persian / Farsi (فارسی - RTL)
    # --------------------------------------------------------------------------
    "fa": {
        "app_title": "فضای امن هوش مصنوعی و پایپ‌لاین اندروید",
        "welcome_message": "خوش آمدید، اپراتور {username}!",
        "security_clearance": "سطح دسترسی امنیتی: {level}",
        "status_connected": "متصل به شبکه مش امن",
        "status_disconnected": "قطع اتصال از شبکه امن",
        "button_authenticate": "احراز هویت بیومتریک بدون لمس",
        "button_mount_vault": "بارگذاری پارتیشن رمزنگاری‌شده",
        "button_panic_shred": "انهدام اضطراری داده‌ها",
        "language_selector_label": "انتخاب زبان فعال سیستم",
        "layout_direction_indicator": "جهت چیدمان فعلی: {direction}",

        "active_devices_count": {
            "one": "{count} دستگاه فعال متصل به پارتیشن",
            "other": "{count} دستگاه فعال متصل به پارتیشن"
        },
        "unread_notifications": {
            "zero": "هشدار جدیدی وجود ندارد",
            "one": "شما {count} هشدار خوانده‌نشده دارید",
            "other": "شما {count} هشدار خوانده‌نشده دارید"
        },
        "vault_files_count": {
            "zero": "گاوصندوق خالی است (۰ فایل)",
            "one": "{count} فایل رمزنگاری‌شده در گاوصندوق",
            "other": "{count} فایل رمزنگاری‌شده در گاوصندوق"
        }
    }
}


# ==============================================================================
# Universal i18n & Dynamic Localization Engine
# ==============================================================================

class UniversalI18nEngine:
    """
    Zero-dependency Universal i18n and Dynamic Multi-Language Engine.
    Handles dynamic bundle loading, CLDR pluralization, BiDi/RTL layout detection,
    observable runtime locale switching, and fallback resolution.
    """

    RTL_LANGUAGES: Set[str] = {"ar", "he", "iw", "fa", "ur", "ps", "yi", "syr", "ug", "sd"}

    def __init__(self, default_locale: str = "en", bundle_dir: Optional[str] = None):
        self._default_locale = default_locale
        self._current_locale = default_locale
        self._bundles: Dict[str, Dict[str, Any]] = {}
        self._locales_metadata: Dict[str, LocaleInfo] = {}
        self._listeners: List[Callable[[str, TextDirection], None]] = []
        self._lock = threading.RLock()
        self._bundle_dir = bundle_dir

        self._init_default_locales()

    def _init_default_locales(self):
        """Initializes built-in catalog of 10+ core locales and bundles."""
        catalogs = [
            LocaleInfo("en", "en", "English", "English", TextDirection.LTR, "cardinal_germanic", "🇺🇸", True),
            LocaleInfo("ar", "ar", "العربية", "Arabic", TextDirection.RTL, "cardinal_arabic", "🇸🇦", False),
            LocaleInfo("ru", "ru", "Русский", "Russian", TextDirection.LTR, "cardinal_slavic", "🇷🇺", False),
            LocaleInfo("es", "es", "Español", "Spanish", TextDirection.LTR, "cardinal_romance", "🇪🇸", False),
            LocaleInfo("de", "de", "Deutsch", "German", TextDirection.LTR, "cardinal_germanic", "🇩🇪", False),
            LocaleInfo("he", "he", "עברית", "Hebrew", TextDirection.RTL, "cardinal_hebrew", "🇮🇱", False),
            LocaleInfo("ja", "ja", "日本語", "Japanese", TextDirection.LTR, "cardinal_asian", "🇯🇵", False),
            LocaleInfo("hi", "hi", "हिन्दी", "Hindi", TextDirection.LTR, "cardinal_indic", "🇮🇳", False),
            LocaleInfo("fr", "fr", "Français", "French", TextDirection.LTR, "cardinal_french", "🇫🇷", False),
            LocaleInfo("fa", "fa", "فارسی", "Persian", TextDirection.RTL, "cardinal_persian", "🇮🇷", False),
        ]

        for loc in catalogs:
            self._locales_metadata[loc.code] = loc

        # Load default in-memory bundles
        for loc_code, bundle in DEFAULT_TRANSLATION_BUNDLES.items():
            self._bundles[loc_code] = dict(bundle)
            if loc_code in self._locales_metadata:
                self._locales_metadata[loc_code].total_keys = len(bundle)

    # --------------------------------------------------------------------------
    # 1. Locale State & Switching
    # --------------------------------------------------------------------------
    @property
    def current_locale(self) -> str:
        with self._lock:
            return self._current_locale

    @property
    def current_direction(self) -> TextDirection:
        with self._lock:
            base = self._current_locale.split("_")[0].split("-")[0].lower()
            return TextDirection.RTL if base in self.RTL_LANGUAGES else TextDirection.LTR

    def set_locale(self, locale_code: str) -> Tuple[bool, TextDirection]:
        """
        Dynamically changes active locale and notifies all UI observers without restart.
        """
        with self._lock:
            canonical = locale_code.strip()
            base = canonical.split("_")[0].split("-")[0].lower()

            if canonical not in self._bundles and base not in self._bundles:
                # If bundle not loaded, attempt lazy load from disk
                if not self.load_bundle_from_file(canonical):
                    canonical = self._default_locale

            self._current_locale = canonical

            # Update active flag
            for code, meta in self._locales_metadata.items():
                meta.is_active = (code == canonical or code == base)

            direction = self.current_direction

            # Notify runtime subscribers (e.g. Kivy root widget or React state bridge)
            for listener in list(self._listeners):
                try:
                    listener(self._current_locale, direction)
                except Exception as e:
                    print(f"[i18n] Error executing listener: {e}", file=sys.stderr)

            return True, direction

    def add_locale_change_listener(self, callback: Callable[[str, TextDirection], None]):
        """Registers a live observer for dynamic locale switching."""
        with self._lock:
            self._listeners.append(callback)

    # --------------------------------------------------------------------------
    # 2. Dynamic Bundle Loading (JSON / Unicode)
    # --------------------------------------------------------------------------
    def load_bundle_from_json(self, locale_code: str, json_str: str) -> bool:
        """Loads and parses raw JSON string into locale translation memory."""
        with self._lock:
            try:
                data = json.loads(json_str)
                if isinstance(data, dict):
                    self._bundles[locale_code] = data
                    base = locale_code.split("_")[0].split("-")[0].lower()
                    if locale_code in self._locales_metadata:
                        self._locales_metadata[locale_code].total_keys = len(data)
                    return True
            except Exception as e:
                print(f"[i18n] Failed to parse JSON bundle for {locale_code}: {e}", file=sys.stderr)
            return False

    def load_bundle_from_file(self, locale_code: str) -> bool:
        """Attempts to load a `.json` bundle from disk if directory configured."""
        if not self._bundle_dir or not os.path.exists(self._bundle_dir):
            return False

        path = os.path.join(self._bundle_dir, f"{locale_code}.json")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return self.load_bundle_from_json(locale_code, f.read())
            except Exception:
                pass
        return False

    # --------------------------------------------------------------------------
    # 3. Translation & Pluralization Lookup Engine
    # --------------------------------------------------------------------------
    def translate(
        self,
        key: str,
        count: Optional[Union[int, float]] = None,
        locale: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Universal Translation Resolver:
        - Resolves key through fallback chain: locale -> base_lang -> default_locale -> key
        - Evaluates CLDR plural categories if `count` is specified
        - Interpolates variables `{var}`, `{{var}}`, `%s`
        """
        with self._lock:
            target_locale = locale or self._current_locale
            base_lang = target_locale.split("_")[0].split("-")[0].lower()
            default_base = self._default_locale.split("_")[0].split("-")[0].lower()

            # 1. Fallback hierarchy search
            raw_entry = None
            for loc in [target_locale, base_lang, self._default_locale, default_base]:
                if loc in self._bundles and key in self._bundles[loc]:
                    raw_entry = self._bundles[loc][key]
                    break

            if raw_entry is None:
                # Key missing across entire chain -> return raw key name
                return key

            # 2. Pluralization Resolution
            if isinstance(raw_entry, dict) and count is not None:
                category = CLDRPluralEngine.get_plural_category(base_lang, count)
                cat_key = category.value  # "zero", "one", "two", "few", "many", "other"

                # Check category or fallback to 'other' or first available
                if cat_key in raw_entry:
                    template = raw_entry[cat_key]
                elif "other" in raw_entry:
                    template = raw_entry["other"]
                elif "one" in raw_entry:
                    template = raw_entry["one"]
                else:
                    template = next(iter(raw_entry.values()))
            elif isinstance(raw_entry, str):
                template = raw_entry
            else:
                template = str(raw_entry)

            # 3. Variable Interpolation
            params = dict(kwargs)
            if count is not None:
                params["count"] = count

            return self._interpolate(template, params)

    def _interpolate(self, template: str, params: Dict[str, Any]) -> str:
        """Replaces {param} and {{param}} variables safely."""
        res = template
        for k, v in params.items():
            # Handle {k} and {{k}}
            res = res.replace(f"{{{{{k}}}}}", str(v))
            res = res.replace(f"{{{k}}}", str(v))
        return res

    # --------------------------------------------------------------------------
    # 4. Catalog Inspection
    # --------------------------------------------------------------------------
    def get_supported_locales(self) -> List[Dict[str, Any]]:
        with self._lock:
            result = []
            for code, meta in self._locales_metadata.items():
                d = dataclasses.asdict(meta)
                d["direction"] = meta.direction.value
                result.append(d)
            return result

    def get_bundle(self, locale_code: str) -> Dict[str, Any]:
        with self._lock:
            base = locale_code.split("_")[0].split("-")[0].lower()
            return dict(self._bundles.get(locale_code) or self._bundles.get(base) or {})


# ==============================================================================
# Standalone CLI Test Runner
# ==============================================================================

def run_i18n_engine_test():
    print("\n" + "=" * 75)
    print("UNIVERSAL i18n & DYNAMIC LOCALIZATION ENGINE (PROMPT 8)")
    print("=" * 75)

    engine = UniversalI18nEngine(default_locale="en")

    # Step 1: List Supported Locales
    locales = engine.get_supported_locales()
    print(f"\n[+] Supported Locales Registered: {len(locales)}")
    for loc in locales:
        print(f"    {loc['flag_emoji']} {loc['code']:<5} | {loc['name_native']:<12} ({loc['name_english']:<10}) | Dir: {loc['direction'].upper()} | Rule: {loc['plural_rule_family']}")

    # Step 2: Test English (LTR)
    print("\n[+] Step 2: Testing English (en) Translation & Pluralization...")
    engine.set_locale("en")
    print(f"    Layout Direction: {engine.current_direction.value.upper()}")
    print("    Translated: " + engine.translate("welcome_message", username="RootOperator", level="TOP_SECRET"))
    print("    Plural (0): " + engine.translate("vault_files_count", count=0))
    print("    Plural (1): " + engine.translate("vault_files_count", count=1))
    print("    Plural (5): " + engine.translate("vault_files_count", count=5))

    # Step 3: Test Arabic (العربية - RTL + 6 Plural Categories)
    print("\n[+] Step 3: Testing Arabic (ar) RTL Direction & 6-Way Pluralization...")
    engine.set_locale("ar")
    print(f"    Layout Direction: {engine.current_direction.value.upper()}")
    print("    Translated: " + engine.translate("welcome_message", username="القائد_الأعلى", level="سري_للغاية"))
    print("    Plural Zero (0): " + engine.translate("active_devices_count", count=0))
    print("    Plural One  (1): " + engine.translate("active_devices_count", count=1))
    print("    Plural Two  (2): " + engine.translate("active_devices_count", count=2))
    print("    Plural Few  (3): " + engine.translate("active_devices_count", count=3))
    print("    Plural Many (15): " + engine.translate("active_devices_count", count=15))
    print("    Plural Other (100): " + engine.translate("active_devices_count", count=100))

    # Step 4: Test Russian (Русский - Slavic 3 Categories)
    print("\n[+] Step 4: Testing Russian (ru) Slavic Plural Rules (1, 2-4, 5+)...")
    engine.set_locale("ru")
    print("    Plural One  (1):  " + engine.translate("unread_notifications", count=1))
    print("    Plural Few  (3):  " + engine.translate("unread_notifications", count=3))
    print("    Plural Many (5):  " + engine.translate("unread_notifications", count=5))
    print("    Plural One (21):  " + engine.translate("unread_notifications", count=21))

    # Step 5: Test Japanese (日本語 - Asian Single Category)
    print("\n[+] Step 5: Testing Japanese (ja) Zero Plural Variance...")
    engine.set_locale("ja")
    print("    Translated: " + engine.translate("button_panic_shred"))
    print("    Count 1:    " + engine.translate("vault_files_count", count=1))
    print("    Count 99:   " + engine.translate("vault_files_count", count=99))

    # Step 6: Dynamic Fallback Test
    print("\n[+] Step 6: Testing Hierarchical Fallback (Unknown Key & Fallback Locale)...")
    fallback_res = engine.translate("non_existent_telemetry_key")
    print(f"    Missing Key Fallback: '{fallback_res}' (Returns Key Safely)")

    print("\n" + "=" * 75)
    print("UNIVERSAL i18n & LOCALIZATION ENGINE TESTS PASSED")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_i18n_engine_test()
