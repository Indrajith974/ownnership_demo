// React hook for managing fingerprint queue
import { useState, useEffect, useCallback, useRef } from 'react';
import { getFingerprintQueue, destroyFingerprintQueue } from '@/services/fingerprint-queue';
import type { 
  WorkerProgress, 
  WorkerResult, 
  WorkerError, 
  QueueStatus 
} from '@/types/worker';

interface TaskState {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: WorkerProgress | null;
  result: WorkerResult | null;
  error: WorkerError | null;
}

interface UseFingerprintQueueReturn {
  // Queue management
  addTask: (file: File, options?: {
    priority?: 'low' | 'normal' | 'high';
    onProgress?: (progress: WorkerProgress) => void;
    onComplete?: (result: WorkerResult) => void;
    onError?: (error: WorkerError) => void;
  }) => string;
  removeTask: (taskId: string) => boolean;
  clearCompleted: () => void;
  
  // Queue state
  tasks: TaskState[];
  queueStatus: QueueStatus;
  isInitialized: boolean;
  
  // Batch operations
  addMultipleTasks: (files: File[], options?: {
    priority?: 'low' | 'normal' | 'high';
    onBatchProgress?: (completed: number, total: number) => void;
    onBatchComplete?: (results: WorkerResult[]) => void;
  }) => string[];
  
  // Queue control
  pauseQueue: () => void;
  resumeQueue: () => void;
  destroyQueue: () => void;
}

export function useFingerprintQueue(): UseFingerprintQueueReturn {
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);
  
  const queueRef = useRef<Awaited<ReturnType<typeof getFingerprintQueue>> | null>(null);
  const tasksRef = useRef<Map<string, TaskState>>(new Map());

  // Initialize queue
  useEffect(() => {
    let mounted = true;

    const initQueue = async () => {
      try {
        const queue = await getFingerprintQueue();
        if (mounted) {
          queueRef.current = queue;
          setIsInitialized(true);
          updateQueueStatus();
        }
      } catch (error) {
        console.error('Failed to initialize fingerprint queue:', error);
      }
    };

    initQueue();

    return () => {
      mounted = false;
    };
  }, []);

  // Update queue status periodically
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(updateQueueStatus, 1000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  const updateQueueStatus = useCallback(() => {
    if (!queueRef.current) return;

    const status = queueRef.current.getQueueStatus();
    setQueueStatus(status);
  }, []);

  const updateTaskState = useCallback((taskId: string, updates: Partial<TaskState>) => {
    const currentTask = tasksRef.current.get(taskId);
    if (!currentTask) return;

    const updatedTask = { ...currentTask, ...updates };
    tasksRef.current.set(taskId, updatedTask);
    
    setTasks(Array.from(tasksRef.current.values()));
  }, []);

  const addTask = useCallback((
    file: File, 
    options: {
      priority?: 'low' | 'normal' | 'high';
      onProgress?: (progress: WorkerProgress) => void;
      onComplete?: (result: WorkerResult) => void;
      onError?: (error: WorkerError) => void;
    } = {}
  ): string => {
    if (!queueRef.current) {
      throw new Error('Queue not initialized');
    }

    const taskId = queueRef.current.addTask(file, {
      ...options,
      onProgress: (progress) => {
        updateTaskState(taskId, { 
          status: 'processing', 
          progress 
        });
        options.onProgress?.(progress);
      },
      onComplete: (result) => {
        updateTaskState(taskId, { 
          status: 'completed', 
          result,
          progress: null 
        });
        options.onComplete?.(result);
      },
      onError: (error) => {
        updateTaskState(taskId, { 
          status: 'failed', 
          error,
          progress: null 
        });
        options.onError?.(error);
      }
    });

    // Add to local state
    const taskState: TaskState = {
      id: taskId,
      file,
      status: 'pending',
      progress: null,
      result: null,
      error: null
    };

    tasksRef.current.set(taskId, taskState);
    setTasks(Array.from(tasksRef.current.values()));

    return taskId;
  }, [updateTaskState]);

  const removeTask = useCallback((taskId: string): boolean => {
    if (!queueRef.current) return false;

    const success = queueRef.current.removeTask(taskId);
    if (success) {
      tasksRef.current.delete(taskId);
      setTasks(Array.from(tasksRef.current.values()));
    }
    return success;
  }, []);

  const clearCompleted = useCallback(() => {
    if (!queueRef.current) return;

    queueRef.current.clearCompleted();
    
    // Remove completed and failed tasks from local state
    for (const [taskId, task] of tasksRef.current.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        tasksRef.current.delete(taskId);
      }
    }
    
    setTasks(Array.from(tasksRef.current.values()));
  }, []);

  const addMultipleTasks = useCallback((
    files: File[],
    options: {
      priority?: 'low' | 'normal' | 'high';
      onBatchProgress?: (completed: number, total: number) => void;
      onBatchComplete?: (results: WorkerResult[]) => void;
    } = {}
  ): string[] => {
    const taskIds: string[] = [];
    const results: WorkerResult[] = [];
    let completedCount = 0;

    files.forEach(file => {
      const taskId = addTask(file, {
        priority: options.priority,
        onComplete: (result) => {
          results.push(result);
          completedCount++;
          
          options.onBatchProgress?.(completedCount, files.length);
          
          if (completedCount === files.length) {
            options.onBatchComplete?.(results);
          }
        }
      });
      
      taskIds.push(taskId);
    });

    return taskIds;
  }, [addTask]);

  const pauseQueue = useCallback(() => {
    queueRef.current?.pause();
  }, []);

  const resumeQueue = useCallback(() => {
    queueRef.current?.resume();
  }, []);

  const destroyQueue = useCallback(() => {
    destroyFingerprintQueue();
    queueRef.current = null;
    tasksRef.current.clear();
    setTasks([]);
    setIsInitialized(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the queue on unmount as it might be used by other components
      // Only destroy when explicitly called
    };
  }, []);

  return {
    addTask,
    removeTask,
    clearCompleted,
    tasks,
    queueStatus,
    isInitialized,
    addMultipleTasks,
    pauseQueue,
    resumeQueue,
    destroyQueue
  };
}
