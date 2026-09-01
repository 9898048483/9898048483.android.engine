#ifndef LIBCRYPTO_PQC_H
#define LIBCRYPTO_PQC_H

#include <jni.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// NIST Level 5 Security Parameter Definitions
#define MLDSA87_PUBLICKEYBYTES 2592
#define MLDSA87_SECRETKEYBYTES 4896
#define MLDSA87_SIGNATUREBYTES 4627

#define MLKEM1024_PUBLICKEYBYTES 1568
#define MLKEM1024_SECRETKEYBYTES 3168
#define MLKEM1024_CIPHERTEXTBYTES 1568
#define MLKEM1024_SSBYTES 32

/**
 * Constant-time memory scrubbing interface
 */
void pqc_cleanse(void *ptr, size_t len);

/**
 * Constant-time byte array equality comparator
 */
int pqc_ct_equal(const uint8_t *a, const uint8_t *b, size_t len);

#ifdef __cplusplus
}
#endif

#endif // LIBCRYPTO_PQC_H
