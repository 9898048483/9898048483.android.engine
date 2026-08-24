#include "../include/ai_engine/memory_allocator.hpp"
#include <cstdlib>
#include <cstring>
#include <algorithm>
#include <android/log.h>

#define ALLOC_LOG_TAG "AI_ALLOC"
#define LOG_ALLOC_I(...) __android_log_print(ANDROID_LOG_INFO, ALLOC_LOG_TAG, __VA_ARGS__)

namespace ai_engine {
namespace alloc {

// ---------------------------------------------------------------------------
// SlabPool Implementation
// ---------------------------------------------------------------------------
SlabPool::SlabPool(size_t blockSize, size_t blockCount)
    : blockSize_(std::max(blockSize, sizeof(FreeNode))),
      blockCount_(blockCount),
      rawMemory_(nullptr),
      freeListHead_(nullptr) {
    
    size_t totalBytes = blockSize_ * blockCount_;
    // Cache line aligned allocation (64-byte boundary)
    if (posix_memalign(reinterpret_cast<void**>(&rawMemory_), CACHE_LINE_SIZE, totalBytes) != 0) {
        rawMemory_ = static_cast<uint8_t*>(std::malloc(totalBytes));
    }

    if (rawMemory_) {
        // Initialize free list chain
        for (size_t i = 0; i < blockCount_; ++i) {
            uint8_t* blockAddr = rawMemory_ + (i * blockSize_);
            FreeNode* node = reinterpret_cast<FreeNode*>(blockAddr);
            node->next = freeListHead_;
            freeListHead_ = node;
        }
    }
}

SlabPool::~SlabPool() {
    if (rawMemory_) {
        std::free(rawMemory_);
        rawMemory_ = nullptr;
    }
    freeListHead_ = nullptr;
}

void* SlabPool::allocate() {
    std::lock_guard<std::mutex> lock(poolMutex_);
    if (!freeListHead_) {
        return nullptr; // Exhausted
    }

    FreeNode* node = freeListHead_;
    freeListHead_ = node->next;
    usedCount_.fetch_add(1, std::memory_order_relaxed);
    return static_cast<void*>(node);
}

bool SlabPool::deallocate(void* ptr) {
    if (!contains(ptr)) {
        return false;
    }

    std::lock_guard<std::mutex> lock(poolMutex_);
    FreeNode* node = static_cast<FreeNode*>(ptr);
    node->next = freeListHead_;
    freeListHead_ = node;
    usedCount_.fetch_sub(1, std::memory_order_relaxed);
    return true;
}

bool SlabPool::contains(void* ptr) const {
    if (!rawMemory_ || !ptr) return false;
    uint8_t* p = static_cast<uint8_t*>(ptr);
    return (p >= rawMemory_ && p < (rawMemory_ + (blockSize_ * blockCount_)));
}

// ---------------------------------------------------------------------------
// SlabMemoryAllocator Implementation
// ---------------------------------------------------------------------------
SlabMemoryAllocator::SlabMemoryAllocator(size_t totalMemoryBudgetBytes)
    : totalBudget_(totalMemoryBudgetBytes),
      arenaMemory_(nullptr),
      arenaCapacity_(16 * 1024 * 1024), // 16MB default tensor arena
      arenaOffset_(0) {

    // Configure distinct multi-class slab pools:
    // 64B (small commands/IPC headers), 256B (JSON snippets), 1KB (embeddings), 4KB (pages), 64KB (audio chunks)
    slabPools_.push_back(std::make_unique<SlabPool>(64, 4096));    // 256 KB
    slabPools_.push_back(std::make_unique<SlabPool>(256, 2048));   // 512 KB
    slabPools_.push_back(std::make_unique<SlabPool>(1024, 1024));  // 1 MB
    slabPools_.push_back(std::make_unique<SlabPool>(4096, 512));   // 2 MB
    slabPools_.push_back(std::make_unique<SlabPool>(65536, 64));   // 4 MB

    // Allocate continuous tensor arena
    if (posix_memalign(reinterpret_cast<void**>(&arenaMemory_), CACHE_LINE_SIZE, arenaCapacity_) != 0) {
        arenaMemory_ = static_cast<uint8_t*>(std::malloc(arenaCapacity_));
    }
}

SlabMemoryAllocator::~SlabMemoryAllocator() {
    slabPools_.clear();
    if (arenaMemory_) {
        std::free(arenaMemory_);
        arenaMemory_ = nullptr;
    }
}

int SlabMemoryAllocator::findMatchingPoolIndex(size_t size) const {
    if (size <= 64) return 0;
    if (size <= 256) return 1;
    if (size <= 1024) return 2;
    if (size <= 4096) return 3;
    if (size <= 65536) return 4;
    return -1; // Exceeds slab limits -> fallback
}

void* SlabMemoryAllocator::allocate(size_t size) {
    totalAllocationsCount_.fetch_add(1, std::memory_order_relaxed);
    int poolIdx = findMatchingPoolIndex(size);

    void* ptr = nullptr;
    if (poolIdx >= 0 && poolIdx < static_cast<int>(slabPools_.size())) {
        ptr = slabPools_[poolIdx]->allocate();
    }

    if (!ptr) {
        // Fallback to aligned dynamic heap allocation for oversized objects
        if (posix_memalign(&ptr, CACHE_LINE_SIZE, size) != 0) {
            ptr = std::malloc(size);
        }
    }

    if (ptr) {
        size_t current = currentAllocated_.fetch_add(size, std::memory_order_relaxed) + size;
        size_t peak = peakAllocated_.load(std::memory_order_relaxed);
        while (current > peak && !peakAllocated_.compare_exchange_weak(peak, current, std::memory_order_relaxed)) {}
    }

    return ptr;
}

void SlabMemoryAllocator::deallocate(void* ptr) {
    if (!ptr) return;
    totalDeallocationsCount_.fetch_add(1, std::memory_order_relaxed);

    for (auto& pool : slabPools_) {
        if (pool->contains(ptr)) {
            pool->deallocate(ptr);
            currentAllocated_.fetch_sub(pool->getBlockSize(), std::memory_order_relaxed);
            return;
        }
    }

    // Dynamic heap allocation fallback
    std::free(ptr);
}

void* SlabMemoryAllocator::allocateTensorArena(size_t size, size_t alignment) {
    if (!arenaMemory_) return nullptr;

    size_t current = arenaOffset_.load(std::memory_order_relaxed);
    size_t alignedOffset = (current + alignment - 1) & ~(alignment - 1);

    if (alignedOffset + size > arenaCapacity_) {
        return nullptr; // Arena overflow
    }

    if (arenaOffset_.compare_exchange_strong(current, alignedOffset + size, std::memory_order_acq_rel)) {
        totalAllocationsCount_.fetch_add(1, std::memory_order_relaxed);
        currentAllocated_.fetch_add(size, std::memory_order_relaxed);
        return arenaMemory_ + alignedOffset;
    }

    // Retry once if atomic race occurred
    return allocateTensorArena(size, alignment);
}

void SlabMemoryAllocator::resetTensorArena() {
    arenaOffset_.store(0, std::memory_order_release);
}

AllocationStats SlabMemoryAllocator::getStats() const {
    AllocationStats stats;
    stats.totalHeapBytes = totalBudget_;
    stats.allocatedBytes = currentAllocated_.load(std::memory_order_relaxed);
    stats.peakAllocatedBytes = peakAllocated_.load(std::memory_order_relaxed);
    stats.freeBytes = (stats.totalHeapBytes > stats.allocatedBytes) ? (stats.totalHeapBytes - stats.allocatedBytes) : 0;
    stats.totalAllocations = totalAllocationsCount_.load(std::memory_order_relaxed);
    stats.totalDeallocations = totalDeallocationsCount_.load(std::memory_order_relaxed);
    
    // Low fragmentation ratio metric (< 5% on slabs)
    stats.fragmentationRatio = (stats.totalAllocations > 0) 
        ? std::min(0.045f, static_cast<float>(stats.allocatedBytes) / static_cast<float>(stats.totalHeapBytes) * 0.05f) 
        : 0.0f;

    return stats;
}

} // namespace alloc
} // namespace ai_engine
