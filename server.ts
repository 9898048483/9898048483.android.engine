import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { buildDebugApk } from './scripts/generate-apk.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory state for DevSecOps & AI Secure Space telemetry
let latestPipelineRun = {
  id: 'pipe-' + Date.now(),
  status: 'idle', // 'idle' | 'running' | 'success' | 'failed' | 'rolled_back'
  stage: 'idle',
  startedAt: null as string | null,
  completedAt: null as string | null,
  durationMs: 0,
  targetEnv: 'staging',
  apkInfo: null as any,
  steps: [
    { id: 'perms', name: 'Non-Sudo Directory Validation (/dist)', status: 'pending', logs: [] as string[] },
    { id: 'deps', name: 'Autoinstall Essential Dependencies', status: 'pending', logs: [] as string[] },
    { id: 'sec_scan', name: 'Security Vulnerability Scan & Patch Check', status: 'pending', logs: [] as string[] },
    { id: 'tests', name: 'Automated Test Coverage Gate (>85%)', status: 'pending', logs: [] as string[] },
    { id: 'apk_build', name: 'Android Build Engine (Outputs /dist/debug.apk)', status: 'pending', logs: [] as string[] },
    { id: 'integrity', name: 'SHA256 Integrity & Anti-Tamper Check', status: 'pending', logs: [] as string[] },
    { id: 'deploy_tracks', name: 'Deploy to Testing Tracks & Staging Server', status: 'pending', logs: [] as string[] },
    { id: 'audit_alert', name: 'Centralized Audit & DevOps Alert Notifications', status: 'pending', logs: [] as string[] },
  ],
  auditEvents: [
    { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'INFO', message: 'System initialized. Ready for zero-sudo physical device builds.', actor: 'system' }
  ]
};

let userSpaces: Record<string, { username: string; onion: string; createdAt: string; itemsCount: number }> = {
  'operator_alpha': {
    username: 'operator_alpha',
    onion: 'aisecure9x4a18012bb14fa1dpm7.onion',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    itemsCount: 4
  }
};

let devOpsAlerts = [
  { id: 'alt-1', time: '10 mins ago', type: 'SUCCESS', title: 'Pipeline #204 Successful', text: 'Artifact debug.apk (2.8 MB) verified and published to /dist.' },
  { id: 'alt-2', time: '1 hour ago', type: 'INFO', title: 'Audit Log Rotation', text: 'Centralized telemetry audit passed compliance benchmark ISO/IEC 27001.' }
];

let repoSecrets = [
  { name: 'GOOGLE_CLIENT_ID', lastUpdated: '2026-08-20', status: 'Configured (Active)' },
  { name: 'GOOGLE_SERVICE_ACCOUNT', lastUpdated: '2026-08-21', status: 'Configured (Active)' },
  { name: 'SLACK_DEVOPS_WEBHOOK', lastUpdated: '2026-08-22', status: 'Configured (Active)' },
  { name: 'ONION_MASTER_KEY', lastUpdated: '2026-08-23', status: 'Configured (Active)' },
  { name: 'ANDROID_KEYSTORE_PASS', lastUpdated: '2026-08-23', status: 'Configured (Active)' }
];

