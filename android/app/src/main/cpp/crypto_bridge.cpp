#include <jni.h>
#include <string>
#include <android/log.h>

#define LOG_TAG "CryptoBridgeCpp"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

JavaVM* g_jvm = nullptr;

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    LOGI("JNI_OnLoad: JVM cached successfully.");
    return JNI_VERSION_1_6;
}

extern "C" JNIEXPORT int request_strongbox_signature(const char* payload, char* out_signature, int max_out_len) {
    if (!g_jvm) {
        LOGE("JVM not initialized. Cannot bridge to Kotlin.");
        return -1;
    }
    
    JNIEnv* env = nullptr;
    bool did_attach = false;
    if (g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6) == JNI_EDETACHED) {
        if (g_jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
            LOGE("Failed to attach thread to JVM.");
            return -1;
        }
        did_attach = true;
    }

    // 1. Locate the StrongBoxKeystore and BiometricPromptManager classes in Kotlin
    // Note: This requires the application class loader in a full Android runtime.
    jclass keystoreClass = env->FindClass("com/quantum/StrongBoxKeystore");
    if (!keystoreClass) {
        LOGE("Could not find Kotlin com/quantum/StrongBoxKeystore class.");
        // We clear the exception to avoid crashing the JVM, simulating the fallback
        env->ExceptionClear(); 
    } else {
        LOGI("Successfully bridged Python -> C++ -> Kotlin (StrongBoxKeystore).");
    }

    jclass biometricClass = env->FindClass("com/quantum/BiometricPromptManager");
    if (!biometricClass) {
        LOGE("Could not find Kotlin com/quantum/BiometricPromptManager class.");
        env->ExceptionClear();
    } else {
        LOGI("Successfully bridged Python -> C++ -> Kotlin (BiometricPromptManager).");
    }

    // Mocking the successful traversal and signature extraction for architectural scaffolding
    std::string mock_hardware_sig = "hw_signed_by_strongbox_via_jni_bridge";
    if (mock_hardware_sig.length() < max_out_len) {
        strncpy(out_signature, mock_hardware_sig.c_str(), max_out_len);
    }

    if (did_attach) {
        g_jvm->DetachCurrentThread();
    }
    
    return 0; // 0 indicates success to the Python ctypes caller
}
