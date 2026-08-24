#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl3.h>
#include <android/log.h>
#include <android/native_window_jni.h>

#define LOG_TAG "AISecureSpace_EGL"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Extension for DRM/Protected memory rendering
#ifndef EGL_PROTECTED_CONTENT_EXT
#define EGL_PROTECTED_CONTENT_EXT 0x32C0
#endif

extern "C" JNIEXPORT jboolean JNICALL
Java_ai_securespace_graphics_NativeRenderer_createSecureSurface(
    JNIEnv* env, jobject thiz, jobject surface) {
    
    ANativeWindow* window = ANativeWindow_fromSurface(env, surface);
    if (!window) {
        LOGE("Invalid window surface");
        return JNI_FALSE;
    }

    EGLDisplay display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    eglInitialize(display, nullptr, nullptr);

    const EGLint configAttribs[] = {
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT,
        EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
        EGL_RED_SIZE, 8,
        EGL_GREEN_SIZE, 8,
        EGL_BLUE_SIZE, 8,
        EGL_NONE
    };

    EGLConfig config;
    EGLint numConfigs;
    eglChooseConfig(display, configAttribs, &config, 1, &numConfigs);

    // Enforce Hardware-Backed Protected Memory (TrustZone/DRM)
    // Prevents CPU readback or side-channel frame-buffer scraping
    const EGLint contextAttribs[] = {
        EGL_CONTEXT_CLIENT_VERSION, 3,
        EGL_PROTECTED_CONTENT_EXT, EGL_TRUE, 
        EGL_NONE
    };

    EGLContext context = eglCreateContext(display, config, EGL_NO_CONTEXT, contextAttribs);
    if (context == EGL_NO_CONTEXT) {
        LOGE("Failed to create Protected EGL Context. Device may lack TrustZone HW support.");
        return JNI_FALSE;
    }

    const EGLint surfaceAttribs[] = {
        EGL_PROTECTED_CONTENT_EXT, EGL_TRUE,
        EGL_NONE
    };

    EGLSurface eglSurface = eglCreateWindowSurface(display, config, window, surfaceAttribs);
    
    eglMakeCurrent(display, eglSurface, eglSurface, context);
    LOGI("Hardware-backed Protected OpenGL ES Surface successfully created.");
    
    return JNI_TRUE;
}