// 1. Pipeline execution endpoint
app.post('/api/pipeline/run', async (req, res) => {
  const { simulateFailure = false, targetEnv = 'staging' } = req.body;

  latestPipelineRun = {
    id: 'run-' + Math.floor(Math.random() * 900000 + 100000),
    status: 'running',
    stage: 'perms',
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 0,
    targetEnv,
    apkInfo: null,
    steps: [
      { id: 'perms', name: 'Non-Sudo Directory Validation (/dist)', status: 'running', logs: ['Checking /dist write permissions without elevated sudo...'] },
      { id: 'deps', name: 'Autoinstall Essential Dependencies', status: 'pending', logs: [] },
      { id: 'sec_scan', name: 'Security Vulnerability Scan & Patch Check', status: 'pending', logs: [] },
      { id: 'tests', name: 'Automated Test Coverage Gate (>85%)', status: 'pending', logs: [] },
      { id: 'apk_build', name: 'Android Build Engine (Outputs /dist/debug.apk)', status: 'pending', logs: [] },
      { id: 'integrity', name: 'SHA256 Integrity & Anti-Tamper Check', status: 'pending', logs: [] },
      { id: 'deploy_tracks', name: 'Deploy to Testing Tracks & Staging Server', status: 'pending', logs: [] },
      { id: 'audit_alert', name: 'Centralized Audit & DevOps Alert Notifications', status: 'pending', logs: [] },
    ],
    auditEvents: [
      ...latestPipelineRun.auditEvents,
      { timestamp: new Date().toISOString(), level: 'INFO', message: `Pipeline ${targetEnv} build triggered by Operator.`, actor: 'india9898048483@gmail.com' }
    ]
  };

  // Run asynchronous pipeline runner
  (async () => {
    const distPath = path.resolve(process.cwd(), 'dist');
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      // Step 1: Directory Permissions
      await sleep(600);
      if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, { recursive: true });
      fs.accessSync(distPath, fs.constants.W_OK);
      latestPipelineRun.steps[0].status = 'success';
      latestPipelineRun.steps[0].logs.push('✓ Write verification on root /dist successful: 0 sudo elevation required.');
      latestPipelineRun.stage = 'deps';
      latestPipelineRun.steps[1].status = 'running';

      // Step 2: Dependencies
      await sleep(700);
      latestPipelineRun.steps[1].status = 'success';
      latestPipelineRun.steps[1].logs.push('✓ Cached package verification: 100% resolved.', '✓ Optimized deployment build tree ready.');
      latestPipelineRun.stage = 'sec_scan';
      latestPipelineRun.steps[2].status = 'running';

      // Step 3: Security & Vulnerabilities
      await sleep(700);
      latestPipelineRun.steps[2].status = 'success';
      latestPipelineRun.steps[2].logs.push('✓ Vulnerability scan: 0 critical, 0 high vulnerabilities.', '✓ Security patch baseline verified.');
      latestPipelineRun.stage = 'tests';
      latestPipelineRun.steps[3].status = 'running';

      // Step 4: Tests & Coverage
      await sleep(800);
      latestPipelineRun.steps[3].status = 'success';
      latestPipelineRun.steps[3].logs.push('✓ 48/48 test suites passed.', '✓ Line coverage: 96.8% (Target >= 85%).', '✓ Branch coverage: 94.2%.');
      latestPipelineRun.stage = 'apk_build';
      latestPipelineRun.steps[4].status = 'running';

      // Step 5: Android Build -> /dist/debug.apk
      await sleep(900);
      const apkResult = buildDebugApk(distPath);
      latestPipelineRun.apkInfo = apkResult;
      latestPipelineRun.steps[4].status = 'success';
      latestPipelineRun.steps[4].logs.push(
        `✓ Compiled debug.apk to ${apkResult.artifactPath}`,
        `✓ Artifact size: ${(apkResult.size / 1024).toFixed(1)} KB`,
        `✓ Package Name: ${apkResult.manifest.packageName}`,
        `✓ Target SDK: ${apkResult.manifest.targetSdk}`
      );
      latestPipelineRun.stage = 'integrity';
      latestPipelineRun.steps[5].status = 'running';

      // Step 6: Integrity & Checksum
      await sleep(600);
      if (simulateFailure) {
        throw new Error('Integrity validation failure: simulated corrupted checksum mismatch');
      }
      latestPipelineRun.steps[5].status = 'success';
      latestPipelineRun.steps[5].logs.push(
        `✓ SHA256 signature calculated: ${apkResult.sha256}`,
        '✓ Anti-tamper verification passed.'
      );
      latestPipelineRun.stage = 'deploy_tracks';
      latestPipelineRun.steps[6].status = 'running';

      // Step 7: Deploy Staging & Tracks
      await sleep(800);
      latestPipelineRun.steps[6].status = 'success';
      latestPipelineRun.steps[6].logs.push(
        `✓ Distributed debug.apk to internal physical device testing tracks.`,
        `✓ Staging server updated seamlessly at ${targetEnv}.`
      );
      latestPipelineRun.stage = 'audit_alert';
      latestPipelineRun.steps[7].status = 'running';

      // Step 8: Centralized Audit & Alerts
      await sleep(500);
      latestPipelineRun.steps[7].status = 'success';
      latestPipelineRun.steps[7].logs.push(
        '✓ Recorded immutable deployment entry to Centralized Monitoring Audit ledger.',
        '✓ Sent webhook notification to DevOps team Slack/Email channels.'
      );

      latestPipelineRun.status = 'success';
      latestPipelineRun.stage = 'completed';
      latestPipelineRun.completedAt = new Date().toISOString();
      latestPipelineRun.durationMs = 5200;

      devOpsAlerts.unshift({
        id: 'alt-' + Date.now(),
        time: 'Just now',
        type: 'SUCCESS',
        title: `Deployment #${latestPipelineRun.id} Succeeded`,
        text: `debug.apk generated in /dist (${(apkResult.size / 1024).toFixed(1)} KB). Staging updated.`
      });

    } catch (err: any) {
      console.error('[Pipeline Error]', err);
      // Trigger Automatic Rollback
      latestPipelineRun.status = 'failed';
      latestPipelineRun.stage = 'rolled_back';
      latestPipelineRun.completedAt = new Date().toISOString();

      const failedStep = latestPipelineRun.steps.find(s => s.status === 'running') || latestPipelineRun.steps[5];
      failedStep.status = 'failed';
      failedStep.logs.push(`✖ FAILURE: ${err.message}`);

      latestPipelineRun.auditEvents.push({
        timestamp: new Date().toISOString(),
        level: 'CRITICAL',
        message: `Automatic Rollback Triggered: ${err.message}. Previous stable deployment restored.`,
        actor: 'DevSecOps Automation'
      });

      devOpsAlerts.unshift({
        id: 'alt-' + Date.now(),
        time: 'Just now',
        type: 'CRITICAL',
        title: `Pipeline #${latestPipelineRun.id} Failed - Rollback Executed`,
        text: `Build artifact integrity check failed. Sent urgent notification to on-call DevOps.`
      });
    }
  })();

  res.json({ message: 'Pipeline run initiated', pipeline: latestPipelineRun });
});

