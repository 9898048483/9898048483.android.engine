#include <sys/mman.h>
#include <sys/ptrace.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <android/log.h>

#define LOG_TAG "DMAMemoryGuard"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

/**
 * Direct Memory Access (DMA) & Physical Heap Isolation Guard
 * Locks sensitive memory pages in physical RAM and disables core dumps / swap allocation.
 */
class DMAMemoryGuard {
public:
    static void* allocateGuardedPage(size_t size) {
        // Allocate page-aligned memory anonymous mapping
        void* ptr = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (ptr == MAP_FAILED) {
            LOGE("mmap failed during guarded memory allocation");
            return NULL;
        }

        // Lock in RAM: Prevents OS from paging/swapping sensitive keys to disk
        if (mlock(ptr, size) != 0) {
            LOGE("mlock failed: page swapping not disabled");
        }

        // Advise kernel to exclude this range from process core dumps (MADV_DONTDUMP)
        #ifdef MADV_DONTDUMP
        madvise(ptr, size, MADV_DONTDUMP);
        #endif

        return ptr;
    }

    static void freeGuardedPage(void* ptr, size_t size) {
        if (!ptr || size == 0) return;

        // Force hardware scrub before release
        volatile uint8_t* p = (volatile uint8_t*)ptr;
        for (size_t i = 0; i < size; ++i) {
            p[i] = 0x00;
        }

        munlock(ptr, size);
        munmap(ptr, size);
    }
};
