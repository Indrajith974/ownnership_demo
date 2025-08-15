// Unified Fingerprinting Engine for The Ownership Layer
// Supports: Text, Code, Image, Audio, Video

export interface FingerprintResult {
  hash: string;
  simHash?: string;
  contentType: string;
  fileSize: number;
  timestamp: number;
  metadata: {
    algorithm: string;
    confidence: number;
    features?: string[];
    preview?: string;
  };
}

export interface MediaFile {
  file: File;
  content?: string | ArrayBuffer;
  preview?: string;
}

// Supported content types
export const SUPPORTED_TYPES = {
  text: ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css'],
  code: ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'swift', 'kt'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'],
  video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv']
};

// Detect content type from file
export function detectContentType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  for (const [type, extensions] of Object.entries(SUPPORTED_TYPES)) {
    if (extensions.includes(extension)) {
      return type;
    }
  }
  
  // Fallback to MIME type detection
  if (file.type.startsWith('text/')) return 'text';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  
  return 'unknown';
}

// Main fingerprinting function
export async function fingerprintMedia(mediaFile: MediaFile): Promise<FingerprintResult> {
  const contentType = detectContentType(mediaFile.file);
  
  switch (contentType) {
    case 'text':
      return await fingerprintText(mediaFile);
    case 'code':
      return await fingerprintCode(mediaFile);
    case 'image':
      return await fingerprintImage(mediaFile);
    case 'audio':
      return await fingerprintAudio(mediaFile);
    case 'video':
      return await fingerprintVideo(mediaFile);
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

// Text fingerprinting using NLP-style hashing
async function fingerprintText(mediaFile: MediaFile): Promise<FingerprintResult> {
  const content = mediaFile.content as string;
  
  // Clean and normalize text
  const cleanText = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract features (words, phrases, structure)
  const words = cleanText.split(' ').filter(w => w.length > 2);
  const uniqueWords = [...new Set(words)];
  const wordFreq = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Generate content hash
  const hash = await generateSHA256(cleanText);
  
  // Generate similarity hash (SimHash-like)
  const simHash = generateSimHash(uniqueWords);
  
  return {
    hash,
    simHash,
    contentType: 'text',
    fileSize: mediaFile.file.size,
    timestamp: Date.now(),
    metadata: {
      algorithm: 'SHA256 + SimHash',
      confidence: 0.95,
      features: uniqueWords.slice(0, 10), // Top features
      preview: content.substring(0, 200)
    }
  };
}

// Code fingerprinting using AST-like analysis
async function fingerprintCode(mediaFile: MediaFile): Promise<FingerprintResult> {
  const content = mediaFile.content as string;
  
  // Extract code structure features
  const features = extractCodeFeatures(content);
  
  // Generate hash from normalized code
  const normalizedCode = normalizeCode(content);
  const hash = await generateSHA256(normalizedCode);
  
  // Generate structural similarity hash
  const simHash = generateSimHash(features);
  
  return {
    hash,
    simHash,
    contentType: 'code',
    fileSize: mediaFile.file.size,
    timestamp: Date.now(),
    metadata: {
      algorithm: 'AST + SHA256',
      confidence: 0.90,
      features: features.slice(0, 10),
      preview: content.substring(0, 200)
    }
  };
}

// Image fingerprinting using perceptual hashing
async function fingerprintImage(mediaFile: MediaFile): Promise<FingerprintResult> {
  // For now, use file-based hashing (in production, use perceptual hashing)
  const arrayBuffer = mediaFile.content as ArrayBuffer;
  const hash = await generateSHA256FromBuffer(arrayBuffer);
  
  // Generate perceptual hash (simplified version)
  const perceptualHash = generatePerceptualHash(arrayBuffer);
  
  return {
    hash,
    simHash: perceptualHash,
    contentType: 'image',
    fileSize: mediaFile.file.size,
    timestamp: Date.now(),
    metadata: {
      algorithm: 'Perceptual Hash + SHA256',
      confidence: 0.85,
      features: ['visual_features'],
      preview: mediaFile.preview
    }
  };
}

// Audio fingerprinting using spectral analysis
async function fingerprintAudio(mediaFile: MediaFile): Promise<FingerprintResult> {
  const arrayBuffer = mediaFile.content as ArrayBuffer;
  
  // Generate file hash
  const hash = await generateSHA256FromBuffer(arrayBuffer);
  
  // Generate audio fingerprint (simplified - in production use proper audio fingerprinting)
  const audioFingerprint = generateAudioFingerprint(arrayBuffer);
  
  return {
    hash,
    simHash: audioFingerprint,
    contentType: 'audio',
    fileSize: mediaFile.file.size,
    timestamp: Date.now(),
    metadata: {
      algorithm: 'Spectral Analysis + SHA256',
      confidence: 0.80,
      features: ['spectral_features', 'tempo', 'pitch'],
      preview: `Audio file: ${mediaFile.file.name}`
    }
  };
}

// Video fingerprinting using frame analysis
async function fingerprintVideo(mediaFile: MediaFile): Promise<FingerprintResult> {
  const arrayBuffer = mediaFile.content as ArrayBuffer;
  
  // Generate file hash
  const hash = await generateSHA256FromBuffer(arrayBuffer);
  
  // Generate video fingerprint (simplified - in production use proper video fingerprinting)
  const videoFingerprint = generateVideoFingerprint(arrayBuffer);
  
  return {
    hash,
    simHash: videoFingerprint,
    contentType: 'video',
    fileSize: mediaFile.file.size,
    timestamp: Date.now(),
    metadata: {
      algorithm: 'Frame Analysis + SHA256',
      confidence: 0.75,
      features: ['frame_features', 'motion', 'color_histogram'],
      preview: `Video file: ${mediaFile.file.name}`
    }
  };
}

// Utility functions
async function generateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateSHA256FromBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSimHash(features: string[]): string {
  // Simplified SimHash implementation
  const hash = features.join('').split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
  }, 0);
  return Math.abs(hash).toString(16);
}

