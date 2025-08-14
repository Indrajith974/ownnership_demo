// Server-side fallback for fingerprinting large media files
import type { WorkerResult } from '@/types/worker';

interface ServerFingerprintOptions {
  endpoint?: string;
  maxFileSize?: number; // bytes
  timeout?: number; // milliseconds
  apiKey?: string;
}

interface ServerFingerprintProgress {
  progress: number;
  stage: string;
  message: string;
}

export class ServerFingerprintService {
  private options: Required<ServerFingerprintOptions>;

  constructor(options: ServerFingerprintOptions = {}) {
    this.options = {
      endpoint: options.endpoint || '/api/fingerprint',
      maxFileSize: options.maxFileSize || 1024 * 1024 * 1024, // 1GB
      timeout: options.timeout || 300000, // 5 minutes
      apiKey: options.apiKey || process.env.NEXT_PUBLIC_API_KEY || ''
    };
  }

  async fingerprintFile(
    file: File,
    onProgress?: (progress: ServerFingerprintProgress) => void
  ): Promise<WorkerResult> {
    // Check file size
    if (file.size > this.options.maxFileSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${this.options.maxFileSize} bytes`);
    }

    const taskId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // For very large files, use chunked upload
      if (file.size > 50 * 1024 * 1024) { // 50MB
        return await this.uploadInChunks(file, taskId, onProgress);
      } else {
        return await this.uploadDirect(file, taskId, onProgress);
      }
    } catch (error) {
      throw new Error(`Server fingerprinting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadDirect(
    file: File,
    taskId: string,
    onProgress?: (progress: ServerFingerprintProgress) => void
  ): Promise<WorkerResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);

    onProgress?.({
      progress: 10,
      stage: 'uploading',
      message: 'Uploading file to server...'
    });

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
      },
      signal: AbortSignal.timeout(this.options.timeout)
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    // Check if response is streaming (for progress updates)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await this.handleStreamingResponse(response, taskId, onProgress);
    } else {
      // Direct JSON response
      onProgress?.({
        progress: 90,
        stage: 'processing',
        message: 'Processing on server...'
      });

      const result = await response.json();
      
      onProgress?.({
        progress: 100,
        stage: 'completed',
        message: 'Processing complete'
      });

      return this.formatServerResult(result, taskId);
    }
  }

  private async uploadInChunks(
    file: File,
    taskId: string,
    onProgress?: (progress: ServerFingerprintProgress) => void
  ): Promise<WorkerResult> {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;

    onProgress?.({
      progress: 0,
      stage: 'uploading',
      message: `Uploading in ${totalChunks} chunks...`
    });

    // Initialize chunked upload
    const initResponse = await fetch(`${this.options.endpoint}/chunked/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
      },
      body: JSON.stringify({
        taskId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        totalChunks
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize chunked upload: ${initResponse.statusText}`);
    }

    const { uploadId } = await initResponse.json();

    // Upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());

      const chunkResponse = await fetch(`${this.options.endpoint}/chunked/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
        }
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${chunkIndex}: ${chunkResponse.statusText}`);
      }

      uploadedChunks++;
      const uploadProgress = (uploadedChunks / totalChunks) * 50; // Upload is 50% of total progress

      onProgress?.({
        progress: uploadProgress,
        stage: 'uploading',
        message: `Uploaded chunk ${uploadedChunks}/${totalChunks}`
      });
    }

    // Finalize and process
    onProgress?.({
      progress: 60,
      stage: 'processing',
      message: 'Finalizing upload and starting processing...'
    });

    const finalizeResponse = await fetch(`${this.options.endpoint}/chunked/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
      },
      body: JSON.stringify({ uploadId, taskId })
    });

    if (!finalizeResponse.ok) {
      throw new Error(`Failed to finalize upload: ${finalizeResponse.statusText}`);
    }

    // Poll for results or handle streaming response
    return await this.pollForResults(taskId, onProgress);
  }

  private async handleStreamingResponse(
    response: Response,
    taskId: string,
    onProgress?: (progress: ServerFingerprintProgress) => void
  ): Promise<WorkerResult> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let result: WorkerResult | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                onProgress?.(data.progress);
              } else if (data.type === 'result') {
                result = this.formatServerResult(data.result, taskId);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!result) {
      throw new Error('No result received from server');
    }

    return result;
  }

  private async pollForResults(
    taskId: string,
    onProgress?: (progress: ServerFingerprintProgress) => void
  ): Promise<WorkerResult> {
    const pollInterval = 2000; // 2 seconds
    const maxPolls = 150; // 5 minutes max
    let polls = 0;

    while (polls < maxPolls) {
      const response = await fetch(`${this.options.endpoint}/status/${taskId}`, {
        headers: {
          ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to poll status: ${response.statusText}`);
      }

      const status = await response.json();

      if (status.progress) {
        onProgress?.(status.progress);
      }

      if (status.completed) {
        return this.formatServerResult(status.result, taskId);
      }

      if (status.failed) {
        throw new Error(status.error || 'Server processing failed');
      }

      polls++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Server processing timeout');
  }

  private formatServerResult(serverResult: any, taskId: string): WorkerResult {
    return {
      taskId,
      success: true,
      fingerprintHash: serverResult.fingerprintHash || serverResult.hash,
      duration: serverResult.duration,
      thumbnail: serverResult.thumbnail,
      waveform: serverResult.waveform,
      metadata: {
        fileSize: serverResult.metadata?.fileSize || 0,
        mimeType: serverResult.metadata?.mimeType || '',
        width: serverResult.metadata?.width,
        height: serverResult.metadata?.height,
        bitrate: serverResult.metadata?.bitrate,
        sampleRate: serverResult.metadata?.sampleRate,
        channels: serverResult.metadata?.channels
      },
      processingTime: serverResult.processingTime || 0
    };
  }

  // Check if server-side processing is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.endpoint}/health`, {
        method: 'GET',
        headers: {
          ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get server capabilities
  async getCapabilities(): Promise<{
    maxFileSize: number;
    supportedFormats: string[];
    features: string[];
  }> {
    const response = await fetch(`${this.options.endpoint}/capabilities`, {
      headers: {
        ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get capabilities: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Singleton instance
let serverServiceInstance: ServerFingerprintService | null = null;

export function getServerFingerprintService(options?: ServerFingerprintOptions): ServerFingerprintService {
  if (!serverServiceInstance) {
    serverServiceInstance = new ServerFingerprintService(options);
  }
  return serverServiceInstance;
}

// Utility function to determine if file should use server-side processing
export function shouldUseServerProcessing(file: File): boolean {
  const largeFileThreshold = 100 * 1024 * 1024; // 100MB
  const complexFormats = ['video/mp4', 'video/avi', 'video/mov', 'audio/flac', 'audio/wav'];
  
  return (
    file.size > largeFileThreshold ||
    complexFormats.includes(file.type) ||
    !window.Worker // Fallback if Web Workers not supported
  );
}