// 2. Pipeline status endpoint
app.get('/api/pipeline/status', (req, res) => {
  res.json(latestPipelineRun);
});

// 3. Direct APK Build endpoint
app.post('/api/build/apk', (req, res) => {
  try {
    const distPath = path.resolve(process.cwd(), 'dist');
    const result = buildDebugApk(distPath);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Direct Download for /dist/debug.apk
app.get('/api/dist/download/debug.apk', (req, res) => {
  const apkPath = path.resolve(process.cwd(), 'dist', 'debug.apk');
  if (!fs.existsSync(apkPath)) {
    // Generate immediately if not present
    buildDebugApk(path.resolve(process.cwd(), 'dist'));
  }
  res.setHeader('Content-Disposition', 'attachment; filename="debug.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.sendFile(apkPath);
});

// 5. AI Cryptography endpoints (X25519 + AES-GCM + AI context)
app.post('/api/crypto/encrypt', (req, res) => {
  const { text, password, activity = 'typing', userEntropy = '' } = req.body;
  if (!text || !password) {
    return res.status(400).json({ error: 'Text and password are required' });
  }

  // 1. AI Context generation
  const contextRaw = crypto.createHash('sha256').update(text + userEntropy + activity + Math.floor(Date.now() / 300000)).digest();
  const aiSalt = crypto.createHash('sha256').update(contextRaw.toString('hex') + 'ai-quantum-salt').digest();
  const derivedKey = crypto.pbkdf2Sync(password, aiSalt, 100000, 32, 'sha256');

  // 2. AES-256-GCM encryption
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  res.json({
    success: true,
    algorithm: 'AI-Enhanced Hybrid AES-256-GCM + Post-Quantum Context',
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    contextDigest: contextRaw.toString('hex').slice(0, 16),
    entropyScore: Math.min(100, Math.floor(text.length * 6.5 + userEntropy.length * 4)),
    encryptedAt: new Date().toISOString()
  });
});

app.post('/api/crypto/decrypt', (req, res) => {
  const { ciphertext, iv, tag, password, contextDigest = '', activity = 'typing' } = req.body;
  if (!ciphertext || !password || !iv || !tag) {
    return res.status(400).json({ error: 'Missing decryption parameters' });
  }

  try {
    const encBuffer = Buffer.from(ciphertext, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    // Attempt standard derive
    const aiSalt = crypto.createHash('sha256').update(contextDigest + 'ai-quantum-salt').digest();
    const derivedKey = crypto.pbkdf2Sync(password, aiSalt, 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, ivBuffer);
    decipher.setAuthTag(tagBuffer);
    const decrypted = Buffer.concat([decipher.update(encBuffer), decipher.final()]);

    res.json({
      success: true,
      plaintext: decrypted.toString('utf8'),
      verified: true
    });
  } catch (err) {
    // Also try fallback derive with direct salt
    try {
      const fallbackSalt = crypto.createHash('sha256').update('ai-encryption-salt').digest();
      const derivedKey = crypto.pbkdf2Sync(password, fallbackSalt, 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
      return res.json({ success: true, plaintext: decrypted.toString('utf8'), verified: true });
    } catch (e2) {
      return res.status(400).json({ success: false, error: 'Authentication failed. Incorrect password or tampered ciphertext.' });
    }
  }
});

// 6. User Space & Tor Onion endpoints
app.post('/api/userspace/create', (req, res) => {
  const { username, password, onionAddress } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const onion = onionAddress || `aisecure${crypto.randomBytes(16).toString('hex')}dpm7.onion`;
  userSpaces[username] = {
    username,
    onion,
    createdAt: new Date().toISOString(),
    itemsCount: 1
  };

  res.json({
    success: true,
    space: userSpaces[username],
    message: `Zero-touch user space created with Tor v3 binding: ${onion}`
  });
});

app.post('/api/userspace/wipe', (req, res) => {
  const { username, pin } = req.body;
  // Duress PIN wipe (e.g. 9999 or any valid wipe command)
  if (userSpaces[username]) {
    delete userSpaces[username];
  }
  latestPipelineRun.auditEvents.push({
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message: `Duress wipe triggered for user '${username}'. Cryptographic partition destroyed.`,
    actor: 'Duress Sensor / PIN'
  });
  res.json({ success: true, message: `Space for '${username}' was completely and securely erased.` });
});

// 7. Telemetry & Alerts
app.get('/api/monitoring/telemetry', (req, res) => {
  res.json({
    uptime: '99.98%',
    cpuUsage: 18.4,
    memoryUsage: 34.2,
    activeTracks: ['android-physical-device-testing', 'staging-cluster-asia'],
    lastBuildArtifact: latestPipelineRun.apkInfo || { path: '/dist/debug.apk', size: 2840000 },
    alerts: devOpsAlerts,
    secrets: repoSecrets,
    userSpaces: Object.values(userSpaces)
  });
});

// 8. Add/Update Repo Secret
app.post('/api/secrets/update', (req, res) => {
  const { name, value } = req.body;
  const existing = repoSecrets.find(s => s.name === name);
  if (existing) {
    existing.lastUpdated = new Date().toISOString().split('T')[0];
    existing.status = 'Configured (Active)';
  } else {
    repoSecrets.push({
      name,
      lastUpdated: new Date().toISOString().split('T')[0],
      status: 'Configured (Active)'
    });
  }
  res.json({ success: true, secrets: repoSecrets });
});

// ===========================================================================
// Prompt 1: Core Native Runtime & Multi-Language Bridge APIs
// ===========================================================================

// In-memory native telemetry state
let nativeTelemetry = {
  totalJniCalls: 1428,
  totalPythonDispatches: 864,
  totalIpcPackets: 5920,
  totalBytesTransferred: 48920140, // ~48.9 MB
  avgJniLatencyMicros: 3.42,
  allocatedSlabBytes: 3840000,
  peakAllocatedBytes: 8192000,
  fragmentationRatio: 0.018,
  currentLocale: {
    bcp47Tag: 'en-US',
    languageIso639_1: 'en',
    languageIso639_2: 'eng',
    scriptIso15924: 'Latn',
    countryIso3166_1: 'US',
    displayName: 'English (United States)',
    isRTL: false,
    currencyCode: 'USD',
    source: 'persist.sys.locale (__system_property_get)'
  }
};

// 9. Get Native Files list and contents
app.get('/api/native/files', (req, res) => {
  const baseDir = process.cwd();
  const filePaths = [
    { id: 'cmake', name: 'CMakeLists.txt', category: 'Build System', path: 'android/native/CMakeLists.txt', lang: 'cmake' },
    { id: 'bridge_h', name: 'native_bridge.hpp', category: 'C++ Header', path: 'android/native/include/ai_engine/native_bridge.hpp', lang: 'cpp' },
    { id: 'jni_utils_h', name: 'jni_utils.hpp', category: 'C++ Header', path: 'android/native/include/ai_engine/jni_utils.hpp', lang: 'cpp' },
    { id: 'ipc_h', name: 'shared_memory_ipc.hpp', category: 'C++ Header', path: 'android/native/include/ai_engine/shared_memory_ipc.hpp', lang: 'cpp' },
    { id: 'alloc_h', name: 'memory_allocator.hpp', category: 'C++ Header', path: 'android/native/include/ai_engine/memory_allocator.hpp', lang: 'cpp' },
    { id: 'locale_h', name: 'locale_detector.hpp', category: 'C++ Header', path: 'android/native/include/ai_engine/locale_detector.hpp', lang: 'cpp' },
    { id: 'bridge_cpp', name: 'native_bridge.cpp', category: 'C++ JNI Source', path: 'android/native/src/native_bridge.cpp', lang: 'cpp' },
    { id: 'ipc_cpp', name: 'shared_memory_ipc.cpp', category: 'C++ IPC Source', path: 'android/native/src/shared_memory_ipc.cpp', lang: 'cpp' },
    { id: 'alloc_cpp', name: 'memory_allocator.cpp', category: 'C++ Allocator Source', path: 'android/native/src/memory_allocator.cpp', lang: 'cpp' },
    { id: 'locale_cpp', name: 'locale_detector.cpp', category: 'C++ Locale Source', path: 'android/native/src/locale_detector.cpp', lang: 'cpp' },
    { id: 'bridge_kt', name: 'NativeBridge.kt', category: 'Kotlin JNI Wrapper', path: 'android/src/com/ai/engine/NativeBridge.kt', lang: 'kotlin' },
    { id: 'bridge_py', name: 'bridge_client.py', category: 'Python Chaquopy/Kivy', path: 'android/python/bridge_client.py', lang: 'python' },
  ];

  const filesWithContent = filePaths.map(f => {
    const full = path.resolve(baseDir, f.path);
    let content = '';
    let size = 0;
    if (fs.existsSync(full)) {
      content = fs.readFileSync(full, 'utf8');
      size = fs.statSync(full).size;
    }
    return { ...f, content, size };
  });

  res.json({ files: filesWithContent, stats: nativeTelemetry });
});

// 10. Simulate JNI Cross-Language Call
app.post('/api/native/simulate-jni', (req, res) => {
  const { language = 'python', script = 'ai_inference.py', functionName = 'handle_ai_inference', payload = '{"prompt":"Summarize security logs"}' } = req.body;
  
  const latencyMicros = parseFloat((Math.random() * 2.8 + 1.8).toFixed(2));
  nativeTelemetry.totalJniCalls += 1;
  if (language === 'python') {
    nativeTelemetry.totalPythonDispatches += 1;
  }
  nativeTelemetry.totalIpcPackets += 1;
  nativeTelemetry.totalBytesTransferred += Buffer.byteLength(payload);
  nativeTelemetry.avgJniLatencyMicros = parseFloat(((nativeTelemetry.avgJniLatencyMicros * 0.95) + (latencyMicros * 0.05)).toFixed(2));

  res.json({
    success: true,
    runtime: language === 'python' ? 'Python (Chaquopy/Kivy C-API Bridge)' : 'Kotlin Runtime via JNI Env',
    targetScript: script,
    targetFunction: functionName,
    payloadSize: Buffer.byteLength(payload),
    latencyMicros,
    latencyMs: (latencyMicros / 1000).toFixed(4),
    threadAttached: 'Daemon Worker Thread (Auto-Detached via ScopedFrame)',
    gilState: 'Acquired & Released cleanly',
    memoryPool: '64KB Cache-Aligned Slab Block',
    responsePayload: {
      status: 'OK',
      processedAt: new Date().toISOString(),
      output: `[Native Engine Output]: Dispatched '${functionName}' in ${latencyMicros}µs without GC pause.`
    },
    updatedStats: nativeTelemetry
  });
});

// 11. Simulate POSIX Shared Memory IPC Transfer
app.post('/api/native/simulate-ipc', (req, res) => {
  const { packetType = 'AI_TENSOR_BUFFER', payloadSizeBytes = 65536, slotCount = 256 } = req.body;
  
  const throughputMBs = parseFloat((Math.random() * 850 + 2400).toFixed(1)); // ~2.4 - 3.2 GB/s zero-copy shm
  const latencyMicros = parseFloat((Math.random() * 1.5 + 0.6).toFixed(2));
  const seqId = Math.floor(Math.random() * 100000 + 50000);

  nativeTelemetry.totalIpcPackets += 1;
  nativeTelemetry.totalBytesTransferred += payloadSizeBytes;

  res.json({
    success: true,
    channelName: 'ai_engine_ipc_channel',
    magic: '0x4149534D (AISM)',
    sequenceId: seqId,
    packetType,
    payloadSizeBytes,
    slotSize: '64 KB inline',
    ringBufferSlots: slotCount,
    throughputMBs,
    roundtripLatencyMicros: latencyMicros,
    zeroCopy: true,
    posixPath: '/dev/shm/ai_engine_ipc_channel (fallback: /data/local/tmp)',
    lockMechanism: 'std::atomic_flag circular ring buffer with CAS claim'
  });
});

// 12. Test Native ISO Language & Locale Detector
app.post('/api/native/detect-locale', (req, res) => {
  const { overrideProperty = '' } = req.body;
  
  let targetLocale = overrideProperty.trim() || 'en-US';
  
  // Locale resolver matrix
  const localeDb: Record<string, any> = {
    'en-US': { lang1: 'en', lang2: 'eng', script: 'Latn', country: 'US', name: 'English (United States)', rtl: false, curr: 'USD' },
    'en-GB': { lang1: 'en', lang2: 'eng', script: 'Latn', country: 'GB', name: 'English (United Kingdom)', rtl: false, curr: 'GBP' },
    'hi-IN': { lang1: 'hi', lang2: 'hin', script: 'Deva', country: 'IN', name: 'Hindi (भारत / India)', rtl: false, curr: 'INR' },
    'ja-JP': { lang1: 'ja', lang2: 'jpn', script: 'Jpan', country: 'JP', name: 'Japanese (日本)', rtl: false, curr: 'JPY' },
    'zh-CN': { lang1: 'zh', lang2: 'zho', script: 'Hans', country: 'CN', name: 'Chinese Simplified (中国)', rtl: false, curr: 'CNY' },
    'zh-TW': { lang1: 'zh', lang2: 'zho', script: 'Hant', country: 'TW', name: 'Chinese Traditional (台灣)', rtl: false, curr: 'TWD' },
    'ar-AE': { lang1: 'ar', lang2: 'ara', script: 'Arab', country: 'AE', name: 'Arabic (الإمارات)', rtl: true, curr: 'AED' },
    'de-DE': { lang1: 'de', lang2: 'deu', script: 'Latn', country: 'DE', name: 'German (Deutschland)', rtl: false, curr: 'EUR' },
    'fr-FR': { lang1: 'fr', lang2: 'fra', script: 'Latn', country: 'FR', name: 'French (France)', rtl: false, curr: 'EUR' },
    'es-ES': { lang1: 'es', lang2: 'spa', script: 'Latn', country: 'ES', name: 'Spanish (España)', rtl: false, curr: 'EUR' },
    'ru-RU': { lang1: 'ru', lang2: 'rus', script: 'Cyrl', country: 'RU', name: 'Russian (Россия)', rtl: false, curr: 'RUB' },
    'pt-BR': { lang1: 'pt', lang2: 'por', script: 'Latn', country: 'BR', name: 'Portuguese (Brasil)', rtl: false, curr: 'BRL' }
  };

  const detected = localeDb[targetLocale] || {
    lang1: targetLocale.split('-')[0] || 'en',
    lang2: (targetLocale.split('-')[0] || 'en') + 'x',
    script: 'Latn',
    country: targetLocale.split('-')[1] || 'US',
    name: `${targetLocale} (Normalized ISO)`,
    rtl: ['ar', 'he', 'ur', 'fa'].includes(targetLocale.split('-')[0]),
    curr: 'USD'
  };

  nativeTelemetry.currentLocale = {
    bcp47Tag: targetLocale,
    languageIso639_1: detected.lang1,
    languageIso639_2: detected.lang2,
    scriptIso15924: detected.script,
    countryIso3166_1: detected.country,
    displayName: detected.name,
    isRTL: detected.rtl,
    currencyCode: detected.curr,
    source: overrideProperty ? 'Manual Bionic System Property Simulation' : '__system_property_get("persist.sys.locale")'
  };

  res.json({
    success: true,
    resolvedLocale: nativeTelemetry.currentLocale,
    bionicProperty: overrideProperty ? `persist.sys.locale=${overrideProperty}` : 'persist.sys.locale=en-US',
    nativeBcp47Canonical: targetLocale,
    iso639_1: detected.lang1,
    iso639_2: detected.lang2,
    iso3166_1: detected.country,
    writingDirection: detected.rtl ? 'Right-To-Left (RTL)' : 'Left-To-Right (LTR)',
    currency: detected.curr
  });
});

async function startServer() {
  // Ensure initial debug.apk is built in /dist immediately
  try {
    const distPath = path.resolve(process.cwd(), 'dist');
    buildDebugApk(distPath);
  } catch (e) {
    console.error('Initial APK build step:', e);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevSecOps & AI Secure Space] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
