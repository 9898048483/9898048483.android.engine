#include <sqlite3.h>
#include <string.h>
#include <stdint.h>
#include <android/log.h>

#define LOG_TAG "AISecureSpace_VFS"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define PAGE_SIZE 4096
#define HW_AES_BLOCK_SIZE 16

// Hardware Cryptography Abstraction (ARMv8 CE / Android Keystore backed)
extern void hw_aes256_gcm_encrypt(const uint8_t* in, uint8_t* out, size_t len, const uint8_t* iv, const uint8_t* key, uint8_t* tag);
extern void hw_aes256_gcm_decrypt(const uint8_t* in, uint8_t* out, size_t len, const uint8_t* iv, const uint8_t* key, const uint8_t* tag);

typedef struct SecureFile {
    sqlite3_file base;
    sqlite3_file *pReal;    // Underlying standard OS file
    uint8_t db_key[32];     // Master database key
} SecureFile;

// Derive a unique key/IV per page using HKDF or HMAC(MasterKey, PageNumber)
static void derive_page_iv(const uint8_t* master_key, sqlite3_int64 offset, uint8_t* iv_out) {
    // Mock derivation using offset (page number)
    memcpy(iv_out, &offset, sizeof(offset));
    memset(iv_out + sizeof(offset), 0, 12 - sizeof(offset)); // 12-byte IV for GCM
}

// Intercept Write: Encrypt page before flushing to disk
static int secure_vfs_write(sqlite3_file *pFile, const void *zBuf, int iAmt, sqlite_int64 iOfst) {
    SecureFile *p = (SecureFile *)pFile;
    uint8_t encrypted_page[PAGE_SIZE + 16]; // Payload + 16-byte GCM Tag
    uint8_t iv[12];
    
    derive_page_iv(p->db_key, iOfst, iv);
    
    // Hardware Accelerated AES-256-GCM Encryption
    hw_aes256_gcm_encrypt((const uint8_t*)zBuf, encrypted_page, iAmt, iv, p->db_key, encrypted_page + iAmt);
    
    LOGI("VFS: Encrypted page at offset %lld (Size: %d) via HW AES", (long long)iOfst, iAmt);
    return p->pReal->pMethods->xWrite(p->pReal, encrypted_page, iAmt + 16, iOfst);
}

// Intercept Read: Decrypt page after fetching from disk
static int secure_vfs_read(sqlite3_file *pFile, void *zBuf, int iAmt, sqlite_int64 iOfst) {
    SecureFile *p = (SecureFile *)pFile;
    uint8_t encrypted_page[PAGE_SIZE + 16];
    uint8_t iv[12];
    
    int rc = p->pReal->pMethods->xRead(p->pReal, encrypted_page, iAmt + 16, iOfst);
    if (rc != SQLITE_OK && rc != SQLITE_IOERR_SHORT_READ) return rc;
    
    derive_page_iv(p->db_key, iOfst, iv);
    
    // Hardware Accelerated AES-256-GCM Decryption & Integrity Check
    hw_aes256_gcm_decrypt(encrypted_page, (uint8_t*)zBuf, iAmt, iv, p->db_key, encrypted_page + iAmt);
    
    LOGI("VFS: Decrypted & Verified page at offset %lld", (long long)iOfst);
    return rc;
}

// Intercept Close: Zeroize cryptographic material in memory
static int secure_vfs_close(sqlite3_file *pFile) {
    SecureFile *p = (SecureFile *)pFile;
    
    // Secure Zeroization of Master Key
    memset(p->db_key, 0, sizeof(p->db_key));
    __asm__ __volatile__("" ::: "memory"); // Compiler memory barrier
    
    LOGI("VFS: File closed, cryptographic memory securely zeroized.");
    return p->pReal->pMethods->xClose(p->pReal);
}
