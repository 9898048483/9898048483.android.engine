#ifndef AI_ENGINE_NATIVE_BRIDGE_HPP
#define AI_ENGINE_NATIVE_BRIDGE_HPP

#include <jni.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <atomic>
#include <functional>
#include "jni_utils.hpp"
#include "shared_memory_ipc.hpp"
#include "memory_allocator.hpp"
#include "locale_detector.hpp"

namespace ai_engine {

enum class RuntimeState : uint32_t {
    UNINITIALIZED = 0,
    INITIALIZING = 1,
    RUNNING = 2,
    PAUSED = 3,
    TERMINATING = 4,
    ERROR_STATE = 5
};

struct EngineConfig {
    uint32_t sharedMemorySizeMb{16};
    uint32_t slabPoolCount{4};
    bool enablePythonBridge{true};
    bool enableTelemetry{true};
    std::string appDataDir;
    std::string defaultLocale;
};

struct ExecutionResult {
    bool success;
    int32_t statusCode;
    std::string output;
    double executionLatencyMs;
    size_t memoryAllocatedBytes;
};

/**
 * @brief Thread-safe Native Bridge coordinating C++, Java/Kotlin, and Python (Chaquopy/Kivy) layers.
 */
class NativeBridge {
public:
    static NativeBridge& getInstance();

    // Lifecycle
    bool initialize(const EngineConfig& config, JavaVM* vm = nullptr);
    void shutdown();
    RuntimeState getState() const;

    // Cross-Language Python Execution (Thread-Safe GIL Synchronization)
    ExecutionResult executePythonScript(const std::string& scriptName, const std::string& functionName, const std::vector<uint8_t>& payload);
    ExecutionResult dispatchToKotlin(const std::string& targetClass, const std::string& targetMethod, const std::string& jsonArgs);

    // Shared Memory Operations
    ipc::SharedMemoryChannel* getIpcChannel();
    alloc::SlabMemoryAllocator* getAllocator();
    locale::LocaleDetector* getLocaleDetector();

    // Telemetry and Health
    struct BridgeStats {
        uint64_t totalJniCalls;
        uint64_t totalPythonDispatches;
        uint64_t totalIpcPackets;
        size_t totalBytesTransferred;
        double avgJniLatencyMicros;
        std::string currentLocale;
        size_t memoryUsedBytes;
        size_t memoryFreeBytes;
    };

    BridgeStats getStats();

    void recordJniCall(double latencyMicros);

private:
    NativeBridge();
    ~NativeBridge();
    NativeBridge(const NativeBridge&) = delete;
    NativeBridge& operator=(const NativeBridge&) = delete;

    std::atomic<RuntimeState> state_{RuntimeState::UNINITIALIZED};
    EngineConfig config_;
    
    std::unique_ptr<ipc::SharedMemoryChannel> ipcChannel_;
    std::unique_ptr<alloc::SlabMemoryAllocator> allocator_;
    std::unique_ptr<locale::LocaleDetector> localeDetector_;

    std::atomic<uint64_t> totalJniCalls_{0};
    std::atomic<uint64_t> totalPythonDispatches_{0};
    std::atomic<uint64_t> totalIpcPackets_{0};
    std::atomic<uint64_t> totalBytesTransferred_{0};
    std::atomic<double> totalJniLatencyAccum_{0.0};

    mutable std::mutex bridgeMutex_;
    mutable std::mutex pythonGilMutex_;
};

} // namespace ai_engine

#endif // AI_ENGINE_NATIVE_BRIDGE_HPP
