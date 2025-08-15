'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Trophy, 
  Hash, 
  Calendar,
  User,
  Globe,
  Eye,
  Download,
  Share2,
  FileText,
  Image,
  Music,
  Video,
  Code
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useChainId } from 'wagmi';
import { FingerprintResult } from '@/utils/fingerprint-engine';

interface NFTProofCardProps {
  fingerprintResult: FingerprintResult;
  file: File;
  tokenId?: bigint;
  transactionHash?: string;
  contractAddress?: string;
  authorHandle?: string;
  mintTimestamp?: number;
  className?: string;
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
  text: 'from-blue-500 to-blue-600',
  code: 'from-green-500 to-green-600',
  image: 'from-purple-500 to-purple-600',
  audio: 'from-yellow-500 to-yellow-600',
  video: 'from-red-500 to-red-600',
  unknown: 'from-gray-500 to-gray-600'
};

export function NFTProofCard({
  fingerprintResult,
  file,
  tokenId,
  transactionHash,
  contractAddress,
  authorHandle,
  mintTimestamp,
  className = ''
}: NFTProofCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const chainId = useChainId();

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getExplorerUrl = (hash: string, type: 'tx' | 'address' = 'tx') => {
    const explorers = {
      84532: { // Base Sepolia
        tx: `https://sepolia.basescan.org/tx/${hash}`,
        address: `https://sepolia.basescan.org/address/${hash}`
      },
      8453: { // Base
        tx: `https://basescan.org/tx/${hash}`,
        address: `https://basescan.org/address/${hash}`
      },
      80001: { // Mumbai
        tx: `https://mumbai.polygonscan.com/tx/${hash}`,
        address: `https://mumbai.polygonscan.com/address/${hash}`
      },
      137: { // Polygon
        tx: `https://polygonscan.com/tx/${hash}`,
        address: `https://polygonscan.com/address/${hash}`
      },
      11155111: { // Sepolia
        tx: `https://sepolia.etherscan.io/tx/${hash}`,
        address: `https://sepolia.etherscan.io/address/${hash}`
      }
    };
    
    return explorers[chainId as keyof typeof explorers]?.[type] || `https://etherscan.io/${type}/${hash}`;
  };

  const getNetworkName = (chainId: number) => {
    const networks = {
      84532: 'Base Sepolia',
      8453: 'Base',
      80001: 'Polygon Mumbai',
      137: 'Polygon',
      11155111: 'Sepolia'
    };
    return networks[chainId as keyof typeof networks] || 'Unknown Network';
  };

  const shareProof = async () => {
    const shareData = {
      title: `Ownership Certificate - ${file.name}`,
      text: `I've created a blockchain-verified ownership certificate for "${file.name}" using The Ownership Layer protocol.`,
      url: transactionHash ? getExplorerUrl(transactionHash) : window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(shareData.url || window.location.href, 'share');
      }
    } else {
      copyToClipboard(shareData.url || window.location.href, 'share');
    }
  };

  const IconComponent = CONTENT_TYPE_ICONS[fingerprintResult.contentType as keyof typeof CONTENT_TYPE_ICONS];
  const gradientClass = CONTENT_TYPE_COLORS[fingerprintResult.contentType as keyof typeof CONTENT_TYPE_COLORS];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
        {/* Header with NFT Badge */}
        <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ownership Certificate</h3>
                  <p className="text-white/80 text-sm">Blockchain-Verified Proof</p>
                </div>
              </div>
              <Trophy className="w-8 h-8 text-yellow-300" />
            </div>

            {tokenId && (
              <Badge className="bg-white/20 text-white border-white/30">
                Token #{tokenId.toString()}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* File Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Content Details</h4>
              <Badge variant="outline">
                {fingerprintResult.contentType.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">File Name</span>
                <p className="font-medium truncate">{file.name}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">File Size</span>
                <p className="font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Algorithm</span>
                <p className="font-medium">{fingerprintResult.metadata.algorithm}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <p className="font-medium">{(fingerprintResult.metadata.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          {fingerprintResult.metadata.preview && (
            <div className="space-y-2">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Content Preview</span>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-mono text-muted-foreground">
                  {fingerprintResult.metadata.preview}
                </p>
              </div>
            </div>
          )}

          {/* Cryptographic Hashes */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Cryptographic Proof</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Content Hash</span>
                    <code className="block text-xs text-muted-foreground truncate">
                      {fingerprintResult.hash}
                    </code>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(fingerprintResult.hash, 'hash')}
                >
                  {copied === 'hash' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {fingerprintResult.simHash && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">Similarity Hash</span>
                      <code className="block text-xs text-muted-foreground truncate">
                        {fingerprintResult.simHash}
                      </code>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(fingerprintResult.simHash!, 'simhash')}
                  >
                    {copied === 'simhash' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Information */}
          {(tokenId || transactionHash || contractAddress) && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Blockchain Proof</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authorHandle && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Creator</span>
                      <p className="font-medium">{authorHandle}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Network</span>
                    <p className="font-medium">{getNetworkName(chainId)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p className="font-medium">
                      {new Date(mintTimestamp || fingerprintResult.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {tokenId && (
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Token ID</span>
                      <p className="font-medium">#{tokenId.toString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Key Features */}
          {fingerprintResult.metadata.features && fingerprintResult.metadata.features.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Key Features</span>
              <div className="flex flex-wrap gap-1">
                {fingerprintResult.metadata.features.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {transactionHash && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(getExplorerUrl(transactionHash), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Transaction
              </Button>
            )}
            
            {contractAddress && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(getExplorerUrl(contractAddress, 'address'), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Contract
              </Button>
            )}
            
            <Button
              variant="outline"
              className="flex-1"
              onClick={shareProof}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Proof
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
