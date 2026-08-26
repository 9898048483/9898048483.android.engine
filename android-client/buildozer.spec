[app]
# (str) Title of your application
title = AI Secure Space Client

# (str) Package name
package.name = securespaceclient

# (str) Package domain (needed for android/ios packaging)
package.domain = ai.securespace

# (str) Source code where the main.py lives
source.dir = .

# (list) Source files to include (let empty to include all the files)
source.include_exts = py,png,jpg,kv,atlas

# (str) Application versioning
version = 1.0.0

# (list) Application requirements
requirements = python3,kivy,plyer,jnius,cryptography,requests,pysocks,google-api-python-client,google-auth-httplib2,google-auth-oauthlib

# (list) Permissions
android.permissions = INTERNET, CAMERA, USE_BIOMETRIC, USE_FINGERPRINT, ACCESS_NETWORK_STATE, FOREGROUND_SERVICE, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS

# (list) Services to run in background (service_name:entrypoint.py)
services = TokenBackgroundService:background_service.py

# (int) Target Android API, should be as high as possible.
android.api = 34

# (int) Minimum API your APK / AAB will support.
android.minapi = 21

# (int) Android NDK version to use
android.ndk_api = 28

# (bool) Use --private data storage (True) or --dir public storage (False)
android.private_storage = True

# (list) Gradle dependencies (ML Kit Face Detection, Biometrics)
android.gradle_dependencies = com.google.mlkit:face-detection:16.1.6, androidx.biometric:biometric:1.2.0-alpha05

# (bool) Enable AndroidX support
android.enable_androidx = True

# (list) Architectures to package for
android.archs = arm64-v8a

[buildozer]
log_level = 2
warn_on_root = 0
