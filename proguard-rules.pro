# ==============================================================================
# PROGUARD RULES - AI SECURE SPACE
# ==============================================================================

# 1. Keep JNI native methods and their enclosing classes intact
# If these are stripped, the C++ JNI bridge (e.g., tee_bridge.cpp) will crash with UnsatisfiedLinkError.
-keepclasseswithmembernames class * {
    native <methods>;
}

# 2. Keep AI Secure Space Custom Kotlin/Java Security Modules
-keep class ai.securespace.crypto.StrongBoxKeyManager { *; }
-keep class ai.securespace.graphics.SecureSurfaceManager { *; }
-keep class ai.securespace.attestation.RemoteAttestationClient { *; }
-keep class ai.securespace.biometrics.ZeroTrustBiometricEngine { *; }

# 3. Keep Google ML Kit and Play Integrity Dependencies
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.play.core.integrity.** { *; }
-keep class com.google.android.gms.** { *; }

# 4. Keep JNI Bridges (Pyjnius/Chaquo)
-keep class org.jnius.** { *; }
-keep class org.renpy.android.** { *; }

# 5. Optimization configuration
-dontwarn javax.annotation.**
-dontwarn java.lang.invoke.**
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*
-optimizationpasses 5
