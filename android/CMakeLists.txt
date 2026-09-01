# ==============================================================================
# Sovereign AI Secure Space - Root Native Build System
# Android NDK r26+ with C++20 Standard
# Builds:
# 1. libcrypto_pqc (ML-DSA-87, ML-KEM-1024, Constant-Time Cleanse, Memory Guard)
# 2. libkernel_attestation (Anti-debugging, ptrace check, Magisk/Frida root shield)
# 3. libai_native_engine (High-throughput IPC & shared-memory state engine)
# ==============================================================================

cmake_minimum_required(VERSION 3.22.1)

project("sovereign_native_runtime" LANGUAGES C CXX)

# Enforce Modern C++20 Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Position Independent Code & Linker Hardening
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)

# Architecture Optimizations
if(${ANDROID_ABI} STREQUAL "arm64-v8a")
    add_compile_options(-march=armv8-a+crc+crypto -O3 -funroll-loops -fPIC)
elseif(${ANDROID_ABI} STREQUAL "armeabi-v7a")
    add_compile_options(-march=armv7-a -mfpu=neon -mfloat-abi=softfp -O3 -fPIC)
elseif(${ANDROID_ABI} STREQUAL "x86_64")
    add_compile_options(-march=x86-64 -msse4.2 -mpopcnt -O3 -fPIC)
endif()

# Strict Compiler Hardening
add_compile_options(
    -Wall
    -Wextra
    -Wformat=2
    -Wno-unused-parameter
    -fstack-protector-strong
    -D_FORTIFY_SOURCE=2
    -fno-strict-aliasing
)

# Include Directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../android-client/native
    ${CMAKE_CURRENT_SOURCE_DIR}/native/include
    ${ANDROID_NDK}/sysroot/usr/include
)

# System Libraries
find_library(LOG_LIB log)
find_library(ANDROID_LIB android)

# ==============================================================================
# Target 1: libcrypto_pqc (Quantum ML-DSA-87 & ML-KEM-1024 Engine)
# ==============================================================================
add_library(crypto_pqc SHARED
    ../android-client/native/libcrypto_pqc.cpp
    ../android-client/native/dma_memory_guard.cpp
    ../android-client/native/kernel_attestation.cpp
)

target_link_libraries(crypto_pqc
    PRIVATE
    ${LOG_LIB}
    ${ANDROID_LIB}
    atomic
)

# ==============================================================================
# Target 2: libai_native_engine (IPC Firewall & Hardware Attestation)
# ==============================================================================
add_library(ai_native_engine SHARED
    native/src/native_bridge.cpp
    native/src/shared_memory_ipc.cpp
    native/src/memory_allocator.cpp
    native/src/locale_detector.cpp
    native/rasp_engine.cpp
    native/rasp_jni_bridge.cpp
    native/ndk_ipc_firewall.cpp
)

target_link_libraries(ai_native_engine
    PRIVATE
    ${LOG_LIB}
    ${ANDROID_LIB}
    atomic
)

message(STATUS "Configured Sovereign Root CMake for ABI: ${ANDROID_ABI}, Standard: C++20, NDK: ${ANDROID_NDK_MAJOR}")
