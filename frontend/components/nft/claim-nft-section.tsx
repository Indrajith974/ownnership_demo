'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MintButton } from './mint-button';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { useAccount } from 'wagmi';
import { 
  Award, 
  Upload, 
  Hash, 
  User, 
  Tag,
  FileText,
  Image,
  Music,
  Code,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ContentData {
  hash: string;
  type: string;
  preview: string;
  tags: string[];
  metadataURI: string;
  simHash?: string;
}

const CONTENT_TYPES = [
  { value: 'text', label: 'Text', icon: FileText, description: 'Articles, stories, poems' },
  { value: 'image', label: 'Image', icon: Image, description: 'Photos, artwork, graphics' },
  { value: 'audio', label: 'Audio', icon: Music, description: 'Music, podcasts, sounds' },
  { value: 'code', label: 'Code', icon: Code, description: 'Software, scripts, algorithms' },
];

export function ClaimNFTSection() {
  const { address, isConnected } = useAccount();
  const { profile, isAuthenticated } = useSiweAuth();
  const [contentData, setContentData] = useState<ContentData>({
    hash: '',
    type: 'text',
    preview: '',
    tags: [],
    metadataURI: '',
    simHash: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isGeneratingHash, setIsGeneratingHash] = useState(false);

  // Generate content hash from preview
  const generateContentHash = async (content: string) => {
    if (!content.trim()) return '';
    
    setIsGeneratingHash(true);
    try {
      // Simple hash generation for demo - in production, use proper fingerprinting
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('Hash generation failed:', error);
      return '';
    } finally {
      setIsGeneratingHash(false);
    }
  };

  // Auto-generate hash when preview changes
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (contentData.preview.trim()) {
        const hash = await generateContentHash(contentData.preview);
        setContentData(prev => ({ ...prev, hash }));
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [contentData.preview]);

  // Generate mock metadata URI
  useEffect(() => {
    if (contentData.hash && contentData.type && contentData.preview) {
      const mockMetadataURI = `ipfs://Qm${contentData.hash.slice(0, 44)}`;
      setContentData(prev => ({ ...prev, metadataURI: mockMetadataURI }));
    }
  }, [contentData.hash, contentData.type, contentData.preview]);

  const addTag = () => {
    if (tagInput.trim() && !contentData.tags.includes(tagInput.trim())) {
      setContentData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setContentData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFormValid = contentData.hash && contentData.preview.trim() && contentData.metadataURI;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Award className="w-12 h-12 text-purple-600" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Claim Your Ownership NFT
            </h1>
            <p className="text-lg text-muted-foreground">
              Transform your content into a blockchain-verified certificate of creation
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Sparkles className="w-4 h-4" />
            <span>Permanent Proof</span>
          </div>
          <div className="flex items-center space-x-1">
            <Hash className="w-4 h-4" />
            <span>Cryptographic Security</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4" />
            <span>Creator Royalties</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Input Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Content Details
              </CardTitle>
              <CardDescription>
                Provide your original content to generate a unique ownership certificate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Content Type Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Content Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Button
                        key={type.value}
                        variant={contentData.type === type.value ? 'default' : 'outline'}
                        onClick={() => setContentData(prev => ({ ...prev, type: type.value }))}
                        className="h-auto p-3 flex flex-col items-center space-y-1"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Content Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Preview</label>
                <Textarea
                  placeholder="Enter your original content here (first 500 characters will be used for the preview)..."
                  value={contentData.preview}
                  onChange={(e) => setContentData(prev => ({ ...prev, preview: e.target.value }))}
                  rows={6}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {contentData.preview.length}/500 characters
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (Optional)</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={addTag} variant="outline" size="sm">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                
                {contentData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contentData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Hash */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Hash</label>
                <div className="relative">
                  <Input
                    value={contentData.hash}
                    readOnly
                    placeholder={isGeneratingHash ? "Generating hash..." : "Hash will be generated automatically"}
                    className="font-mono text-xs"
                  />
                  {isGeneratingHash && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  SHA-256 hash automatically generated from your content
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Minting Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Mint Certificate
              </CardTitle>
              <CardDescription>
                Create your blockchain-verified ownership certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFormValid ? (
                <MintButton
                  contentHash={contentData.hash}
                  contentType={contentData.type}
                  contentPreview={contentData.preview}
                  authorHandle={profile?.handle}
                  tags={contentData.tags}
                  metadataURI={contentData.metadataURI}
                  simHash={contentData.simHash}
                  onMintSuccess={(tokenId, txHash) => {
                    console.log('Mint successful:', { tokenId, txHash });
                    // Could redirect to certificates page or show success modal
                  }}
                  onMintError={(error) => {
                    console.error('Mint failed:', error);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <Award className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Complete the content details to enable minting
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Required:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className={contentData.preview.trim() ? "text-green-600" : ""}>
                        ✓ Content preview
                      </li>
                      <li className={contentData.hash ? "text-green-600" : ""}>
                        ✓ Content hash (auto-generated)
                      </li>
                      <li className={isConnected ? "text-green-600" : ""}>
                        ✓ Wallet connection
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2">What you'll get:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Permanent blockchain record of creation</li>
                <li>• NFT certificate with metadata on IPFS</li>
                <li>• Public proof page for verification</li>
                <li>• Creator royalties on future transfers</li>
                <li>• Integration with OpenSea and other marketplaces</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
