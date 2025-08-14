// Worker message types for background fingerprinting
export interface WorkerTask {
  id: string;
  file: File;
  type: 'video' | 'audio' | 'image';
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
}

export interface WorkerProgress {
  taskId: string;
  progress: number; // 0-100
  stage: 'loading' | 'processing' | 'generating-preview' | 'finalizing';
  message: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  fingerprintHash: string;
  duration?: number; // in seconds for video/audio
  thumbnail?: string; // base64 data URL for video
  waveform?: number[]; // amplitude values for audio
  metadata: {
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
  };
  processingTime: number; // milliseconds
  error?: string;
}

export interface WorkerMessage {
  type: 'task' | 'progress' | 'result' | 'error' | 'queue-status';
  data: WorkerTask | WorkerProgress | WorkerResult | WorkerError | QueueStatus;
}

export interface WorkerError {
  taskId: string;
  error: string;
  stage: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

// Chunk processing for large files
export interface FileChunk {
  data: ArrayBuffer;
  index: number;
  total: number;
  offset: number;
}

// Fingerprinting algorithms configuration
export interface FingerprintConfig {
  chunkSize: number; // bytes
  hashAlgorithm: 'perceptual' | 'audio-fingerprint' | 'content-hash';
  quality: 'low' | 'medium' | 'high';
  generatePreview: boolean;
}
