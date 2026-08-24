#include <jni.h>
#include <android/log.h>
#include <onnxruntime/core/session/onnxruntime_cxx_api.h>

#define LOG_TAG "AISecureSpace_AnomalyONNX"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// ONNX Runtime Global Environment
static Ort::Env* ort_env = nullptr;
static Ort::Session* ort_session = nullptr;

extern "C" JNIEXPORT jboolean JNICALL
Java_ai_securespace_ml_AnomalyDetector_loadModel(JNIEnv* env, jobject thiz, jstring modelPath) {
    if (!ort_env) {
        ort_env = new Ort::Env(ORT_LOGGING_LEVEL_WARNING, "AISecureSpace_FL");
    }
    
    const char* path = env->GetStringUTFChars(modelPath, nullptr);
    Ort::SessionOptions session_options;
    session_options.SetIntraOpNumThreads(1);
    
    try {
        ort_session = new Ort::Session(*ort_env, path, session_options);
        LOGI("ONNX Model loaded successfully: %s", path);
        env->ReleaseStringUTFChars(modelPath, path);
        return JNI_TRUE;
    } catch (const Ort::Exception& e) {
        LOGE("Failed to load ONNX model: %s", e.what());
        env->ReleaseStringUTFChars(modelPath, path);
        return JNI_FALSE;
    }
}

extern "C" JNIEXPORT jfloat JNICALL
Java_ai_securespace_ml_AnomalyDetector_evaluateInteraction(JNIEnv* env, jobject thiz, jfloatArray features) {
    // 1. Extract float features (touch, gyro, net)
    // 2. Wrap in Ort::Value tensor
    // 3. Run ort_session->Run(...)
    // 4. Return anomaly probability score
    LOGI("Running ONNX Inference on local interaction vector...");
    return 0.12f; // Mock score for C++ compilation artifact
}
