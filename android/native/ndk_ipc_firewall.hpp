#ifndef NDK_IPC_FIREWALL_HPP
#define NDK_IPC_FIREWALL_HPP

/**
 * Native IPC Engine & NDK Memory Firewall (Prompt 10)
 * Header definitions for Android NDK C++ secure inter-process communication.
 */

#include <cstdint>
#include <string>
#include <vector>
#include <memory>
#include <sys/types.h>

namespace AISecure {
namespace IPC {

// Constant Protocol Constraints
constexpr uint32_t IPC_FRAME_MAGIC = 0x53454355; // 'SECU'
constexpr uint16_t IPC_PROTOCOL_VERSION = 0x0100; // v1.0
constexpr size_t MAX_IPC_PAYLOAD_SIZE = 8192;     // 8 KB Strict Memory Barrier
constexpr size_t MAX_COMMAND_LENGTH = 1024;       // 1 KB Max Command String
constexpr uint32_t STACK_CANARY_VALUE = 0xDEADBEEF;

// IPC Message Types
enum class MessageType : uint16_t {
    HEARTBEAT_PING      = 0x0001,
    HEARTBEAT_PONG      = 0x0002,
    SHELL_EXEC_COMMAND  = 0x0010,
    SHELL_EXEC_RESPONSE = 0x0011,
    KEYSTORE_QUERY      = 0x0020,
    TELEMETRY_DISPATCH  = 0x0030,
    MEMORY_ATTESTATION  = 0x0040,
    DURESS_SIGNAL       = 0x00FF,
    ERROR_ALERT         = 0xE000
};

// Error Codes
enum class FirewallErrorCode : uint32_t {
    SUCCESS                 = 0,
    ERR_INVALID_MAGIC       = 1001,
    ERR_BUFFER_OVERFLOW     = 1002,
    ERR_INJECTION_DETECTED  = 1003,
    ERR_CANARY_CORRUPTED    = 1004,
    ERR_UNAUTHORIZED_UID    = 1005,
    ERR_UNSUPPORTED_TYPE    = 1006,
    ERR_HMAC_MISMATCH       = 1007,
    ERR_PAYLOAD_TOO_LARGE   = 1008,
    ERR_NULL_BYTE_INJECTION = 1009,
    ERR_COMMAND_NOT_ALLOWED = 1010
};

#pragma pack(push, 1)
// Strict Binary TLV Message Header (40 Bytes Fixed)
struct IPCFrameHeader {
    uint32_t magic;          // 0x53454355
    uint16_t version;        // 0x0100
    uint16_t message_type;   // MessageType
    uint32_t sequence_id;    // Monotonic Counter
    uint32_t payload_len;    // Length of dynamic payload (<= MAX_IPC_PAYLOAD_SIZE)
    uint64_t timestamp_ms;   // Epoch timestamp
    uint64_t nonce;          // Random replay-protection nonce
    uint32_t header_canary;  // 0xDEADBEEF
};

// Tail Verification Block (36 Bytes)
struct IPCFrameTail {
    uint32_t tail_canary;    // 0xDEADBEEF
    uint8_t hmac_signature[32]; // HMAC-SHA256 of header + payload
};
#pragma pack(pop)

// Sanitization & Security Validation Result
struct ValidationResult {
    bool is_valid;
    FirewallErrorCode error_code;
    std::string error_message;
    std::string sanitized_command;
    std::vector<std::string> parsed_args;
};

// Process Credential Boundary
struct ProcessCredentials {
    pid_t pid;
    uid_t uid;
    gid_t gid;
    std::string selinux_context;
};

} // namespace IPC
} // namespace AISecure

#endif // NDK_IPC_FIREWALL_HPP
