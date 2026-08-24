#ifndef AI_ENGINE_SHARED_MEMORY_IPC_HPP
#define AI_ENGINE_SHARED_MEMORY_IPC_HPP

#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>
#include <atomic>
#include <memory>
#include <sys/types.h>

namespace ai_engine {
namespace ipc {

constexpr uint32_t IPC_MAGIC = 0x4149534D; // "AISM" (AI Shared Memory)
constexpr uint32_t IPC_VERSION = 1;
constexpr size_t DEFAULT_RING_BUFFER_SLOTS = 256;
constexpr size_t MAX_INLINE_PAYLOAD_SIZE = 64 * 1024; // 64KB per slot

#pragma pack(push, 1)

/**
 * @brief Header for an individual IPC packet within shared memory ring buffer.
 */
struct IpcPacketHeader {
    uint32_t magic;
    uint32_t sequenceId;
    uint32_t payloadType; // 1: Raw Bytes, 2: JSON, 3: Tensor Frame, 4: Python Bytecode
    uint32_t payloadLength;
    uint64_t timestampNs;
    uint32_t checksum;
    uint8_t  flags;       // Bit 0: Ready, Bit 1: Acked, Bit 2: Compressed
    uint8_t  reserved[3];
};

/**
 * @brief Memory layout of a single slot in the POSIX circular buffer.
 */
struct IpcSlot {
    std::atomic<uint32_t> status; // 0: Free, 1: Writing, 2: Ready, 3: Reading
    IpcPacketHeader header;
    uint8_t payload[MAX_INLINE_PAYLOAD_SIZE];
};

/**
 * @brief Root control block stored at offset 0 of the mmap'd POSIX shared memory file.
 */
struct ShmControlBlock {
    uint32_t magic;
    uint32_t version;
    uint32_t totalSize;
    uint32_t slotCount;
    uint32_t slotSize;
    
    std::atomic<uint32_t> writeHead;
    std::atomic<uint32_t> readTail;
    std::atomic<uint64_t> totalPacketsSent;
    std::atomic<uint64_t> totalPacketsReceived;
    std::atomic<uint32_t> activeProcs; // Process count attached (Java/Kotlin + Python)
    
    uint8_t padding[64]; // Cache-line alignment
};

#pragma pack(pop)

enum class PacketType : uint32_t {
    RAW_BINARY = 1,
    JSON_COMMAND = 2,
    AI_TENSOR_BUFFER = 3,
    PYTHON_EXEC_CODE = 4,
    HEARTBEAT_PING = 5
};

struct IpcPacket {
    uint32_t sequenceId;
    PacketType type;
    uint64_t timestampNs;
    std::vector<uint8_t> data;
};

/**
 * @brief POSIX Shared Memory IPC Channel orchestrator (Zero-copy, lock-free ring buffer).
 */
class SharedMemoryChannel {
public:
    SharedMemoryChannel(const std::string& channelName, size_t sizeBytes = 16 * 1024 * 1024);
    ~SharedMemoryChannel();

    bool openChannel(bool createIfMissing = true);
    void closeChannel();
    bool isConnected() const;

    // Zero-Copy Enqueue / Dequeue
    bool writePacket(PacketType type, const void* data, size_t length, uint32_t* outSeqId = nullptr);
    bool readPacket(IpcPacket& outPacket, uint32_t timeoutMs = 100);

    // Direct buffer sharing for Java DirectByteBuffer and Python ctypes memoryview
    void* getRawBaseAddress() const;
    size_t getTotalCapacity() const;
    int getFd() const;

    // Health & Stats
    size_t getUnreadCount() const;
    uint64_t getTotalSent() const;
    uint64_t getTotalReceived() const;
    const std::string& getChannelName() const { return channelName_; }

private:
    std::string channelName_;
    size_t totalSizeBytes_;
    int shmFd_;
    void* mappedAddress_;
    ShmControlBlock* controlBlock_;
    IpcSlot* slots_;
    bool isCreator_;
    bool isMapped_;

    uint32_t computeChecksum(const void* data, size_t len);
};

} // namespace ipc
} // namespace ai_engine

#endif // AI_ENGINE_SHARED_MEMORY_IPC_HPP
