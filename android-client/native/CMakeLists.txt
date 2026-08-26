cmake_minimum_required(VERSION 3.22.1)
project("strongbox_native_pqc")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Hardened compilation flags for post-quantum cryptographic enclaves
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -fPIC -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wformat -Wformat-security -fno-strict-aliasing -fvisibility=hidden")

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
)

add_library(strongbox_pqc SHARED
    strongbox_jni.cpp
)

find_library(log-lib log)
find_library(android-lib android)

target_link_libraries(strongbox_pqc
    ${log-lib}
    ${android-lib}
)
