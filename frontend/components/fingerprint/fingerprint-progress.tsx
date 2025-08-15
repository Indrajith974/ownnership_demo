'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileVideo,
  FileAudio,
  FileImage,
  Loader2
} from 'lucide-react';
import type { WorkerProgress, QueueStatus } from '@/types/worker';

interface TaskProgressProps {
  taskId: string;
  fileName: string;
  fileType: 'video' | 'audio' | 'image';
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: WorkerProgress | null;
  onRemove?: (taskId: string) => void;
}

export function TaskProgress({ 
  taskId, 
  fileName, 
  fileType, 
  fileSize,
  status, 
  progress, 
  onRemove 
}: TaskProgressProps) {
  const getFileIcon = () => {
    switch (fileType) {
      case 'video': return FileVideo;
      case 'audio': return FileAudio;
      default: return FileImage;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': return Loader2;
      case 'completed': return CheckCircle;
      case 'failed': return AlertCircle;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'processing': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const FileIcon = getFileIcon();
  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-sm truncate max-w-[200px]" title={fileName}>
                  {fileName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(fileSize)} • {fileType}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <StatusIcon 
                  className={`w-3 h-3 ${getStatusColor()} ${status === 'processing' ? 'animate-spin' : ''}`} 
                />
                <span className="capitalize">{status}</span>
              </Badge>
              
              {onRemove && (status === 'pending' || status === 'completed' || status === 'failed') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(taskId)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {status === 'processing' && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{progress.message}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              
              {progress.bytesProcessed && progress.totalBytes && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Stage: {progress.stage}</span>
                  <span>
                    {formatFileSize(progress.bytesProcessed)} / {formatFileSize(progress.totalBytes)}
                  </span>
                </div>
              )}
            </div>
          )}

          {status === 'failed' && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
              Processing failed. The file may be corrupted or unsupported.
            </div>
          )}

          {status === 'completed' && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-600 dark:text-green-400">
              ✓ Fingerprint generated successfully
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface QueueStatusProps {
  status: QueueStatus;
  onPause?: () => void;
  onResume?: () => void;
  onClearCompleted?: () => void;
  isPaused?: boolean;
}

export function QueueStatusDisplay({ 
  status, 
  onPause, 
  onResume, 
  onClearCompleted,
  isPaused = false 
}: QueueStatusProps) {
  const totalTasks = status.pending + status.processing + status.completed + status.failed;
  
  if (totalTasks === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Fingerprinting Queue</span>
          <div className="flex items-center space-x-2">
            {status.processing > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={isPaused ? onResume : onPause}
                className="flex items-center space-x-1"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Pause</span>
                  </>
                )}
              </Button>
            )}
            
            {(status.completed > 0 || status.failed > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCompleted}
                className="text-xs"
              >
                Clear Completed
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{status.pending}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500 flex items-center justify-center">
              {status.processing}
              {status.processing > 0 && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
            </div>
            <div className="text-sm text-slate-600">Processing</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{status.completed}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{status.failed}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </div>
        </div>
        
        {status.processing > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(((status.completed + status.failed) / totalTasks) * 100)}%</span>
            </div>
            <Progress 
              value={((status.completed + status.failed) / totalTasks) * 100} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FingerprintProgressPanelProps {
  tasks: Array<{
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: WorkerProgress | null;
  }>;
  queueStatus: QueueStatus;
  onRemoveTask?: (taskId: string) => void;
  onPauseQueue?: () => void;
  onResumeQueue?: () => void;
  onClearCompleted?: () => void;
  isPaused?: boolean;
}

export function FingerprintProgressPanel({
  tasks,
  queueStatus,
  onRemoveTask,
  onPauseQueue,
  onResumeQueue,
  onClearCompleted,
  isPaused = false
}: FingerprintProgressPanelProps) {
  const detectFileType = (file: File): 'video' | 'audio' | 'image' => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  };

  return (
    <div className="space-y-4">
      <QueueStatusDisplay
        status={queueStatus}
        onPause={onPauseQueue}
        onResume={onResumeQueue}
        onClearCompleted={onClearCompleted}
        isPaused={isPaused}
      />
      
      <AnimatePresence>
        {tasks.map((task) => (
          <TaskProgress
            key={task.id}
            taskId={task.id}
            fileName={task.file.name}
            fileType={detectFileType(task.file)}
            fileSize={task.file.size}
            status={task.status}
            progress={task.progress}
            onRemove={onRemoveTask}
          />
        ))}
      </AnimatePresence>
      
      {tasks.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No files in queue</p>
          <p className="text-sm">Upload files to start fingerprinting</p>
        </div>
      )}
    </div>
  );
}
