// Cross-matching engine demonstration component
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCrossMatching } from '@/hooks/use-cross-matching';
import { MatchResults } from './match-results';
import { VerificationBadge, VerificationProcess } from './verification-badge';
import { 
  Search, 
  Hash, 
  FileText, 
  Image, 
  Music, 
  Video,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import type { FingerprintMatchRequest } from '@/types/cross-matching';

interface TestFingerprint {
  id: string;
  hash: string;
  contentType: 'text' | 'image' | 'video' | 'audio';
  title: string;
  description?: string;
  owner: string;
  createdAt: number;
}

// Sample test data for demonstration
const SAMPLE_FINGERPRINTS: TestFingerprint[] = [
  {
    id: '1',
    hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    contentType: 'text',
    title: 'Original Article: The Future of AI',
    description: 'A comprehensive analysis of artificial intelligence trends and implications for society.',
    owner: '0x1234...5678',
    createdAt: Date.now() - 86400000 // 1 day ago
  },
  {
    id: '2',
    hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
    contentType: 'image',
    title: 'Sunset Photography',
    description: 'Beautiful sunset captured at Golden Gate Bridge',
    owner: '0xabcd...efgh',
    createdAt: Date.now() - 172800000 // 2 days ago
  },
  {
    id: '3',
    hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123457', // Similar to #1
    contentType: 'text',
    title: 'AI Future Analysis (Modified)',
    description: 'A slightly modified version of the AI trends article.',
    owner: '0x9999...1111',
    createdAt: Date.now() - 43200000 // 12 hours ago
  }
];

export function CrossMatchingDemo() {
  const [testHash, setTestHash] = useState('');
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userIdentifier, setUserIdentifier] = useState('0xtest...user');
  const [testFingerprints, setTestFingerprints] = useState<TestFingerprint[]>(SAMPLE_FINGERPRINTS);

  const {
    isChecking,
    lastResult,
    error,
    checkFingerprint,
    clearResults,
    isOriginal,
    isDuplicate,
    isSimilar,
    shouldProceed,
    warningMessage
  } = useCrossMatching();

  const handleCheckFingerprint = async () => {
    if (!testHash.trim()) return;

    const request: FingerprintMatchRequest = {
      hash: testHash,
      contentType,
      metadata: {
        title: title || undefined,
        description: description || undefined,
        fileSize: Math.floor(Math.random() * 1000000) // Random file size for demo
      },
      userIdentifier
    };

    await checkFingerprint(request);
  };

  const generateRandomHash = () => {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    setTestHash(hash);
  };

  const useSampleHash = (sampleHash: string, sampleTitle: string, sampleType: 'text' | 'image' | 'video' | 'audio') => {
    setTestHash(sampleHash);
    setTitle(sampleTitle);
    setContentType(sampleType);
  };

  const addTestFingerprint = () => {
    if (!testHash.trim() || !title.trim()) return;

    const newFingerprint: TestFingerprint = {
      id: Date.now().toString(),
      hash: testHash,
      contentType,
      title,
      description,
      owner: userIdentifier,
      createdAt: Date.now()
    };

    setTestFingerprints(prev => [newFingerprint, ...prev]);
    
    // Clear form
    setTestHash('');
    setTitle('');
    setDescription('');
  };

  const removeTestFingerprint = (id: string) => {
    setTestFingerprints(prev => prev.filter(fp => fp.id !== id));
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Cross-Matching Engine Demo</h1>
        <p className="text-gray-600">
          Test duplicate and similarity detection for fingerprinted content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Test Fingerprint Matching
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hash">Fingerprint Hash</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="hash"
                  value={testHash}
                  onChange={(e) => setTestHash(e.target.value)}
                  placeholder="Enter 64-character hex hash..."
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateRandomHash}
                  className="shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contentType">Content Type</Label>
                <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="user">User Identifier</Label>
                <Input
                  id="user"
                  value={userIdentifier}
                  onChange={(e) => setUserIdentifier(e.target.value)}
                  placeholder="Wallet address or email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title for metadata matching"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Content description for enhanced matching"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCheckFingerprint}
                disabled={!testHash.trim() || isChecking}
                className="flex-1"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Check for Matches
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={addTestFingerprint}
                disabled={!testHash.trim() || !title.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Database
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationProcess isChecking={isChecking} result={lastResult} />
            
            <AnimatePresence>
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4"
                >
                  <MatchResults 
                    result={lastResult}
                    showActions={false}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {!lastResult && !isChecking && (
              <div className="text-center py-8 text-gray-500">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter a fingerprint hash and click "Check for Matches" to test the cross-matching engine.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sample Data Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Test Database ({testFingerprints.length} fingerprints)</span>
            <Badge variant="secondary">Demo Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {testFingerprints.map((fp) => (
              <motion.div
                key={fp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getContentTypeIcon(fp.contentType)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{fp.title}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                      {fp.hash.slice(0, 16)}...{fp.hash.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {fp.owner} • {new Date(fp.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => useSampleHash(fp.hash, fp.title, fp.contentType)}
                  >
                    Use Hash
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTestFingerprint(fp.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">Quick Tests:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useSampleHash(SAMPLE_FINGERPRINTS[0].hash, 'Exact Duplicate Test', 'text')}
                className="justify-start"
              >
                • Test exact match (100% duplicate)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useSampleHash(SAMPLE_FINGERPRINTS[2].hash, 'Similar Content Test', 'text')}
                className="justify-start"
              >
                • Test similar content (~95% match)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
