// Fingerprinting Web Worker for large media processing
import type { 
  WorkerTask, 
  WorkerProgress, 
  WorkerResult, 
  WorkerMessage, 
  FileChunk,
  FingerprintConfig 
} from '@/types/worker';

// Worker context
const ctx: Worker = self as any;

class FingerprintProcessor {
  private currentTask: WorkerTask | null = null;
  private config: FingerprintConfig = {
    chunkSize: 1024 * 1024, // 1MB chunks
    hashAlgorithm: 'perceptual',
    quality: 'medium',
    generatePreview: true
  };

  async processTask(task: WorkerTask): Promise<void> {
    this.currentTask = task;
    const startTime = Date.now();

    try {
      this.sendProgress(task.id, 0, 'loading', 'Starting file processing...');

      // Determine processing method based on file type
      let result: WorkerResult;
      
      if (task.type === 'video') {
        result = await this.processVideo(task);
      } else if (task.type === 'audio') {
        result = await this.processAudio(task);
      } else {
        result = await this.processImage(task);
      }

      result.processingTime = Date.now() - startTime;
      this.sendResult(result);

    } catch (error) {
      this.sendError(task.id, error instanceof Error ? error.message : 'Unknown error', 'processing');
    }
  }

  private async processVideo(task: WorkerTask): Promise<WorkerResult> {
    const file = task.file;
    this.sendProgress(task.id, 10, 'processing', 'Loading video file...');

    // Create video element for processing
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          this.sendProgress(task.id, 30, 'processing', 'Analyzing video frames...');

          // Process video in chunks/frames for fingerprinting
          const fingerprint = await this.generateVideoFingerprint(video, canvas, ctx, task.id);
          
          this.sendProgress(task.id, 70, 'generating-preview', 'Creating thumbnail...');
          
          // Generate thumbnail
          video.currentTime = duration / 2; // Middle frame
          await new Promise(resolve => video.onseeked = resolve);
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

          this.sendProgress(task.id, 90, 'finalizing', 'Finalizing results...');

          resolve({
            taskId: task.id,
            success: true,
            fingerprintHash: fingerprint,
            duration,
            thumbnail,
            metadata: {
              fileSize: file.size,
              mimeType: file.type,
              width: video.videoWidth,
              height: video.videoHeight,
              bitrate: Math.round((file.size * 8) / duration) // Approximate bitrate
            },
            processingTime: 0 // Will be set by caller
          });
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  }

  private async processAudio(task: WorkerTask): Promise<WorkerResult> {
    const file = task.file;
    this.sendProgress(task.id, 10, 'processing', 'Loading audio file...');

    // Use Web Audio API for audio processing
    const arrayBuffer = await file.arrayBuffer();
    this.sendProgress(task.id, 30, 'processing', 'Decoding audio data...');

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    this.sendProgress(task.id, 50, 'processing', 'Generating audio fingerprint...');

    // Generate audio fingerprint
    const fingerprint = await this.generateAudioFingerprint(audioBuffer, task.id);

    this.sendProgress(task.id, 70, 'generating-preview', 'Creating waveform...');

    // Generate waveform data
    const waveform = this.generateWaveform(audioBuffer);

    this.sendProgress(task.id, 90, 'finalizing', 'Finalizing results...');

    return {
      taskId: task.id,
      success: true,
      fingerprintHash: fingerprint,
      duration: audioBuffer.duration,
      waveform,
      metadata: {
        fileSize: file.size,
        mimeType: file.type,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      },
      processingTime: 0
    };
  }

