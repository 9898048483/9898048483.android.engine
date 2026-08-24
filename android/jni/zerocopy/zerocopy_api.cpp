#include "lockfree_ringbuffer.hpp"

// Global Instance (16MB Pool)
static SpscZeroCopyPool<16 * 1024 * 1024> global_pool;

extern "C" {
    uint8_t* zc_reserve_write(size_t size) { return global_pool.reserve_write(size); }
    void zc_commit_write(size_t size) { global_pool.commit_write(size); }
    
    const uint8_t* zc_consume_read(size_t* out_size) {
        size_t sz = 0;
        const uint8_t* ptr = global_pool.consume_read(sz);
        if (out_size) *out_size = sz;
        return ptr;
    }
    void zc_commit_read(size_t size) { global_pool.commit_read(size); }
    
    // Direct pointer access for Python memoryview (Zero GC pauses)
    uint8_t* zc_get_buffer_ptr() { return global_pool.get_raw_ptr(); }
    size_t zc_get_capacity() { return global_pool.get_capacity(); }
}
