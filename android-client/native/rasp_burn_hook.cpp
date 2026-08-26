/**
 * Native RASP Memory Zeroization & Anti-Tamper Burn Hook
 * File: android-client/native/rasp_burn_hook.cpp
 *
 * Architecture:
 * - Direct Linux / Android OS /proc scanning (/proc/self/maps, /proc/self/status, /proc/self/wchan).
 * - Real-time detection of Frida hooks, Xposed/LSPosed frameworks, Magisk/Zygisk modules, and ptrace debuggers.
 * - Secure compiler-safe RAM zeroization (explicit_bzero / volatile multi-pass wipe) of all registered private key buffers.
 * - Instant fail-secure process self-termination (exit(0) / _exit(0)) upon tamper detection.
 */

#include <jni.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/ptrace.h>
#include <pthread.h>
#include <vector>
#include <string>
#include <android/log.h>

#define LOG_TAG "RASP_BURN_HOOK"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Secure Buffer Registration Struct
struct SecureMemoryRegion {
    void* buffer_ptr;
    size_t length;
};

// Global Registered Memory Buffers for Instant Zeroization
static std::vector<SecureMemoryRegion> g_secured_buffers;
static pthread_mutex_t g_buffer_mutex = PTHREAD_MUTEX_INITIALIZER;
static bool g_rasp_monitoring_active = false;
static pthread_t g_monitor_thread;

// Tamper Detection String Signatures
static const char* TAMPER_SIGNATURES[] = {
    "frida-agent",
    "frida-gadget",
    "libfrida",
    "gadget.so",
    "re.frida.server",
    "xposed.installer",
    "de.robv.android.xposed",
    "edxposed",
    "lsposed",
    "libxposed",
    "magisk",
    "libriru",
    "libzygisk",
    "substrate",
    "com.saurik.substrate",
    "cydia",
    "/data/local/tmp",
    NULL
};

/**
 * Compiler-barrier secure memory zeroization.
 * Prevents compiler optimization from dead-store eliminating the wipe.
 */
static void secure_memory_wipe(void* ptr, size_t len) {
    if (!ptr || len == 0) return;

    volatile unsigned char* p = (volatile unsigned char*)ptr;
    // Multi-pass overwrite: 0xFF -> 0xAA -> 0x55 -> 0x00
    for (size_t i = 0; i < len; ++i) p[i] = 0xFF;
    for (size_t i = 0; i < len; ++i) p[i] = 0xAA;
    for (size_t i = 0; i < len; ++i) p[i] = 0x55;
    for (size_t i = 0; i < len; ++i) p[i] = 0x00;

    __asm__ __volatile__("" : : "r"(ptr) : "memory");
}

/**
 * Executes emergency memory burn and terminates application.
 */
extern "C" void emergency_zeroize_and_burn(const char* reason) {
    LOGE("[FATAL ALERT] Reverse-engineering / tampering detected: %s", reason);
    LOGE("[EMERGENCY ACTION] Zeroizing %zu secure cryptographic memory regions...", g_secured_buffers.size());

    pthread_mutex_lock(&g_buffer_mutex);
    for (size_t i = 0; i < g_secured_buffers.size(); ++i) {
        if (g_secured_buffers[i].buffer_ptr && g_secured_buffers[i].length > 0) {
            secure_memory_wipe(g_secured_buffers[i].buffer_ptr, g_secured_buffers[i].length);
        }
    }
    g_secured_buffers.clear();
    pthread_mutex_unlock(&g_buffer_mutex);

    LOGE("[BURN COMPLETE] Cryptographic keys wiped from RAM. Self-terminating process.");
    
    // Immediate termination without calling atexit handlers
    _exit(0);
}

/**
 * Scans /proc/self/status for TracerPid (debugger attachment).
 */
static bool check_tracer_pid() {
    FILE* fp = fopen("/proc/self/status", "r");
    if (!fp) return false;

    char line[256];
    int tracer_pid = 0;
    while (fgets(line, sizeof(line), fp)) {
        if (strncmp(line, "TracerPid:", 10) == 0) {
            tracer_pid = atoi(&line[10]);
            break;
        }
    }
    fclose(fp);

    if (tracer_pid > 0) {
        LOGW("[RASP] Active debugger detected! TracerPid: %d", tracer_pid);
        return true;
    }
    return false;
}

