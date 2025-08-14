'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFingerprintQueue } from '@/hooks/use-fingerprint-queue';
import { FingerprintProgressPanel } from './fingerprint-progress';
import { getServerFingerprintService, shouldUseServerProcessing } from '@/services/server-fingerprint';
import { useCrossMatching } from '@/hooks/use-cross-matching';
import { MatchResults } from '@/components/cross-matching/match-results';
import { VerificationBadge, VerificationProcess } from '@/components/cross-matching/verification-badge';
import type { WorkerResult, WorkerProgress } from '@/types/worker';
import type { FingerprintMatchRequest, CrossMatchResponse } from '@/types/cross-matching';
import { 
  Upload, 
  FileText, 
  Image, 
  Music, 
  Video, 
  Code, 
  Hash, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  X,
  Eye
} from 'lucide-react';
import { 
  fingerprintMedia, 
  detectContentType, 
  readFileAsText, 
  readFileAsArrayBuffer, 
  readFileAsDataURL,
  SUPPORTED_TYPES,
  FingerprintResult,
  MediaFile
} from '@/utils/fingerprint-engine';

interface UploadAndFingerprintProps {
  onFingerprintComplete?: (result: FingerprintResult, file: File, matchResult?: CrossMatchResponse) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // in MB
  className?: string;
  userIdentifier?: string; // wallet address or email
  enableCrossMatching?: boolean;
}

const CONTENT_TYPE_ICONS = {
  text: FileText,
  code: Code,
  image: Image,
  audio: Music,
  video: Video,
  unknown: FileText
};

const CONTENT_TYPE_COLORS = {
  text: 'bg-blue-500',
  code: 'bg-green-500',
  image: 'bg-purple-500',
  audio: 'bg-yellow-500',
  video: 'bg-red-500',
  unknown: 'bg-gray-500'
};

export function UploadAndFingerprint({ 
  onFingerprintComplete, 
  onError, 
  maxFileSize = 50,
  className = '',
  userIdentifier,
  enableCrossMatching = true
}: UploadAndFingerprintProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fingerprintResult, setFingerprintResult] = useState<FingerprintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crossMatchResult, setCrossMatchResult] = useState<CrossMatchResponse | null>(null);
  const [showMatchResults, setShowMatchResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cross-matching hook
  const { 
    isChecking: isCheckingMatches, 
    checkFingerprint, 
    clearResults: clearMatchResults,
    shouldProceed,
    warningMessage
  } = useCrossMatching();

  // Queue management
  const {
    addTask,
    removeTask,
    tasks,
    queueStatus
  } = useFingerprintQueue();

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setProgress(0);
    
    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      const errorMsg = `File size exceeds ${maxFileSize}MB limit`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate file type
    const contentType = detectContentType(file);
    if (contentType === 'unknown') {
      const errorMsg = 'Unsupported file type';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      // Read file content based on type
      setProgress(20);
      let content: string | ArrayBuffer;
      let previewUrl: string | null = null;

      if (contentType === 'text' || contentType === 'code') {
        content = await readFileAsText(file);
        previewUrl = null;
      } else if (contentType === 'image') {
        content = await readFileAsArrayBuffer(file);
        previewUrl = await readFileAsDataURL(file);
      } else {
        content = await readFileAsArrayBuffer(file);
        previewUrl = null;
      }

      setProgress(50);
      setPreview(previewUrl);

      // Create media file object
      const mediaFile: MediaFile = {
        file,
        content,
        preview: previewUrl || undefined
      };

      setProgress(75);

      // Generate fingerprint
      const result = await fingerprintMedia(mediaFile);
      
      setProgress(100);
      setFingerprintResult(result);
      setIsProcessing(false);
      
      onFingerprintComplete?.(result, file);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process file';
      setError(errorMsg);
      setIsProcessing(false);
      onError?.(errorMsg);
    }
  }, [maxFileSize, onFingerprintComplete, onError]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // File input handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Reset upload
  const resetUpload = useCallback(() => {
    setUploadedFile(null);
    setFingerprintResult(null);
    setError(null);
    setPreview(null);
    setProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const contentType = uploadedFile ? detectContentType(uploadedFile) : 'unknown';
  const IconComponent = CONTENT_TYPE_ICONS[contentType as keyof typeof CONTENT_TYPE_ICONS];
  const colorClass = CONTENT_TYPE_COLORS[contentType as keyof typeof CONTENT_TYPE_COLORS];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload & Fingerprint Media
          </CardTitle>
          <CardDescription>
            Drag and drop any file or click to browse. Supports text, code, images, audio, and video.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${!uploadedFile && !isProcessing ? 'hover:border-primary hover:bg-primary/5 cursor-pointer' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploadedFile && !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept={Object.values(SUPPORTED_TYPES).flat().map(ext => `.${ext}`).join(',')}
            />

            <AnimatePresence mode="wait">
              {!uploadedFile && !isProcessing ? (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drop your file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (max {maxFileSize}MB)
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {Object.entries(SUPPORTED_TYPES).map(([type, extensions]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4"
                >
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <div>
                    <p className="text-lg font-medium">Processing file...</p>
                    <p className="text-sm text-muted-foreground">
                      Generating cryptographic fingerprint
                    </p>
                  </div>
                  <div className="w-full max-w-xs mx-auto">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                  </div>
                </motion.div>
              ) : uploadedFile && (
                <motion.div
                  key="file-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`w-16 h-16 mx-auto rounded-full ${colorClass} flex items-center justify-center`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {contentType.toUpperCase()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                    className="mx-auto"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fingerprint Result */}
      <AnimatePresence>
        {fingerprintResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Fingerprint Generated
                </CardTitle>
                <CardDescription>
                  Cryptographic proof of your content's uniqueness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                {preview && contentType === 'image' && (
                  <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-h-32 max-w-full object-contain rounded"
                    />
                  </div>
                )}

                {fingerprintResult.metadata.preview && contentType !== 'image' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center mb-2">
                      <Eye className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Preview</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {fingerprintResult.metadata.preview}
                    </p>
                  </div>
                )}

                {/* Hash Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Content Hash</span>
                    </div>
                    <code className="block text-xs bg-muted p-2 rounded break-all">
                      {fingerprintResult.hash}
                    </code>
                  </div>

                  {fingerprintResult.simHash && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Similarity Hash</span>
                      </div>
                      <code className="block text-xs bg-muted p-2 rounded break-all">
                        {fingerprintResult.simHash}
                      </code>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Algorithm</span>
                    <p className="font-medium">{fingerprintResult.metadata.algorithm}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence</span>
                    <p className="font-medium">{(fingerprintResult.metadata.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">File Size</span>
                    <p className="font-medium">{(fingerprintResult.fileSize / 1024).toFixed(1)} KB</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium">{fingerprintResult.contentType.toUpperCase()}</p>
                  </div>
                </div>

                {/* Features */}
                {fingerprintResult.metadata.features && fingerprintResult.metadata.features.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Key Features</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fingerprintResult.metadata.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
