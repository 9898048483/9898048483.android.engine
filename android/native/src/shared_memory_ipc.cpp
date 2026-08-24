#include "../include/ai_engine/shared_memory_ipc.hpp"
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstring>
#include <chrono>
#include <thread>
#include <android/log.h>

#define IPC_LOG_TAG "AI_SHM_IPC"
#define LOG_IPC_I(...) __android_log_print(ANDROID_LOG_INFO, IPC_LOG_TAG, __VA_ARGS__)
#define LOG_IPC_E(...) __android_log_print(ANDROID_LOG_ERROR, IPC_LOG_TAG, __VA_ARGS__)

namespace ai_engine {
namespace ipc {

static uint64_t getCurrentTimeNs() {
    auto now = std::chrono::high_resolution_clock::now();
    return std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
}

SharedMemoryChannel::SharedMemoryChannel(const std::string& channelName, size_t sizeBytes)
    : channelName_(channelName),
      totalSizeBytes_(sizeBytes),
      shmFd_(-1),
      mappedAddress_(nullptr),
      controlBlock_(nullptr),
      slots_(nullptr),
      isCreator_(false),
      isMapped_(false) {}

SharedMemoryChannel::~SharedMemoryChannel() {
    closeChannel();
}

uint32_t SharedMemoryChannel::computeChecksum(const void* data, size_t len) {
    const uint8_t* ptr = static_cast<const uint8_t*>(data);
    uint32_t hash = 2166136261u; // FNV-1a 32-bit offset basis
    for (size_t i = 0; i < len; ++i) {
        hash ^= ptr[i];
        hash *= 16777619u;
    }
    return hash;
}

bool SharedMemoryChannel::openChannel(bool createIfMissing) {
    if (isMapped_) {
        return true;
    }

    std::string shmPath = "/" + channelName_;
    
    // On Android Bionic, POSIX shm is backed by /dev/shm or ashmem/memfd_create
    shmFd_ = shm_open(shmPath.c_str(), O_RDWR | (createIfMissing ? O_CREAT : 0), 0660);
    if (shmFd_ < 0) {
        // Fallback for environments where shm_open prefix is restricted
        std::string fallbackPath = "/data/local/tmp/" + channelName_ + ".shm";
        shmFd_ = open(fallbackPath.c_str(), O_RDWR | (createIfMissing ? (O_CREAT | O_TRUNC) : 0), 0660);
        if (shmFd_ < 0) {
            LOG_IPC_E("Failed to open shared memory file: %s", channelName_.c_str());
            return false;
        }
    }

    struct stat sb;
    if (fstat(shmFd_, &sb) == 0 && sb.st_size < static_cast<off_t>(totalSizeBytes_)) {
        if (ftruncate(shmFd_, totalSizeBytes_) != 0) {
            LOG_IPC_E("Failed to truncate shared memory file to %zu bytes", totalSizeBytes_);
            ::close(shmFd_);
            shmFd_ = -1;
            return false;
        }
        isCreator_ = true;
    }

    mappedAddress_ = mmap(nullptr, totalSizeBytes_, PROT_READ | PROT_WRITE, MAP_SHARED, shmFd_, 0);
    if (mappedAddress_ == MAP_FAILED || !mappedAddress_) {
        LOG_IPC_E("Failed to mmap shared memory region");
        ::close(shmFd_);
        shmFd_ = -1;
        mappedAddress_ = nullptr;
        return false;
    }

    controlBlock_ = reinterpret_cast<ShmControlBlock*>(mappedAddress_);
    uint8_t* bytePtr = reinterpret_cast<uint8_t*>(mappedAddress_);
    slots_ = reinterpret_cast<IpcSlot*>(bytePtr + sizeof(ShmControlBlock));

    if (isCreator_ || controlBlock_->magic != IPC_MAGIC) {
        std::memset(mappedAddress_, 0, totalSizeBytes_);
        controlBlock_->magic = IPC_MAGIC;
        controlBlock_->version = IPC_VERSION;
        controlBlock_->totalSize = static_cast<uint32_t>(totalSizeBytes_);
        controlBlock_->slotCount = DEFAULT_RING_BUFFER_SLOTS;
        controlBlock_->slotSize = sizeof(IpcSlot);
        controlBlock_->writeHead.store(0, std::memory_order_release);
        controlBlock_->readTail.store(0, std::memory_order_release);
        controlBlock_->totalPacketsSent.store(0, std::memory_order_relaxed);
        controlBlock_->totalPacketsReceived.store(0, std::memory_order_relaxed);
        controlBlock_->activeProcs.store(1, std::memory_order_relaxed);
    } else {
        controlBlock_->activeProcs.fetch_add(1, std::memory_order_relaxed);
    }

    isMapped_ = true;
    LOG_IPC_I("Shared memory channel '%s' connected. Capacity: %zu bytes", channelName_.c_str(), totalSizeBytes_);
    return true;
}

void SharedMemoryChannel::closeChannel() {
    if (isMapped_ && mappedAddress_) {
        if (controlBlock_) {
            controlBlock_->activeProcs.fetch_sub(1, std::memory_order_relaxed);
        }
        munmap(mappedAddress_, totalSizeBytes_);
        mappedAddress_ = nullptr;
        controlBlock_ = nullptr;
        slots_ = nullptr;
        isMapped_ = false;
    }
    if (shmFd_ >= 0) {
        ::close(shmFd_);
        shmFd_ = -1;
    }
}

bool SharedMemoryChannel::isConnected() const {
    return isMapped_ && mappedAddress_ != nullptr;
}

bool SharedMemoryChannel::writePacket(PacketType type, const void* data, size_t length, uint32_t* outSeqId) {
    if (!isConnected() || length > MAX_INLINE_PAYLOAD_SIZE) {
        return false;
    }

    uint32_t currentHead = controlBlock_->writeHead.load(std::memory_order_relaxed);
    uint32_t slotIdx = currentHead % controlBlock_->slotCount;
    IpcSlot& slot = slots_[slotIdx];

    // Atomically claim the slot
    uint32_t expected = 0; // 0 = Free
    if (!slot.status.compare_exchange_strong(expected, 1, std::memory_order_acq_rel)) {
        // Slot is busy or ring buffer is full
        return false;
    }

    // Populate header
    slot.header.magic = IPC_MAGIC;
    slot.header.sequenceId = currentHead + 1;
    slot.header.payloadType = static_cast<uint32_t>(type);
    slot.header.payloadLength = static_cast<uint32_t>(length);
    slot.header.timestampNs = getCurrentTimeNs();
    slot.header.checksum = computeChecksum(data, length);
    slot.header.flags = 0x01; // Ready

    // Copy payload (Zero-copy directly into mmap'd shared space)
    std::memcpy(slot.payload, data, length);

    // Mark slot as ready for consumption
    slot.status.store(2, std::memory_order_release);
    controlBlock_->writeHead.fetch_add(1, std::memory_order_acq_rel);
    controlBlock_->totalPacketsSent.fetch_add(1, std::memory_order_relaxed);

    if (outSeqId) {
        *outSeqId = slot.header.sequenceId;
    }
    return true;
}

bool SharedMemoryChannel::readPacket(IpcPacket& outPacket, uint32_t timeoutMs) {
    if (!isConnected()) {
        return false;
    }

    auto startTime = std::chrono::steady_clock::now();

    while (true) {
        uint32_t tail = controlBlock_->readTail.load(std::memory_order_relaxed);
        uint32_t head = controlBlock_->writeHead.load(std::memory_order_acquire);

        if (tail < head) {
            uint32_t slotIdx = tail % controlBlock_->slotCount;
            IpcSlot& slot = slots_[slotIdx];

            uint32_t status = slot.status.load(std::memory_order_acquire);
            if (status == 2) { // Ready
                if (slot.status.compare_exchange_strong(status, 3, std::memory_order_acq_rel)) { // Reading
                    outPacket.sequenceId = slot.header.sequenceId;
                    outPacket.type = static_cast<PacketType>(slot.header.payloadType);
                    outPacket.timestampNs = slot.header.timestampNs;
                    outPacket.data.resize(slot.header.payloadLength);

                    std::memcpy(outPacket.data.data(), slot.payload, slot.header.payloadLength);

                    // Free slot back to pool
                    slot.status.store(0, std::memory_order_release);
                    controlBlock_->readTail.fetch_add(1, std::memory_order_acq_rel);
                    controlBlock_->totalPacketsReceived.fetch_add(1, std::memory_order_relaxed);
                    return true;
                }
            }
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - startTime).count();
        if (elapsed >= timeoutMs) {
            break;
        }
        std::this_thread::yield();
    }

    return false;
}

void* SharedMemoryChannel::getRawBaseAddress() const {
    return mappedAddress_;
}

size_t SharedMemoryChannel::getTotalCapacity() const {
    return totalSizeBytes_;
}

int SharedMemoryChannel::getFd() const {
    return shmFd_;
}

size_t SharedMemoryChannel::getUnreadCount() const {
    if (!controlBlock_) return 0;
    uint32_t head = controlBlock_->writeHead.load(std::memory_order_relaxed);
    uint32_t tail = controlBlock_->readTail.load(std::memory_order_relaxed);
    return (head >= tail) ? (head - tail) : 0;
}

uint64_t SharedMemoryChannel::getTotalSent() const {
    return controlBlock_ ? controlBlock_->totalPacketsSent.load(std::memory_order_relaxed) : 0;
}

uint64_t SharedMemoryChannel::getTotalReceived() const {
    return controlBlock_ ? controlBlock_->totalPacketsReceived.load(std::memory_order_relaxed) : 0;
}

} // namespace ipc
} // namespace ai_engine
