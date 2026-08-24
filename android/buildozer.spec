# ==============================================================================
# AI SECURE SPACE - BUILDOZER CONFIGURATION MANIFEST (PROMPT 15)
# Target: Android SDK 34 (Android 14) / NDK r25b (25.2.9519653)
# Architectures: arm64-v8a, armeabi-v7a, x86_64
# Security: Anti-Tamper SHA256 Integrity Verification, FLAG_SECURE, TEE Keystore
# ==============================================================================

[app]

# (str) Title of your application
title = AI Secure Space Touchless

# (str) Package name (strictly unique identifier)
package.name = ai.secure.space.touchless

# (str) Package domain (needed for android/ios packaging)
package.domain = org.aisecure

# (str) Source code where the main.py lives
source.dir = .

# (list) Source files to include (let empty to include all the base dir)
source.include_exts = py,png,jpg,kv,atlas,ttf,json,xml,so,bin

# (list) List of inclusions using pattern matching
source.include_patterns = assets/*,service/*,native/*,python/*

# (list) Source files to exclude (let empty to not exclude anything)
source.exclude_exts = spec,pyc,pyo,bak,tmp,log

# (list) List of directory to exclude
source.exclude_dirs = tests,bin,.git,.github,.cache,.buildozer,build,dist

# (list) List of exclusions using pattern matching
source.exclude_patterns = license*,Makefile*,*.DS_Store

# (str) Application versioning
version = 2.5.0-production

# (int) Application version code (incremented per release)
version.code = 250

# (list) Application requirements
# comma separated e.g. requirements = sqlite3,kivy
requirements = python3==3.11.5,hostpython3==3.11.5,kivy==2.3.0,plyer==2.1.0,cryptography==42.0.5,pysocks==1.7.1,numpy==1.26.4,requests==2.31.0,urllib3==2.2.1,cffi==1.16.0,pycparser==2.21,pydantic==2.6.4,pydantic-core==2.16.3,typing-extensions==4.10.0,certifi==2024.2.2

# (str) Custom source folders for requirements
# Sets custom source for any requirements with recipes
# requirements.source.kivy = ../../kivy

# (list) Garden requirements
#garden_requirements =

# (str) Presplash of the application
#presplash.filename = %(source.dir)s/assets/presplash.png

# (str) Icon of the application
#icon.filename = %(source.dir)s/assets/icon.png

# (str) Supported orientation (one of landscape, sensorLandscape, portrait or all)
orientation = portrait

# (list) List of service to declare
# Format: <service_name>:<entrypoint.py>[:foreground]
services = ZeroTouchDaemon:service/battery_daemon.py:foreground

#
# Android specific
#

# (bool) Indicate if the application should be in fullscreen mode
fullscreen = 0

# (string) Presplash background color (for new android presplash)
android.presplash_color = #0A0F1D

# (list) Permissions
# Target SDK 34 strict security permissions
android.permissions = USE_BIOMETRIC,USE_FINGERPRINT,INTERNET,ACCESS_NETWORK_STATE,CAMERA,FOREGROUND_SERVICE,FOREGROUND_SERVICE_SPECIAL_USE,POST_NOTIFICATIONS,RECEIVE_BOOT_COMPLETED,WAKE_LOCK,SYSTEM_ALERT_WINDOW

# (list) features (optional)
android.features = android.hardware.camera.any,android.hardware.camera.autofocus,android.hardware.fingerprint

# (int) Target Android API, should be as high as possible.
android.api = 34

# (int) Minimum API your APK will support.
android.minapi = 26

# (int) Android SDK version to use
android.sdk = 34

# (str) Android NDK version to use
android.ndk = 25b

# (int) Android NDK API to use. This is the minimum API your app will support, it should usually match android.minapi.
android.ndk_api = 26

# (bool) Use --private data storage (True) or --dir public storage (False)
android.private_storage = True

# (str) Android NDK directory (if empty, it will be automatically downloaded.)
#android.ndk_path =

# (str) Android SDK directory (if empty, it will be automatically downloaded.)
#android.sdk_path =

# (str) ANT directory (if empty, it will be automatically downloaded.)
#android.ant_path =

# (bool) If True, then skip trying to update the Android sdk
# This can be useful to avoid excess Internet downloads or save time
# when an update is due and you just want to test/build your package
android.skip_update = False

# (bool) If True, then automatically accept SDK license
# agreements. This is intended for automation only. If set to False,
# the default, you will be shown the license when first running
# buildozer.
android.accept_sdk_license = True

# (str) Android entry point, default is ok for Kivy-based app
android.entrypoint = org.kivy.android.PythonActivity

# (str) Full name including package path of the Java class that implements Android Activity
# android.activity_class_name = org.kivy.android.PythonActivity

# (str) The name of the custom Java class to use as the splashscreen Activity
# android.splashscreen_activity_class_name = org.kivy.android.PythonSplashScreenActivity

# (list) Extra Java/Kotlin dependencies via Gradle
android.gradle_dependencies = com.google.mlkit:face-detection:16.1.6,androidx.biometric:biometric:1.2.0-alpha05,androidx.security:security-crypto:1.1.0-alpha06,androidx.core:core-ktx:1.12.0,androidx.appcompat:appcompat:1.6.1,com.google.android.material:material:1.11.0

# (list) Extra Android repositories
android.add_gradle_repositories = "mavenCentral()", "google()"

# (list) Packaging whitelist for static and dynamic shared libraries
# Bundling Tor v3 daemon ELFs and NDK AF_UNIX memory firewall .so libraries
android.add_src = assets/bin/tor-arm64-v8a -> assets/tor/tor-arm64, assets/bin/tor-armeabi-v7a -> assets/tor/tor-armv7, assets/bin/tor-x86_64 -> assets/tor/tor-x86_64, native/libnative_ipc_firewall.so -> lib/arm64-v8a/libnative_ipc_firewall.so

# (list) Supported target CPU architectures
# Production NDK targets (64-bit modern ARM, legacy 32-bit ARM, and 64-bit emulator/Intel)
android.archs = arm64-v8a, armeabi-v7a, x86_64

# (bool) Enable AndroidX support. Enable when you use Gradle dependencies
android.enable_androidx = True

# (bool) Anti-Tamper & Security Hardening: FLAG_SECURE window protection
android.manifest.allow_backup = False
android.manifest.network_security_config = @xml/network_security_config

# (list) Intent filters for deep linking / secure tor invocation
# android.manifest.intent_filters =

# (str) The format used to package the app for release mode (aab or apk)
android.release_artifact = apk

# (str) The format used to package the app for debug mode (apk)
android.debug_artifact = apk

# (bool) Copy library instead of making a libpymodules.so
android.copy_libs = 1

# (list) Packaging packagingOptions in build.gradle
android.packaging_options = pickFirst 'lib/arm64-v8a/libcrypto.so', pickFirst 'lib/arm64-v8a/libssl.so', pickFirst 'lib/arm64-v8a/libnative_ipc_firewall.so'

# (bool) Obfuscation & R8/ProGuard Anti-Tamper rules
android.enable_proguard = True
android.proguard_rules = @proguard-rules.pro

# (str) Output directories for non-sudo automated CI/CD
build_dir = ./dist
bin_dir = ./dist

# ==============================================================================
# Buildozer Global Settings
# ==============================================================================

[buildozer]

# (int) Log level (0 = error only, 1 = info, 2 = debug with command output)
log_level = 2

# (int) Display warning if buildozer is run as root (0 = False, 1 = True)
warn_on_root = 1

# (str) Path to build artifact storage
# bin_dir = ./dist
