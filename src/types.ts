export interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  logs: string[];
}

export interface ApkBuildManifest {
  artifact: string;
  path: string;
  buildId: string;
  version: string;
  packageName: string;
  builtAt: string;
  targetSdk: number;
  minSdk: number;
  permissions: string[];
  features: string[];
  pipelineMetadata: {
    ciRunner: string;
    sudoRequired: boolean;
    integrityPassed: boolean;
    testedOnTracks: string[];
  };
}

export interface ApkInfo {
  success: boolean;
  artifactPath: string;
  fullPath: string;
  size: number;
  sha256: string;
  buildId: string;
  manifest: ApkBuildManifest;
}

export interface AuditEvent {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  actor: string;
}

export interface PipelineRun {
  id: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'rolled_back';
  stage: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  targetEnv: string;
  apkInfo: ApkInfo | null;
  steps: PipelineStep[];
  auditEvents: AuditEvent[];
}

export interface UserSpaceRecord {
  username: string;
  onion: string;
  createdAt: string;
  itemsCount: number;
}

export interface DevOpsAlert {
  id: string;
  time: string;
  type: 'SUCCESS' | 'CRITICAL' | 'INFO' | 'WARN';
  title: string;
  text: string;
}

export interface RepoSecret {
  name: string;
  lastUpdated: string;
  status: string;
}

export interface CryptoResult {
  algorithm: string;
  ciphertext: string;
  iv: string;
  tag: string;
  contextDigest: string;
  entropyScore: number;
  encryptedAt: string;
}

export interface NativeFile {
  id: string;
  name: string;
  category: string;
  path: string;
  lang: 'cpp' | 'cmake' | 'kotlin' | 'python';
  content: string;
  size: number;
}

export interface NativeLocaleInfo {
  bcp47Tag: string;
  languageIso639_1: string;
  languageIso639_2: string;
  scriptIso15924: string;
  countryIso3166_1: string;
  displayName: string;
  isRTL: boolean;
  currencyCode: string;
  source: string;
}

export interface NativeTelemetryStats {
  totalJniCalls: number;
  totalPythonDispatches: number;
  totalIpcPackets: number;
  totalBytesTransferred: number;
  avgJniLatencyMicros: number;
  allocatedSlabBytes: number;
  peakAllocatedBytes: number;
  fragmentationRatio: number;
  currentLocale: NativeLocaleInfo;
}

export interface TouchPointData {
  x: number;
  y: number;
  pressure: number;
  touchMajor: number;
  timestampMs: number;
}

export interface EntropyReportData {
  shannonEntropyBitsPerByte: number;
  minEntropyNist80090b: number;
  collisionEstimateBits: number;
  sampleCount: number;
  isCryptographicallySafe: boolean;
  diagnosticSummary: string;
}

export interface AdaptiveKeyResult {
  derivedSalt: string;
  keystreamHex: string;
  saltHex: string;
  privacyHash: string;
  latencyMs: number;
  entropyReport: EntropyReportData;
  features: {
    meanVelocity: number;
    velocityVariance: number;
    meanAcceleration: number;
    accelerationVariance: number;
    meanPressure: number;
    pressureStd: number;
    timingJitter: number;
    meanArea: number;
    circadianSin: number;
    circadianCos: number;
    dayOfWeekNorm: number;
    spatialHash: number;
  };
  epochCounter: number;
  generatedAt: string;
}

export interface EphemeralOnionServiceData {
  serviceId: string;
  onionAddress: string;
  keyType: string;
  localTargetPort: number;
  virtualPort: number;
  createdAt: string;
  expiresAt: string;
  expiresInSeconds: number;
  isActive: boolean;
  circuitsEstablished: number;
}

export interface TorDaemonStatusData {
  isRunning: boolean;
  socksProxy: {
    host: string;
    port: number;
    protocol: string;
    status: string;
  };
  controlPort: {
    host: string;
    port: number;
    authenticated: boolean;
  };
  bootstrapPercentage: number;
  bootstrapPhase: string;
  activeServicesCount: number;
  autoRotateSeconds: number;
  dataDirectory: string;
  services: EphemeralOnionServiceData[];
}

