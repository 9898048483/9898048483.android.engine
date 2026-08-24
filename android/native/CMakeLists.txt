# ==============================================================================
# AI Engine Android Native Runtime & Multi-Language Bridge
# CMakeLists.txt - Production NDK Build Configuration
# ==============================================================================

cmake_minimum_required(VERSION 3.22.1)

project("ai_native_engine" LANGUAGES C CXX)

# Enforce Modern C++20 Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Position Independent Code and Symbol Visibility
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)

# Architecture-specific Compiler Optimizations
if(${ANDROID_ABI} STREQUAL "arm64-v8a")
    add_compile_options(-march=armv8-a+crc+crypto -O3 -ffast-math -funroll-loops)
elseif(${ANDROID_ABI} STREQUAL "armeabi-v7a")
    add_compile_options(-march=armv7-a -mfpu=neon -mfloat-abi=softfp -O3)
elseif(${ANDROID_ABI} STREQUAL "x86_64")
    add_compile_options(-march=x86-64 -msse4.2 -mpopcnt -O3)
endif()

# Strict Warnings & Hardening
add_compile_options(
    -Wall
    -Wextra
    -Wformat=2
    -Wno-unused-parameter
    -fstack-protector-strong
    -D_FORTIFY_SOURCE=2
)

# Include Directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${ANDROID_NDK}/sysroot/usr/include
)

# Source Files
set(AI_ENGINE_SOURCES
    src/native_bridge.cpp
    src/shared_memory_ipc.cpp
    src/memory_allocator.cpp
    src/locale_detector.cpp
)

# Define Shared Library Target
add_library(ai_native_engine SHARED
    ${AI_ENGINE_SOURCES}
)

# Target Include Directories
target_include_directories(ai_native_engine PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Find System Android NDK Libraries
find_library(LOG_LIB log)
find_library(ANDROID_LIB android)

# Link Libraries
target_link_libraries(ai_native_engine
    PRIVATE
    ${LOG_LIB}
    ${ANDROID_LIB}
    atomic
)

# Target Properties
set_target_properties(ai_native_engine PROPERTIES
    OUTPUT_NAME "ai_native_engine"
    VERSION 1.0.0
    SOVERSION 1
)

# Optional AddressSanitizer for Debug Builds
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(ai_native_engine PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(ai_native_engine PRIVATE -fsanitize=address,undefined)
endif()

message(STATUS "Configured AI Native Engine for ABI: ${ANDROID_ABI}, NDK: ${ANDROID_NDK_MAJOR}")
