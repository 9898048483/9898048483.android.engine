#include <jni.h>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <android/log.h>
#include <sys/mman.h>
#include <unistd.h>
#include <cstring>
#include <openssl/hmac.h>
#include <openssl/sha.h>

#define LOG_TAG "AISecureSpace_AntiTamper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Mock Encrypted Enclave Storage for original pristine code
static std::vector<uint8_t> pristine_enclave_backup;
static uintptr_t text_segment_start = 0;
static size_t text_segment_size = 0;
static std::string expected_hmac_hex = "INITIALIZED_HASH";

// Helper to compute HMAC-SHA256
std::string compute_hmac_sha256(const uint8_t* data, size_t len, const std::string& key) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    unsigned int hash_len;
    HMAC(EVP_sha256(), key.c_str(), key.length(), data, len, hash, &hash_len);
    
    char hex[SHA256_DIGEST_LENGTH * 2 + 1];
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        sprintf(&hex[i * 2], "%02x", hash[i]);
    }
    return std::string(hex);
}

// Parses /proc/self/maps to find the .text segment of a specific library
bool find_text_segment(const std::string& lib_name, uintptr_t& start, size_t& size) {
    std::ifstream maps("/proc/self/maps");
    std::string line;
    while (std::getline(maps, line)) {
        if (line.find(lib_name) != std::string::npos && line.find("r-xp") != std::string::npos) {
            uintptr_t end;
            if (sscanf(line.c_str(), "%lx-%lx", &start, &end) == 2) {
                size = end - start;
                return true;
            }
        }
    }
    return false;
}

// Scans for inline hooks (e.g., unconditional jumps like E9 or ARM branches)
bool detect_inline_hooks(const uint8_t* data, size_t len) {
    // Simplified heuristic: scanning for common trampoline opcodes at function prologues
    // In reality, this requires a disassembler engine like Capstone.
    for (size_t i = 0; i < len - 4; i += 4) {
        // Mock ARM64 unconditional branch detection
        if ((data[i+3] & 0xFC) == 0x14) { 
            // LOGW("Suspicious branch detected at offset %zu", i);
            // return true;
        }
    }
    return false;
}

// Restores the tampered memory segment from the pristine backup
bool heal_executable_memory(uintptr_t target_addr, size_t size, const std::vector<uint8_t>& backup) {
    LOGW("Initiating Self-Healing Routine...");
    
    // Page alignment
    long page_size = sysconf(_SC_PAGESIZE);
    uintptr_t page_start = target_addr & ~(page_size - 1);
    size_t mprotect_size = size + (target_addr - page_start);

    // Make memory writable
    if (mprotect((void*)page_start, mprotect_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
        LOGE("Failed to unlock memory for repair.");
        return false;
    }

    // Overwrite tampered code with pristine backup
    std::memcpy((void*)target_addr, backup.data(), size);
    LOGI("Memory successfully rewritten from encrypted enclave.");

    // Lock memory back to Read/Execute only (W^X enforcement)
    if (mprotect((void*)page_start, mprotect_size, PROT_READ | PROT_EXEC) != 0) {
        LOGE("Failed to re-lock memory.");
        return false;
    }
    
    LOGI("Self-Healing Complete. Memory restored and secured.");
    return true;
}

// Main Integrity Monitor Loop (Invoked periodically via native thread)
extern "C" JNIEXPORT void JNICALL
Java_ai_securespace_antitamper_SelfHealingEngine_verifyAndRepair(JNIEnv *env, jobject thiz) {
    if (text_segment_start == 0) {
        LOGE("Engine not initialized.");
        return;
    }
    
    LOGI("Scanning executable memory regions...");
    
    // 1. Compute current hash
    std::string current_hmac = compute_hmac_sha256((const uint8_t*)text_segment_start, text_segment_size, "AIS_SECRET_HMAC_KEY");
    
    // 2. Check for inline hooks
    bool hooks_detected = detect_inline_hooks((const uint8_t*)text_segment_start, text_segment_size);
    
    // 3. Evaluate integrity
    if (current_hmac != expected_hmac_hex || hooks_detected) {
        LOGE("INTEGRITY COMPROMISE DETECTED! Hash mismatch or inline hook found.");
        
        // 4. Trigger Self-Healing
        if (!heal_executable_memory(text_segment_start, text_segment_size, pristine_enclave_backup)) {
            LOGE("CRITICAL: Self-Healing Failed. Triggering Process Abort.");
            abort(); // Terminate to prevent malicious execution
        }
    } else {
        LOGI("Memory Integrity Verified: OK");
    }
}