export interface P2PTunnelMessage {
  id: string;
  senderOnion: string;
  recipientOnion: string;
  encryptedBytes: number;
  payloadType: string;
  hmacVerified: boolean;
  text: string;
  timestamp: string;
}

export interface HardwareAttestationInfo {
  keyAlias: string;
  securityLevel: string;
  attestationChallenge: string;
  verifiedBootState: string;
  osVersion: string;
  osPatchLevel: string;
  strongboxAvailable: boolean;
  isHardwareBacked: boolean;
  certificateChainCount: number;
  rootCa: string;
}

export interface BiometricScanToken {
  sessionId: string;
  authenticatedUser: string;
  hardwareBacked: boolean;
  livenessScore?: number;
  signatureBlob: string;
  expiresInSeconds: number;
}

export interface MLKitFaceScanResult {
  leftEyeOpenProb: number;
  rightEyeOpenProb: number;
  headYaw: number;
  headPitch: number;
  irisDetected: boolean;
  blinkCadenceMs: number;
}

export interface VaultPartitionInfo {
  partitionId: string;
  tenantId: string;
  tier: 'STANDARD' | 'DENIABLE_DECOY' | 'DENIABLE_HIDDEN_VAULT';
  mountPoint: string;
  saltHex: string;
  kdfIterations: number;
  onionAddress: string;
  status: 'UNMOUNTED' | 'MOUNTED' | 'SHREDDED';
  fileCount: number;
  totalBytes: number;
  createdAt: string;
  lastMountedAt?: string;
  decoyPairedId?: string;
}

export interface VaultFileItem {
  virtualPath: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  contentType: string;
  createdAt: string;
  modifiedAt: string;
  isEncrypted?: boolean;
}

export interface DuressSecurityProfileDTO {
  userId: string;
  failedAttemptsAllowed: number;
  failedAttemptsCurrent: number;
  autoShredOnMaxFails: boolean;
  torPanicBeaconOnion: string;
  saltSnippet: string;
  activeMemoryContexts: { id: string; sizeBytes: number; createdAt: string }[];
  isLockoutImminent: boolean;
}

export interface PanicExecutionAuditDTO {
  id: string;
  timestamp: string;
  triggerSource: string;
  severity: 'STANDARD_AUTH' | 'DECOY_AUTH' | 'PANIC_MEMORY_WIPE' | 'PANIC_FULL_SHRED';
  memoryKeysZeroized: number;
  storageFilesShredded: number;
  totalBytesShredded: number;
  torBeaconDispatched: boolean;
  status: string;
  durationMs: number;
}

export interface LocaleMetaDTO {
  code: string;
  baseLang: string;
  nameNative: string;
  nameEnglish: string;
  direction: 'ltr' | 'rtl';
  pluralRuleFamily: string;
  flagEmoji: string;
  isActive: boolean;
  totalKeys: number;
}

export interface TranslationResultDTO {
  key: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  count?: number;
  cldrCategory?: string | null;
  translatedText: string;
}

export interface TelemetryEventDTO {
  eventId: string;
  sequenceNum: number;
  timestampUtc: string;
  category: string;
  severity: 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'SECURITY_ALERT' | 'CRITICAL_BREACH' | 'DURESS_TRIGGERED';
  sourceComponent: string;
  actorId: string;
  action: string;
  targetResource: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'QUARANTINED';
  metadata: Record<string, any>;
  prevEventHash: string;
  eventHash: string;
  signatureMac: string;
  isEncrypted: boolean;
  encryptedPayloadB64?: string;
}

export interface LogArchiveManifestDTO {
  archiveId: string;
  archiveFilename: string;
  startSequence: number;
  endSequence: number;
  eventCount: number;
  fileSizeBytes: number;
  compressedSizeBytes: number;
  sha256Checksum: string;
  genesisHash: string;
  closingHash: string;
  createdAtUtc: string;
}

export interface TelemetryMetricsDTO {
  ringBufferCapacity: number;
  currentBufferSize: number;
  totalPushedCount: number;
  droppedEventsCount: number;
  authFailures: number;
  networkEgress: number;
  securityAlerts: number;
  duressEvents: number;
  encryptedEvents: number;
  headHash: string;
  totalRotatedArchives: number;
}