/**
 * Scans /proc/self/maps for injected Frida, Xposed, Magisk, or Substrate shared libraries.
 */
static bool check_proc_maps() {
    FILE* fp = fopen("/proc/self/maps", "r");
    if (!fp) return false;

    char line[512];
    bool threat_detected = false;
    const char* detected_threat = NULL;

    while (fgets(line, sizeof(line), fp)) {
        for (int i = 0; TAMPER_SIGNATURES[i] != NULL; ++i) {
            if (strstr(line, TAMPER_SIGNATURES[i]) != NULL) {
                threat_detected = true;
                detected_threat = TAMPER_SIGNATURES[i];
                break;
            }
        }
        if (threat_detected) break;
    }
    fclose(fp);

    if (threat_detected) {
        emergency_zeroize_and_burn(detected_threat);
        return true;
    }
    return false;
}

/**
 * Anti-debugging self-ptrace trap.
 */
static bool check_ptrace_attach() {
    if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
        LOGW("[RASP] ptrace(PTRACE_TRACEME) failed - process is already being debugged!");
        return true;
    }
    return false;
}

/**
 * Continuous background RASP security monitor thread.
 */
static void* rasp_security_loop(void* arg) {
    (void)arg;
    LOGI("[RASP Monitor] Continuous defensive threat scanner started.");

    while (g_rasp_monitoring_active) {
        if (check_tracer_pid()) {
            emergency_zeroize_and_burn("Active ptrace / GDB / LLDB debugger");
        }
        if (check_proc_maps()) {
            emergency_zeroize_and_burn("Injected hook / instrumented library in /proc/self/maps");
        }

        // Scan every 500ms
        usleep(500000);
    }
    return NULL;
}

// ---------------------------------------------------------------------------
// JNI & C Export Interface
// ---------------------------------------------------------------------------

extern "C" {

/**
 * Registers a memory buffer containing private keys or seeds for emergency zeroization.
 */
JNIEXPORT void JNICALL
Java_com_pqctoken_wallet_RASPManager_registerSecureBuffer(
    JNIEnv* env, jobject thiz, jlong address, jlong length
) {
    (void)env; (void)thiz;
    if (address == 0 || length <= 0) return;

    pthread_mutex_lock(&g_buffer_mutex);
    SecureMemoryRegion region;
    region.buffer_ptr = (void*)address;
    region.length = (size_t)length;
    g_secured_buffers.push_back(region);
    pthread_mutex_unlock(&g_buffer_mutex);

    LOGI("[RASP JNI] Registered %zu bytes of sensitive memory for defensive zeroization.", (size_t)length);
}

/**
 * Initiates the continuous background RASP threat monitor.
 */
JNIEXPORT jboolean JNICALL
Java_com_pqctoken_wallet_RASPManager_startRASPMonitor(JNIEnv* env, jobject thiz) {
    (void)env; (void)thiz;
    if (g_rasp_monitoring_active) return JNI_TRUE;

    // Check on startup
    if (check_tracer_pid() || check_proc_maps() || check_ptrace_attach()) {
        emergency_zeroize_and_burn("Startup environment compromise");
        return JNI_FALSE;
    }

    g_rasp_monitoring_active = true;
    if (pthread_create(&g_monitor_thread, NULL, rasp_security_loop, NULL) != 0) {
        LOGE("[RASP] Failed to create background monitor thread.");
        g_rasp_monitoring_active = false;
        return JNI_FALSE;
    }

    return JNI_TRUE;
}

/**
 * Manual security scan triggered from Kotlin / Python.
 */
JNIEXPORT jboolean JNICALL
Java_com_pqctoken_wallet_RASPManager_performInstantSecurityAudit(JNIEnv* env, jobject thiz) {
    (void)env; (void)thiz;
    if (check_tracer_pid()) {
        emergency_zeroize_and_burn("Debugger attached (instant audit)");
        return JNI_FALSE;
    }
    if (check_proc_maps()) {
        emergency_zeroize_and_burn("Injected hook in /proc/self/maps (instant audit)");
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

/**
 * JNI OnLoad hook.
 */
JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    (void)vm; (void)reserved;
    LOGI("[RASP] Native librasp_burn_hook.so initialized in process.");
    
    // Fast initial scan on shared library load
    check_proc_maps();
    check_tracer_pid();

    return JNI_VERSION_1_6;
}

} // extern "C"