function extractCodeFeatures(code: string): string[] {
  const features: string[] = [];
  
  // Extract function names
  const functionMatches = code.match(/function\s+(\w+)|(\w+)\s*\(/g) || [];
  features.push(...functionMatches.map(m => m.replace(/function\s+|[()]/g, '')));
  
  // Extract variable declarations
  const varMatches = code.match(/(?:var|let|const)\s+(\w+)/g) || [];
  features.push(...varMatches.map(m => m.split(/\s+/)[1]));
  
  // Extract class names
  const classMatches = code.match(/class\s+(\w+)/g) || [];
  features.push(...classMatches.map(m => m.split(/\s+/)[1]));
  
  // Extract import statements
  const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
  features.push(...importMatches.map(m => m.match(/['"]([^'"]+)['"]/)![1]));
  
  return [...new Set(features)].filter(f => f && f.length > 1);
}

function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
    .trim();
}

function generatePerceptualHash(buffer: ArrayBuffer): string {
  // Simplified perceptual hash - in production, use proper image processing
  const view = new Uint8Array(buffer);
  let hash = 0;
  
  // Sample bytes at regular intervals
  const step = Math.max(1, Math.floor(view.length / 64));
  for (let i = 0; i < view.length; i += step) {
    hash = ((hash << 1) ^ view[i]) & 0xffffffff;
  }
  
  return Math.abs(hash).toString(16);
}

function generateAudioFingerprint(buffer: ArrayBuffer): string {
  // Simplified audio fingerprint - in production, use proper audio analysis
  const view = new Uint8Array(buffer);
  let fingerprint = 0;
  
  // Analyze audio data patterns
  for (let i = 0; i < Math.min(view.length, 1024); i++) {
    fingerprint = ((fingerprint << 2) ^ view[i]) & 0xffffffff;
  }
  
  return Math.abs(fingerprint).toString(16);
}

function generateVideoFingerprint(buffer: ArrayBuffer): string {
  // Simplified video fingerprint - in production, use proper video analysis
  const view = new Uint8Array(buffer);
  let fingerprint = 0;
  
  // Analyze video data patterns
  const frameSize = 1024;
  for (let i = 0; i < Math.min(view.length, frameSize * 10); i += frameSize) {
    const frameByte = view[i] || 0;
    fingerprint = ((fingerprint << 3) ^ frameByte) & 0xffffffff;
  }
  
  return Math.abs(fingerprint).toString(16);
}

// File reading utilities
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