export interface IPCStatsDTO {
  socketPath: string;
  abstractNamespace: string;
  status: string;
  totalMessagesProcessed: number;
  exploitsIntercepted: number;
  lastExploitType: string;
  lastExploitTimeUtc: string;
  activeWorkers: number;
  bufferMemoryBarrierBytes: number;
  canaryValueHex: string;
  selinuxDomain: string;
  authorizedUids: number[];
}

export interface IPCCommandResponseDTO {
  success: boolean;
  verdict: 'ALLOWED_AND_EXECUTED' | 'BLOCKED_BY_FIREWALL';
  errorCode: number;
  errorMessage?: string;
  command?: string;
  args?: string[];
  callerUid?: number;
  executionTimeMs?: number;
  output?: Record<string, any>;
  tlvFrame?: {
    magicHex: string;
    versionHex: string;
    messageType: string;
    sequenceId: number;
    payloadLengthBytes: number;
    timestampMs: number;
    nonceHex: string;
    headerCanary: string;
    tailCanary: string;
    hmacSignatureSha256: string;
    socketChannel: string;
  };
}

export interface ExploitTestCaseDTO {
  id: string;
  name: string;
  attackType: string;
  payload: string;
  description: string;
  blocked: boolean;
  errorCode: number;
  verdict: string;
  defenseMechanism: string;
}

export type DozeModeState = 'ACTIVE' | 'DOZE_LIGHT' | 'DOZE_DEEP' | 'MAINTENANCE_WINDOW' | 'CHARGING_UNCONSTRAINED';
export type StandbyBucket = 'ACTIVE' | 'WORKING_SET' | 'FREQUENT' | 'RARE' | 'RESTRICTED';

export interface ZeroTouchStateDTO {
  isRunning: boolean;
  dozeState: DozeModeState;
  standbyBucket: StandbyBucket;
  batteryLevelPct: number;
  isCharging: boolean;
  isBatterySaver: boolean;
  heartbeatIntervalSeconds: number;
  dailyDrainRateEstPct: number;
  totalWakeLockAcquisitions: number;
  activeWakeLockDutyPct: number;
  torCircuitStatus: 'ACTIVE' | 'DORMANT' | 'CIRCUIT_REBUILDING' | 'DISCONNECTED';
  torActiveOnion: string;
  torLatencyMs: number;
  torCircuitsCount: number;
  biometricSessionValid: boolean;
  biometricTtlRemainingSeconds: number;
  biometricReauthCount: number;
  lastReauthTimestampUtc: string;
  totalHeartbeatsExecuted: number;
  lastHeartbeatTimestampUtc: string;
}

export interface HeartbeatLogDTO {
  sequence: number;
  timestamp: string;
  dozeState: DozeModeState;
  intervalSeconds: number;
  torStatus: string;
  torLatencyMs: number;
  biometricsValid: boolean;
  wakeLockMs: number;
  batteryDrainMah: number;
}

export type KivyThemeMode = 'DARK_CYBER' | 'LIGHT_HIGH_CONTRAST' | 'TACTICAL_AMBER';

export interface KivyPaletteDTO {
  bg: [number, number, number, number];
  surface: [number, number, number, number];
  text: [number, number, number, number];
  muted: [number, number, number, number];
  accent: [number, number, number, number];
}

export interface KivyUIStateDTO {
  flagSecureActive: boolean;
  theme: KivyThemeMode;
  themePalette: KivyPaletteDTO;
  biometricAuthenticated: boolean;
  renderApi: 'OpenGL ES 3.0' | 'Vulkan 1.2' | 'Software Fallback';
  fpsTarget: number;
  vsync: boolean;
  activeCircuits: number;
  screenDensityDpi: number;
  windowResolution: string;
}

export interface ScreenshotCaptureAttemptDTO {
  attemptId: string;
  timestamp: string;
  caller: string;
  flagSecureEnabled: boolean;
  outcome: 'BLOCKED_BLACK_FRAME' | 'CAPTURED_UNPROTECTED';
  details: string;
}









