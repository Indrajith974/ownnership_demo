'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Instagram, 
  Loader2, 
  Hash, 
  ExternalLink,
  Heart,
  MessageCircle,
  Share,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramPostData {
  id: string;
  shortcode: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  username: string;
  likesCount: number;
  commentsCount: number;
  hashtags: string[];
  mentions: string[];
  location?: string;
}

interface InstagramImportProps {
  onDataFetched: (data: InstagramPostData, fingerprint: string) => void;
  onError: (error: string) => void;
}

export function InstagramImport({ onDataFetched, onError }: InstagramImportProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFingerprintLoading, setIsFingerprintLoading] = useState(false);
  const [postData, setPostData] = useState<InstagramPostData | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract Instagram post shortcode from various URL formats
  const extractShortcode = (url: string): string | null => {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Mock Instagram API call (replace with real Instagram Basic Display API)
  const fetchPostData = async (shortcode: string): Promise<InstagramPostData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock data - replace with real Instagram API
    const mockData: InstagramPostData = {
      id: `ig_${shortcode}`,
      shortcode,
      caption: "🎨 Just finished this amazing digital artwork! Spent weeks perfecting every detail. What do you think? #digitalart #creativity #artist #design #illustration #artwork #creative #passion #art #inspiration",
      mediaType: 'IMAGE',
      mediaUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=150&h=150&fit=crop',
      permalink: `https://www.instagram.com/p/${shortcode}/`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      username: 'creative_artist',
      likesCount: Math.floor(Math.random() * 10000) + 100,
      commentsCount: Math.floor(Math.random() * 500) + 10,
      hashtags: ['digitalart', 'creativity', 'artist', 'design', 'illustration', 'artwork', 'creative', 'passion', 'art', 'inspiration'],
      mentions: ['@artgallery', '@designstudio'],
      location: 'San Francisco, CA'
    };

    return mockData;
  };

  // Generate fingerprint from Instagram post metadata
  const generateFingerprint = async (postData: InstagramPostData) => {
    setIsFingerprintLoading(true);
    
    try {
      // Create content string from post metadata
      const contentString = JSON.stringify({
        id: postData.id,
        shortcode: postData.shortcode,
        caption: postData.caption,
        mediaType: postData.mediaType,
        timestamp: postData.timestamp,
        username: postData.username,
        hashtags: postData.hashtags.sort(),
        mentions: postData.mentions.sort(),
        location: postData.location
      });

      // Generate SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(contentString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setFingerprint(hashHex);
      return hashHex;
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      throw new Error('Failed to generate fingerprint');
    } finally {
      setIsFingerprintLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setPostData(null);
    setFingerprint(null);

    const shortcode = extractShortcode(url.trim());
    if (!shortcode) {
      setError('Invalid Instagram URL. Please enter a valid Instagram post, reel, or IGTV URL.');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch post data
      const data = await fetchPostData(shortcode);
      setPostData(data);

      // Generate fingerprint
      const hash = await generateFingerprint(data);
      
      // Notify parent component
      onDataFetched(data, hash);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Instagram post data';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Instagram className="w-5 h-5 mr-2 text-pink-500" />
            Import from Instagram
          </CardTitle>
          <CardDescription>
            Paste an Instagram post, reel, or IGTV URL to claim ownership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://www.instagram.com/p/ABC123..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Supports posts, reels, and IGTV URLs
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={!url.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching Post Data...
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4 mr-2" />
                  Import Instagram Post
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Preview */}
      <AnimatePresence>
        {postData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Post Preview</CardTitle>
                <CardDescription>
                  Verify this is the correct Instagram post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Post Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">@{postData.username}</p>
                    {postData.location && (
                      <p className="text-sm text-muted-foreground">{postData.location}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {postData.mediaType}
                  </Badge>
                </div>

                {/* Media Preview */}
                <div className="relative">
                  <img
                    src={postData.thumbnailUrl || postData.mediaUrl}
                    alt="Instagram post"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {postData.mediaType === 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-4 border-l-white border-y-2 border-y-transparent ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Post Stats */}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>{postData.likesCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{postData.commentsCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(postData.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Caption */}
                <div className="space-y-2">
                  <p className="text-sm">{postData.caption}</p>
                </div>

                {/* Hashtags */}
                {postData.hashtags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Hashtags:</p>
                    <div className="flex flex-wrap gap-2">
                      {postData.hashtags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {postData.hashtags.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{postData.hashtags.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* External Link */}
                <div className="pt-2 border-t">
                  <a
                    href={postData.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View on Instagram
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fingerprint Section */}
      <AnimatePresence>
        {postData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hash className="w-5 h-5 mr-2" />
                  Content Fingerprint
                  {isFingerprintLoading && (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  )}
                </CardTitle>
                <CardDescription>
                  Cryptographic proof of your Instagram content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fingerprint ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-mono break-all">{fingerprint}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Algorithm:</span>
                        <span className="ml-2 text-muted-foreground">SHA-256</span>
                      </div>
                      <div>
                        <span className="font-medium">Content Type:</span>
                        <span className="ml-2 text-muted-foreground">Instagram Post</span>
                      </div>
                    </div>
                    <Alert>
                      <AlertDescription>
                        ✅ Fingerprint generated successfully! Ready to mint ownership certificate.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : isFingerprintLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground">Generating fingerprint...</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
