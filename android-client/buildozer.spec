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
# comma separated e.g. requirements = sqlite3,kivy
requirements = python3,kivy,plyer,jnius,cryptography,requests,pysocks

# (list) Permissions
android.permissions = INTERNET, CAMERA, USE_BIOMETRIC, ACCESS_FINE_LOCATION

# (int) Target Android API, should be as high as possible.
android.api = 34

# (int) Minimum API your APK / AAB will support.
android.minapi = 28

# (int) Android NDK version to use
android.ndk_api = 28

# (bool) Use --private data storage (True) or --dir public storage (False)
android.private_storage = True

# (list) Gradle dependencies (ML Kit Face Detection, Biometrics, Play Integrity)
android.gradle_dependencies = com.google.mlkit:face-detection:16.1.6, androidx.biometric:biometric:1.2.0-alpha05, com.google.android.play:integrity:1.2.0

# (bool) Enable AndroidX support
android.enable_androidx = True

# (list) Architectures to package for
android.archs = arm64-v8a

[buildozer]
# (int) Log level (0 = error only, 1 = info, 2 = debug (with command output))
log_level = 2

# (int) Display warning if buildozer is run as root (0 = False, 1 = True)
warn_on_root = 0