  private async processImage(task: WorkerTask): Promise<WorkerResult> {
    const file = task.file;
    this.sendProgress(task.id, 10, 'processing', 'Loading image...');

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          this.sendProgress(task.id, 50, 'processing', 'Generating perceptual hash...');

          const fingerprint = await this.generateImageFingerprint(canvas, ctx, task.id);

          this.sendProgress(task.id, 90, 'finalizing', 'Finalizing results...');

          resolve({
            taskId: task.id,
            success: true,
            fingerprintHash: fingerprint,
            metadata: {
              fileSize: file.size,
              mimeType: file.type,
              width: img.width,
              height: img.height
            },
            processingTime: 0
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateVideoFingerprint(
    video: HTMLVideoElement, 
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D,
    taskId: string
  ): Promise<string> {
    const duration = video.duration;
    const sampleCount = Math.min(10, Math.floor(duration)); // Sample up to 10 frames
    const hashes: string[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const time = (duration / sampleCount) * i;
      video.currentTime = time;
      
      await new Promise(resolve => video.onseeked = resolve);
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameHash = await this.generatePerceptualHash(canvas, ctx);
      hashes.push(frameHash);

      // Update progress
      const progress = 30 + (i / sampleCount) * 40;
      this.sendProgress(taskId, progress, 'processing', `Processing frame ${i + 1}/${sampleCount}...`);
    }

    // Combine frame hashes into a single video fingerprint
    return this.combineHashes(hashes);
  }

  private async generateAudioFingerprint(audioBuffer: AudioBuffer, taskId: string): Promise<string> {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const chunkSize = Math.floor(channelData.length / 20); // 20 chunks
    const hashes: string[] = [];

    for (let i = 0; i < 20; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, channelData.length);
      const chunk = channelData.slice(start, end);
      
      // Generate hash for this audio chunk using spectral features
      const hash = await this.generateAudioChunkHash(chunk);
      hashes.push(hash);

      // Update progress
      const progress = 50 + (i / 20) * 20;
      this.sendProgress(taskId, progress, 'processing', `Processing audio chunk ${i + 1}/20...`);
    }

    return this.combineHashes(hashes);
  }

  private async generateImageFingerprint(
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D,
    taskId: string
  ): Promise<string> {
    return this.generatePerceptualHash(canvas, ctx);
  }

  private async generatePerceptualHash(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<string> {
    // Resize to 32x32 for perceptual hashing
    const size = 32;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCanvas.width = size;
    tempCanvas.height = size;
    tempCtx.drawImage(canvas, 0, 0, size, size);
    
    const imageData = tempCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    // Convert to grayscale and calculate average
    let sum = 0;
    const pixels: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      pixels.push(gray);
      sum += gray;
    }
    
    const average = sum / pixels.length;
    
    // Generate hash based on pixels above/below average
    let hash = '';
    for (const pixel of pixels) {
      hash += pixel > average ? '1' : '0';
    }
    
    // Convert binary to hex
    return this.binaryToHex(hash);
  }

  private async generateAudioChunkHash(chunk: Float32Array): Promise<string> {
    // Simple spectral hash - in production, use more sophisticated audio fingerprinting
    const fftSize = Math.min(1024, chunk.length);
    const fft = this.simpleFFT(chunk.slice(0, fftSize));
    
    // Get magnitude spectrum
    const magnitudes = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
    
    // Create hash from spectral peaks
    const average = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    let hash = '';
    
    for (const mag of magnitudes) {
      hash += mag > average ? '1' : '0';
    }
    
    return this.binaryToHex(hash.slice(0, 256)); // Limit to 256 bits
  }

  private generateWaveform(audioBuffer: AudioBuffer, samples: number = 200): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      
      waveform.push(sum / (end - start));
    }

    return waveform;
  }

  private combineHashes(hashes: string[]): string {
    // Simple hash combination - XOR all hashes
    if (hashes.length === 0) return '';
    
    let combined = hashes[0];
    for (let i = 1; i < hashes.length; i++) {
      combined = this.xorHashes(combined, hashes[i]);
    }
    
    return combined;
  }

  private xorHashes(hash1: string, hash2: string): string {
    const maxLength = Math.max(hash1.length, hash2.length);
    hash1 = hash1.padStart(maxLength, '0');
    hash2 = hash2.padStart(maxLength, '0');
    
    let result = '';
    for (let i = 0; i < maxLength; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      result += xor.toString(16);
    }
    
    return result;
  }

  private binaryToHex(binary: string): string {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      const chunk = binary.slice(i, i + 4).padEnd(4, '0');
      hex += parseInt(chunk, 2).toString(16);
    }
    return hex;
  }

  private simpleFFT(data: Float32Array): Array<{real: number, imag: number}> {
    // Simplified FFT implementation - in production, use a proper FFT library
    const N = data.length;
    const result: Array<{real: number, imag: number}> = [];
    
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      
      result.push({ real, imag });
    }
    
    return result;
  }

  private sendProgress(taskId: string, progress: number, stage: WorkerProgress['stage'], message: string): void {
    const progressData: WorkerProgress = {
      taskId,
      progress: Math.round(progress),
      stage,
      message
    };

    ctx.postMessage({
      type: 'progress',
      data: progressData
    } as WorkerMessage);
  }

  private sendResult(result: WorkerResult): void {
    ctx.postMessage({
      type: 'result',
      data: result
    } as WorkerMessage);
  }

  private sendError(taskId: string, error: string, stage: string): void {
    ctx.postMessage({
      type: 'error',
      data: { taskId, error, stage }
    } as WorkerMessage);
  }
}

// Worker message handler
const processor = new FingerprintProcessor();

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  if (type === 'task') {
    const task = data as WorkerTask;
    await processor.processTask(task);
  }
};

// Export for TypeScript
export {};
