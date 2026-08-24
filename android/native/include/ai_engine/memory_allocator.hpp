#ifndef AI_ENGINE_MEMORY_ALLOCATOR_HPP
#define AI_ENGINE_MEMORY_ALLOCATOR_HPP

#include <cstdint>
#include <cstddef>
#include <vector>
#include <mutex>
#include <atomic>
#include <memory>

namespace ai_engine {
namespace alloc {

// Cache line alignment for ARM64 and x86_64 architectures (64 bytes)
constexpr size_t CACHE_LINE_SIZE = 64;

struct AllocationStats {
    size_t totalHeapBytes;
    size_t allocatedBytes;
    size_t freeBytes;
    size_t peakAllocatedBytes;
    uint64_t totalAllocations;
    uint64_t totalDeallocations;
    float fragmentationRatio;
};

/**
 * @brief Fixed-size block slab pool for deterministic O(1) allocation without heap contention.
 */
class SlabPool {
public:
    SlabPool(size_t blockSize, size_t blockCount);
    ~SlabPool();

    void* allocate();
    bool deallocate(void* ptr);
    bool contains(void* ptr) const;

    size_t getBlockSize() const { return blockSize_; }
    size_t getBlockCount() const { return blockCount_; }
    size_t getUsedCount() const { return usedCount_.load(std::memory_order_relaxed); }

private:
    struct FreeNode {
        FreeNode* next;
    };

    size_t blockSize_;
    size_t blockCount_;
    uint8_t* rawMemory_;
    FreeNode* freeListHead_;
    std::atomic<size_t> usedCount_{0};
    mutable std::mutex poolMutex_;
};

/**
 * @brief High-performance Multi-Class Slab Memory Allocator (64B, 256B, 1KB, 4KB, 64KB slabs + Tensor Arena).
 */
class SlabMemoryAllocator {
public:
    SlabMemoryAllocator(size_t totalMemoryBudgetBytes = 32 * 1024 * 1024);
    ~SlabMemoryAllocator();

    void* allocate(size_t size);
    void deallocate(void* ptr);

    // Fast tensor buffer allocation in continuous Arena
    void* allocateTensorArena(size_t size, size_t alignment = CACHE_LINE_SIZE);
    void resetTensorArena();

    AllocationStats getStats() const;

private:
    size_t totalBudget_;
    std::vector<std::unique_ptr<SlabPool>> slabPools_;

    // Continuous Arena for high-frequency ML inference tensors
    uint8_t* arenaMemory_;
    size_t arenaCapacity_;
    std::atomic<size_t> arenaOffset_{0};

    // Tracking counters
    std::atomic<size_t> currentAllocated_{0};
    std::atomic<size_t> peakAllocated_{0};
    std::atomic<uint64_t> totalAllocationsCount_{0};
    std::atomic<uint64_t> totalDeallocationsCount_{0};
    mutable std::mutex allocatorMutex_;

    int findMatchingPoolIndex(size_t size) const;
};

} // namespace alloc
} // namespace ai_engine

#endif // AI_ENGINE_MEMORY_ALLOCATOR_HPP
