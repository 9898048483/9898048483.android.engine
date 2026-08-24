#pragma once
#include <atomic>
#include <cstdint>
#include <cstddef>
#include <stdexcept>
#include <android/log.h>

#define LOG_TAG "ZeroCopyPool"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

// High-Throughput SPSC (Single-Producer / Single-Consumer) Lock-Free Ring Buffer
// Designed for Zero-Copy data passing between C++ NDK, Rust, and Python.
template<size_t Capacity>
class SpscZeroCopyPool {
private:
    // 64-byte alignment to prevent false sharing on CPU cache lines
    alignas(64) uint8_t buffer_[Capacity];
    alignas(64) std::atomic<size_t> head_{0};
    alignas(64) std::atomic<size_t> tail_{0};

public:
    // Reserve space for writing without copying (Zero-Copy Write)
    uint8_t* reserve_write(size_t size) {
        size_t current_tail = tail_.load(std::memory_order_relaxed);
        size_t current_head = head_.load(std::memory_order_acquire);
        
        size_t available = (current_head > current_tail) 
                           ? (current_head - current_tail - 1) 
                           : (Capacity - current_tail + current_head - 1);
                           
        // Strict Bounds Checking
        if (size > available || current_tail + size > Capacity) {
            return nullptr; // Buffer full or contiguous space fragmented
        }
        return &buffer_[current_tail];
    }

    // Commit written bytes, advancing the tail atomically
    void commit_write(size_t size) {
        size_t current_tail = tail_.load(std::memory_order_relaxed);
        tail_.store((current_tail + size) % Capacity, std::memory_order_release);
    }

    // Access readable bytes without copying (Zero-Copy Read)
    const uint8_t* consume_read(size_t& out_size) {
        size_t current_head = head_.load(std::memory_order_relaxed);
        size_t current_tail = tail_.load(std::memory_order_acquire);
        
        if (current_head == current_tail) {
            out_size = 0;
            return nullptr; // Buffer empty
        }
        
        out_size = (current_tail > current_head) ? (current_tail - current_head) : (Capacity - current_head);
        return &buffer_[current_head];
    }

    // Commit read bytes, advancing the head atomically
    void commit_read(size_t size) {
        size_t current_head = head_.load(std::memory_order_relaxed);
        head_.store((current_head + size) % Capacity, std::memory_order_release);
    }
    
    // For Python ctypes memoryview integration
    uint8_t* get_raw_ptr() { return buffer_; }
    size_t get_capacity() { return Capacity; }
};
