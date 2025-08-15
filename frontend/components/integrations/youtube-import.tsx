'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Youtube, 
  Link, 
  Download, 
  Calendar,
  User,
  Eye,
  Hash,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount?: string;
  tags?: string[];
  categoryId: string;
}

interface YouTubeImportProps {
  onVideoImported: (videoData: YouTubeVideoData, fingerprint: any) => void;
  onError: (error: string) => void;
}

export function YouTubeImport({ onVideoImported, onError }: YouTubeImportProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'fetching' | 'fingerprinting' | 'ready'>('input');

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Fetch video data from YouTube API
  const fetchVideoData = async (videoId: string): Promise<YouTubeVideoData> => {
    // In production, this would call your backend API which calls YouTube Data API
    // For now, we'll simulate the response
    const mockData: YouTubeVideoData = {
      id: videoId,
      title: "How to Build Web3 Apps with Next.js",
      description: "In this comprehensive tutorial, we'll walk through building a complete Web3 application using Next.js, Wagmi, and RainbowKit. Perfect for developers looking to enter the blockchain space!",
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelId: "UC123456789",
      channelTitle: "Web3 Developer",
      publishedAt: "2024-01-15T10:30:00Z",
      duration: "PT15M30S",
      viewCount: "12547",
      likeCount: "892",
      tags: ["web3", "nextjs", "blockchain", "tutorial", "wagmi", "rainbowkit"],
      categoryId: "28"
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return mockData;
  };

  // Generate fingerprint for YouTube content
  const generateFingerprint = async (videoData: YouTubeVideoData) => {
    const content = `${videoData.title}\n${videoData.description}\n${videoData.channelTitle}\n${videoData.publishedAt}`;
    
    // Create a simple hash of the content
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      hash,
      contentType: 'youtube-video',
      algorithm: 'SHA-256',
      confidence: 0.95,
      metadata: {
        source: 'youtube',
        videoId: videoData.id,
        title: videoData.title,
        channel: videoData.channelTitle,
        publishedAt: videoData.publishedAt,
        duration: videoData.duration,
        viewCount: videoData.viewCount,
        tags: videoData.tags || [],
        preview: videoData.thumbnail
      },
      simHash: hash.slice(0, 16) // Simplified similarity hash
    };
  };

  const handleImport = async () => {
    if (!url.trim()) {
      onError('Please enter a YouTube URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      onError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }

    setIsLoading(true);
    setStep('fetching');

    try {
      // Fetch video data
      const data = await fetchVideoData(videoId);
      setVideoData(data);
      
      setStep('fingerprinting');
      
      // Generate fingerprint
      const fp = await generateFingerprint(data);
      setFingerprint(fp);
      
      setStep('ready');
      
      // Call parent callback
      onVideoImported(data, fp);
    } catch (error) {
      console.error('Error importing YouTube video:', error);
      onError('Failed to import YouTube video. Please try again.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatViews = (viewCount: string) => {
    const views = parseInt(viewCount);
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Youtube className="w-5 h-5 mr-2 text-red-600" />
          Import from YouTube
        </CardTitle>
        <CardDescription>
          Paste a YouTube video link to claim ownership and mint it to your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !url.trim()}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </div>

          {/* Progress Steps */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center space-x-4 text-sm text-muted-foreground"
              >
                <div className="flex items-center space-x-2">
                  {step === 'fetching' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : step !== 'input' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted" />
                  )}
                  <span>Fetching video data</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {step === 'fingerprinting' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  ) : step === 'ready' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted" />
                  )}
                  <span>Generating fingerprint</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Preview */}
        <AnimatePresence>
          {videoData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border rounded-lg p-4 space-y-4"
            >
              <div className="flex space-x-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={videoData.thumbnail}
                    alt={videoData.title}
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                </div>
                
                {/* Video Info */}
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">
                    {videoData.title}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{videoData.channelTitle}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(videoData.publishedAt)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatViews(videoData.viewCount)} views</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {videoData.tags && videoData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {videoData.tags.slice(0, 5).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {videoData.tags.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{videoData.tags.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* External Link */}
                <div className="flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://youtube.com/watch?v=${videoData.id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Description Preview */}
              {videoData.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {videoData.description}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fingerprint Results */}
        <AnimatePresence>
          {fingerprint && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert>
                <Sparkles className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Fingerprint Generated Successfully!</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Content Hash:</span>
                        <code className="block text-xs text-muted-foreground mt-1">
                          {fingerprint.hash.slice(0, 32)}...
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Algorithm:</span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {fingerprint.algorithm}
                        </span>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!videoData && (
          <div className="text-center py-8 text-muted-foreground">
            <Youtube className="w-12 h-12 mx-auto mb-4 text-red-600/50" />
            <p className="text-sm">
              Paste any YouTube video URL to get started
            </p>
            <p className="text-xs mt-2">
              We'll fetch the metadata and generate a cryptographic fingerprint
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
