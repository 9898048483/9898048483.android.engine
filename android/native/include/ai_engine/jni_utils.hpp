#ifndef AI_ENGINE_JNI_UTILS_HPP
#define AI_ENGINE_JNI_UTILS_HPP

#include <jni.h>
#include <android/log.h>
#include <string>
#include <functional>
#include <memory>
#include <mutex>
#include <stdexcept>

#define LOG_TAG "AI_NATIVE_BRIDGE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

namespace ai_engine {
namespace jni {

/**
 * @brief Global JVM holder ensuring thread-safe access and attachment across background worker threads.
 */
class JvmManager {
public:
    static JvmManager& getInstance() {
        static JvmManager instance;
        return instance;
    }

    void setJavaVM(JavaVM* vm) {
        std::lock_guard<std::mutex> lock(mutex_);
        jvm_ = vm;
    }

    JavaVM* getJavaVM() const {
        return jvm_;
    }

    /**
     * @brief Obtains a JNIEnv pointer for the current calling thread, automatically attaching
     * as a daemon thread if necessary to prevent thread leak or JVM blockage.
     */
    JNIEnv* getEnv(bool* outDidAttach = nullptr) {
        if (!jvm_) {
            LOGE("FATAL: JavaVM not initialized!");
            return nullptr;
        }

        JNIEnv* env = nullptr;
        jint res = jvm_->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6);

        if (res == JNI_EDETACHED) {
            JavaVMAttachArgs args;
            args.version = JNI_VERSION_1_6;
            args.name = const_cast<char*>("AI_Engine_Worker_Thread");
            args.group = nullptr;

            if (jvm_->AttachCurrentThreadAsDaemon(&env, &args) != JNI_OK) {
                LOGE("Failed to attach current thread as daemon to JVM");
                return nullptr;
            }
            if (outDidAttach) *outDidAttach = true;
        } else if (res == JNI_OK) {
            if (outDidAttach) *outDidAttach = false;
        } else {
            LOGE("GetEnv failed with error code: %d", res);
            return nullptr;
        }

        return env;
    }

    void detachCurrentThread() {
        if (jvm_) {
            jvm_->DetachCurrentThread();
        }
    }

private:
    JvmManager() : jvm_(nullptr) {}
    ~JvmManager() = default;
    JvmManager(const JvmManager&) = delete;
    JvmManager& operator=(const JvmManager&) = delete;

    JavaVM* jvm_;
    mutable std::mutex mutex_;
};

/**
 * @brief RAII Scope guard for thread-safe JNI local references to prevent JNI table overflow (max 512 refs).
 */
class ScopedLocalFrame {
public:
    explicit ScopedLocalFrame(JNIEnv* env, jint capacity = 64) : env_(env), valid_(false) {
        if (env_ && env_->PushLocalFrame(capacity) == 0) {
            valid_ = true;
        }
    }

    ~ScopedLocalFrame() {
        if (valid_ && env_) {
            env_->PopLocalFrame(nullptr);
        }
    }

    template <typename T>
    T escape(T ref) {
        if (valid_ && env_) {
            valid_ = false;
            return reinterpret_cast<T>(env_->PopLocalFrame(ref));
        }
        return ref;
    }

private:
    JNIEnv* env_;
    bool valid_;
};

/**
 * @brief RAII UTF string conversion utility for thread-safe jstring <-> std::string handling.
 */
class ScopedUtfChars {
public:
    ScopedUtfChars(JNIEnv* env, jstring jstr) 
        : env_(env), jstr_(jstr), utf_(nullptr), size_(0) {
        if (env_ && jstr_) {
            utf_ = env_->GetStringUTFChars(jstr_, nullptr);
            if (utf_) {
                size_ = static_cast<size_t>(env_->GetStringUTFLength(jstr_));
            }
        }
    }

    ~ScopedUtfChars() {
        if (env_ && jstr_ && utf_) {
            env_->ReleaseStringUTFChars(jstr_, utf_);
        }
    }

    const char* c_str() const { return utf_ ? utf_ : ""; }
    size_t size() const { return size_; }
    std::string str() const { return utf_ ? std::string(utf_, size_) : std::string(); }
    bool valid() const { return utf_ != nullptr; }

private:
    JNIEnv* env_;
    jstring jstr_;
    const char* utf_;
    size_t size_;
};

/**
 * @brief Helper to check and rethrow JNI exceptions into standard C++ exceptions or log them.
 */
inline bool checkAndClearException(JNIEnv* env, const char* contextMessage = nullptr) {
    if (env && env_->ExceptionCheck()) {
        LOGE("JNI Exception occurred at context: %s", contextMessage ? contextMessage : "unknown");
        env_->ExceptionDescribe();
        env_->ExceptionClear();
        return true;
    }
    return false;
}

} // namespace jni
} // namespace ai_engine

#endif // AI_ENGINE_JNI_UTILS_HPP
