#include <jni.h>

// Declarations of functions in rasp_engine.cpp
bool checkTracerPid();
bool checkMaps();
void triggerSecurityViolation();

extern "C" JNIEXPORT void JNICALL
Java_ai_securespace_securespaceclient_RaspManager_initRasp(JNIEnv* env, jobject /* this */) {
    if (checkTracerPid() || checkMaps()) {
        triggerSecurityViolation();
    }
}
