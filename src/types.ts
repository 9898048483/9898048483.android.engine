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

