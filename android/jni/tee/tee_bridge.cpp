#include <jni.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include <android/log.h>

#define LOG_TAG "AISecureSpace_JNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Secure memory zeroing function equivalent to explicit_bzero
static void secure_bzero(void* ptr, size_t size) {
    if (ptr != nullptr && size > 0) {
        volatile uint8_t* p = (volatile uint8_t*)ptr;
        while (size--) {
            *p++ = 0;
        }
        __asm__ __volatile__("" : : "r"(ptr) : "memory");
    }
}

static JavaVM* g_jvm = nullptr;

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}

static JNIEnv* getEnv() {
    JNIEnv* env;
    if (g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6) == JNI_EDETACHED) {
        g_jvm->AttachCurrentThread(&env, NULL);
    }
    return env;
}

// Exception clearing helper
static bool check_and_clear_exceptions(JNIEnv* env) {
    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
        return true;
    }
    return false;
}

extern "C" {
    int hardware_generate_key(const uint8_t* challenge, size_t challenge_len) {
        JNIEnv* env = getEnv();
        jclass klazz = env->FindClass("ai/securespace/crypto/StrongBoxKeyManager");
        if (!klazz) return 0;
        
        jmethodID ctor = env->GetMethodID(klazz, "<init>", "()V");
        jobject obj = env->NewObject(klazz, ctor);
        jmethodID generateKeyMethod = env->GetMethodID(klazz, "generateKey", "([B)Z");

        jbyteArray challengeArray = nullptr;
        if (challenge != nullptr && challenge_len > 0) {
            challengeArray = env->NewByteArray(challenge_len);
            env->SetByteArrayRegion(challengeArray, 0, challenge_len, (const jbyte*)challenge);
        }
        
        jboolean result = env->CallBooleanMethod(obj, generateKeyMethod, challengeArray);
        
        if (challengeArray) {
            env->DeleteLocalRef(challengeArray);
        }
        
        if (check_and_clear_exceptions(env)) return 0;
        return result == JNI_TRUE ? 1 : 0;
    }

    int hardware_encrypt(const uint8_t* plaintext, size_t pt_len, uint8_t** out_cipher, size_t* out_len) {
        JNIEnv* env = getEnv();
        jclass klazz = env->FindClass("ai/securespace/crypto/StrongBoxKeyManager");
        jmethodID ctor = env->GetMethodID(klazz, "<init>", "()V");
        jobject obj = env->NewObject(klazz, ctor);
        jmethodID encryptMethod = env->GetMethodID(klazz, "encrypt", "([B)[B");

        jbyteArray ptArray = env->NewByteArray(pt_len);
        env->SetByteArrayRegion(ptArray, 0, pt_len, (const jbyte*)plaintext);

        jbyteArray ctArray = (jbyteArray)env->CallObjectMethod(obj, encryptMethod, ptArray);
        
        // --- MEMORY SANITIZATION ---
        // Securely wipe the plaintext buffer from JNI memory before deletion
        jbyte* ptElements = env->GetByteArrayElements(ptArray, nullptr);
        secure_bzero(ptElements, pt_len);
        env->ReleaseByteArrayElements(ptArray, ptElements, JNI_COMMIT); 
        env->DeleteLocalRef(ptArray);

        if (check_and_clear_exceptions(env) || !ctArray) return 0;

        *out_len = env->GetArrayLength(ctArray);
        *out_cipher = (uint8_t*)malloc(*out_len);
        env->GetByteArrayRegion(ctArray, 0, *out_len, (jbyte*)*out_cipher);
        env->DeleteLocalRef(ctArray);
        
        return 1;
    }

    int hardware_decrypt(const uint8_t* ciphertext, size_t ct_len, uint8_t** out_plain, size_t* out_len) {
        JNIEnv* env = getEnv();
        jclass klazz = env->FindClass("ai/securespace/crypto/StrongBoxKeyManager");
        jmethodID ctor = env->GetMethodID(klazz, "<init>", "()V");
        jobject obj = env->NewObject(klazz, ctor);
        jmethodID decryptMethod = env->GetMethodID(klazz, "decrypt", "([B)[B");

        jbyteArray ctArray = env->NewByteArray(ct_len);
        env->SetByteArrayRegion(ctArray, 0, ct_len, (const jbyte*)ciphertext);

        jbyteArray ptArray = (jbyteArray)env->CallObjectMethod(obj, decryptMethod, ctArray);
        env->DeleteLocalRef(ctArray);

        if (check_and_clear_exceptions(env) || !ptArray) return 0;

        *out_len = env->GetArrayLength(ptArray);
        *out_plain = (uint8_t*)malloc(*out_len);
        env->GetByteArrayRegion(ptArray, 0, *out_len, (jbyte*)*out_plain);

        // --- MEMORY SANITIZATION ---
        // Wipe the plaintext buffer produced by Java before releasing the local reference
        jbyte* ptElements = env->GetByteArrayElements(ptArray, nullptr);
        secure_bzero(ptElements, *out_len);
        env->ReleaseByteArrayElements(ptArray, ptElements, JNI_COMMIT);
        env->DeleteLocalRef(ptArray);

        return 1;
    }
    
    void hardware_free_buffer(uint8_t* buffer, size_t len) {
        if (buffer) {
            secure_bzero(buffer, len);
            free(buffer);
        }
    }
}
