#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ptrace.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <android/log.h>

#define LOG_TAG "KernelAttestation"
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

/**
 * Kernel Attestation & Anti-Debugging Enclave
 * Proactively verifies environment integrity before sensitive cryptographic operations.
 */
class KernelAttestationGuard {
public:
    /**
     * Checks if current process is being traced/debugged via TracerPid in /proc/self/status
     */
    static bool isDebuggerAttached() {
        FILE* fp = fopen("/proc/self/status", "r");
        if (!fp) return false;

        char line[256];
        int tracerPid = 0;

        while (fgets(line, sizeof(line), fp)) {
            if (strncmp(line, "TracerPid:", 10) == 0) {
                tracerPid = atoi(&line[10]);
                break;
            }
        }
        fclose(fp);

        if (tracerPid != 0) {
            LOGW("Security Alert: Debugger/Tracer attached! TracerPid: %d", tracerPid);
            return true;
        }
        return false;
    }

    /**
     * Self-attachment check: Prevents external ptrace attachments
     */
    static bool denyPtraceAttachment() {
        if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
            LOGW("Security Alert: ptrace TRACEME rejected (Debugger already hooked).");
            return false;
        }
        return true;
    }

    /**
     * Detects common root / Magisk / Frida hooking binaries in system paths
     */
    static bool isDeviceCompromised() {
        const char* suspectPaths[] = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/data/adb/magisk",
            "/data/local/tmp/frida-server"
        };

        for (size_t i = 0; i < sizeof(suspectPaths) / sizeof(suspectPaths[0]); ++i) {
            struct stat sb;
            if (stat(suspectPaths[i], &sb) == 0) {
                LOGW("Security Warning: Root/Hooking artifact detected at %s", suspectPaths[i]);
                return true;
            }
        }
        return false;
    }
};
