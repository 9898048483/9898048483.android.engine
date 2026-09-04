import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

/**
 * AI Secure Space - Production APK Packager & Generator (Prompt 15)
 * Builds a standard valid Android APK ZIP container containing:
 * - AndroidManifest.xml (Target SDK 34)
 * - classes.dex (Dalvik / ART Executable)
 * - resources.arsc
 * - META-INF/CERT.RSA & META-INF/MANIFEST.MF (v1/v2/v3 signing blocks)
 * - lib/arm64-v8a/libnative_ipc_firewall.so
 * - assets/tor/tor-arm64, assets/tor/tor-armv7, assets/tor/tor-x86_64
 * - assets/app.py (FastAPI micro-backend & Kivy entrypoint)
 */

function createZipBuffer(entries) {
  // Simple ZIP encoder without external dependencies
  const fileRecords = [];
  const centralDirectoryHeaders = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.name, 'utf-8');
    const dataBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf-8');
    
    // Compute CRC32
    const crc = computeCrc32(dataBuffer);
    const uncompressedSize = dataBuffer.length;
    const compressedSize = dataBuffer.length; // STORE mode (0)

    // Local File Header (30 bytes + name + extra)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // general purpose bit flag
    localHeader.writeUInt16LE(0, 8); // compression method (0 = STORE)
    localHeader.writeUInt16LE(0x529a, 10); // file last mod time
    localHeader.writeUInt16LE(0x56a4, 12); // file last mod date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compressedSize, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuffer.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const fileRecord = Buffer.concat([localHeader, filenameBuffer, dataBuffer]);
    fileRecords.push(fileRecord);

    // Central Directory Header (46 bytes + name)
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // signature
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed to extract
    cdHeader.writeUInt16LE(0, 8); // bit flag
    cdHeader.writeUInt16LE(0, 10); // compression method (0)
    cdHeader.writeUInt16LE(0x529a, 12); // mod time
    cdHeader.writeUInt16LE(0x56a4, 14); // mod date
    cdHeader.writeUInt32LE(crc, 16); // crc32
    cdHeader.writeUInt32LE(compressedSize, 20); // compressed size
    cdHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    cdHeader.writeUInt16LE(filenameBuffer.length, 28); // file name length
    cdHeader.writeUInt16LE(0, 30); // extra length
    cdHeader.writeUInt16LE(0, 32); // comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal file attributes
    cdHeader.writeUInt32LE(0x81a40000, 38); // external file attributes (-rw-r--r--)
    cdHeader.writeUInt32LE(currentOffset, 42); // relative offset of local header

    centralDirectoryHeaders.push(Buffer.concat([cdHeader, filenameBuffer]));
    currentOffset += fileRecord.length;
  }

  const centralDirectoryOffset = currentOffset;
  const centralDirectoryBuffer = Buffer.concat(centralDirectoryHeaders);
  const centralDirectorySize = centralDirectoryBuffer.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8); // total entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries in central dir
  eocd.writeUInt32LE(centralDirectorySize, 12); // size of central dir
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...fileRecords, centralDirectoryBuffer, eocd]);
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[i] = c;
}

function computeCrc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

import { buildHybridApk } from './bundle-hybrid-apk.js';

export function buildApkArtifact(buildMode = 'release', targetDir) {
  return buildHybridApk({ mode: buildMode });
}

export function buildDebugApk(targetDir) {
  return buildHybridApk({ mode: 'debug' });
}

export function buildReleaseApk(targetDir) {
  return buildHybridApk({ mode: 'release' });
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('generate-apk.js')) {
  try {
    const args = process.argv.slice(2);
    let mode = 'all';
    for (const arg of args) {
      if (arg.startsWith('--mode=')) {
        mode = arg.split('=')[1];
      } else if (['debug', 'release', 'hybrid', 'all', 'fast'].includes(arg)) {
        mode = arg;
      }
    }
    console.log(`[AI Secure Space Packager] Invoking standalone local APK compilation with mode: ${mode}`);
    const result = buildHybridApk({ mode });
    console.log(`\n[+] Local APK build finished successfully.`);
    console.log(`    Primary Artifact: ${result.path}`);
    console.log(`    Size: ${result.sizeMb} MB`);
    console.log(`    SHA-256: ${result.sha256}\n`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to generate APK locally:', e);
    process.exit(1);
  }
}

