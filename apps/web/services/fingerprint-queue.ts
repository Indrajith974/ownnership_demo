// Fingerprint Queue Manager with Web Worker Pool
import type { 
  WorkerTask, 
  WorkerProgress, 
  WorkerResult, 
  WorkerMessage, 
  WorkerError,
  QueueStatus 
} from '@/types/worker';

export type TaskCallback = (result: WorkerResult) => void;
export type ProgressCallback = (progress: WorkerProgress) => void;
export type ErrorCallback = (error: WorkerError) => void;

interface QueuedTask extends WorkerTask {
  onProgress?: ProgressCallback;
  onComplete?: TaskCallback;
  onError?: ErrorCallback;
  retryCount: number;
  maxRetries: number;
}

export class FingerprintQueue {
  private workers: Worker[] = [];
  private queue: QueuedTask[] = [];
  private processing: Map<string, QueuedTask> = new Map();
  private completed: Map<string, WorkerResult> = new Map();
  private failed: Map<string, WorkerError> = new Map();
  private workerPool: Worker[] = [];
  private maxWorkers: number;
  private isInitialized = false;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create worker pool
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(
          new URL('../workers/fingerprint-worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        
        this.workerPool.push(worker);
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error);
      }
    }

    if (this.workerPool.length === 0) {
      throw new Error('Failed to create any workers. Web Workers may not be supported.');
    }

    this.isInitialized = true;
    console.log(`Fingerprint queue initialized with ${this.workerPool.length} workers`);
  }

  addTask(
    file: File,
    options: {
      priority?: 'low' | 'normal' | 'high';
      maxRetries?: number;
      onProgress?: ProgressCallback;
      onComplete?: TaskCallback;
      onError?: ErrorCallback;
    } = {}
  ): string {
    const taskId = this.generateTaskId();
    const fileType = this.detectFileType(file);

    const task: QueuedTask = {
      id: taskId,
      file,
      type: fileType,
      priority: options.priority || 'normal',
      createdAt: Date.now(),
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    // Insert task based on priority
    this.insertTaskByPriority(task);
    
    // Try to process immediately if workers are available
    this.processNextTask();

    return taskId;
  }

  removeTask(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.queue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    // If task is processing, we can't remove it but mark it for cancellation
    if (this.processing.has(taskId)) {
      // In a real implementation, you'd send a cancellation message to the worker
      console.warn(`Task ${taskId} is currently processing and cannot be cancelled`);
      return false;
    }

    return false;
  }

  getTaskStatus(taskId: string): 'pending' | 'processing' | 'completed' | 'failed' | 'not-found' {
    if (this.queue.some(task => task.id === taskId)) return 'pending';
    if (this.processing.has(taskId)) return 'processing';
    if (this.completed.has(taskId)) return 'completed';
    if (this.failed.has(taskId)) return 'failed';
    return 'not-found';
  }

  getTaskResult(taskId: string): WorkerResult | null {
    return this.completed.get(taskId) || null;
  }

  getTaskError(taskId: string): WorkerError | null {
    return this.failed.get(taskId) || null;
  }

  getQueueStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size
    };
  }

  clearCompleted(): void {
    this.completed.clear();
    this.failed.clear();
  }

  pause(): void {
    // In a real implementation, you'd pause all workers
    console.log('Queue paused');
  }

  resume(): void {
    // In a real implementation, you'd resume all workers
    this.processNextTask();
    console.log('Queue resumed');
  }

  destroy(): void {
    // Terminate all workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
    this.queue = [];
    this.processing.clear();
    this.completed.clear();
    this.failed.clear();
    this.isInitialized = false;
  }

  private insertTaskByPriority(task: QueuedTask): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority];
      if (taskPriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, task);
  }

  private processNextTask(): void {
    if (!this.isInitialized || this.queue.length === 0) return;

    // Find available worker
    const availableWorker = this.workerPool.find(worker => 
      !Array.from(this.processing.values()).some(task => 
        this.getWorkerForTask(task.id) === worker
      )
    );

    if (!availableWorker) return; // No available workers

    const task = this.queue.shift();
    if (!task) return;

    // Move task to processing
    this.processing.set(task.id, task);

    // Send task to worker
    const message: WorkerMessage = {
      type: 'task',
      data: task
    };

    availableWorker.postMessage(message);

    // Try to process more tasks
    setTimeout(() => this.processNextTask(), 0);
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const { type, data } = event.data;

    switch (type) {
      case 'progress':
        this.handleProgress(data as WorkerProgress);
        break;
      case 'result':
        this.handleResult(data as WorkerResult);
        break;
      case 'error':
        this.handleError(data as WorkerError);
        break;
    }
  }

  private handleWorkerError(event: ErrorEvent): void {
    console.error('Worker error:', event.error);
    // Handle worker crashes - reassign tasks if needed
  }

  private handleProgress(progress: WorkerProgress): void {
    const task = this.processing.get(progress.taskId);
    if (task && task.onProgress) {
      task.onProgress(progress);
    }
  }

  private handleResult(result: WorkerResult): void {
    const task = this.processing.get(result.taskId);
    if (!task) return;

    // Move from processing to completed
    this.processing.delete(result.taskId);
    this.completed.set(result.taskId, result);

    // Call completion callback
    if (task.onComplete) {
      task.onComplete(result);
    }

    // Process next task
    this.processNextTask();
  }

  private handleError(error: WorkerError): void {
    const task = this.processing.get(error.taskId);
    if (!task) return;

    // Remove from processing
    this.processing.delete(error.taskId);

    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      console.log(`Retrying task ${error.taskId} (attempt ${task.retryCount}/${task.maxRetries})`);
      
      // Add back to queue with lower priority
      task.priority = 'low';
      this.insertTaskByPriority(task);
      this.processNextTask();
    } else {
      // Max retries reached, mark as failed
      this.failed.set(error.taskId, error);
      
      if (task.onError) {
        task.onError(error);
      }
    }

    // Process next task
    this.processNextTask();
  }

  private getWorkerForTask(taskId: string): Worker | null {
    // In a more sophisticated implementation, you'd track which worker is handling which task
    return null;
  }

  private detectFileType(file: File): 'video' | 'audio' | 'image' {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let queueInstance: FingerprintQueue | null = null;

export async function getFingerprintQueue(): Promise<FingerprintQueue> {
  if (!queueInstance) {
    queueInstance = new FingerprintQueue();
    await queueInstance.initialize();
  }
  return queueInstance;
}

export function destroyFingerprintQueue(): void {
  if (queueInstance) {
    queueInstance.destroy();
    queueInstance = null;
  }
}
