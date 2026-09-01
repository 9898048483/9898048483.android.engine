cmake_minimum_required(VERSION 3.22.1)

project("crypto_bridge")

add_library(
        crypto_bridge
        SHARED
        crypto_bridge.cpp)

find_library(
        log-lib
        log)

target_link_libraries(
        crypto_bridge
        ${log-lib})
