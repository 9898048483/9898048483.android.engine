#include <string>
#include <fstream>
#include <vector>
#include <unistd.h>
#include <sys/ptrace.h>
#include <cstring>
#include <android/log.h>

#define LOG_TAG "RASP_ENGINE"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Detects if the process is being traced by another process
bool checkTracerPid() {
    std::ifstream statusFile("/proc/self/status");
    std::string line;
    while (std::getline(statusFile, line)) {
        if (line.substr(0, 10) == "TracerPid:") {
            int tracerPid = std::stoi(line.substr(10));
            if (tracerPid != 0) {
                return true;
            }
        }
    }
    return false;
}

// Scans /proc/self/maps for known hooking frameworks
bool checkMaps() {
    std::ifstream mapsFile("/proc/self/maps");
    std::string line;
    std::vector<std::string> suspiciousPatterns = {
        "frida", "xposed", "substrate", "magisk", "libhoudini"
    };

    while (std::getline(mapsFile, line)) {
        for (const auto& pattern : suspiciousPatterns) {
            if (line.find(pattern) != std::string::npos) {
                LOGE("Detection: Suspicious map entry found: %s", line.c_str());
                return true;
            }
        }
    }
    return false;
}

// Trigger immediate termination if security check fails
void triggerSecurityViolation() {
    LOGE("Security violation detected. Terminating process.");
    exit(0);
}