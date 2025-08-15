'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Trophy, 
  Hash, 
  Calendar,
  User,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useChainId } from 'wagmi';

interface MintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId?: bigint;
  transactionHash?: string;
  contractAddress?: string;
  contentHash?: string;
  contentType?: string;
  authorHandle?: string;
}

export function MintSuccessModal({
  isOpen,
  onClose,
  tokenId,
  transactionHash,
  contractAddress,
  contentHash,
  contentType,
  authorHandle
}: MintSuccessModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const chainId = useChainId();

  // Trigger confetti when modal opens
  useEffect(() => {
    if (isOpen && tokenId) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen, tokenId]);

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

  const nftImageUrl = process.env.NEXT_PUBLIC_NFT_IMAGE_URL || '/api/placeholder/400/400';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              NFT Minted Successfully! 🎉
            </DialogTitle>
            <DialogDescription className="text-lg mt-2">
              Your Ownership Certificate has been created on the blockchain
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <div className="space-y-6">
          {/* NFT Preview Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* NFT Image */}
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-xl font-bold mb-2">Ownership Layer</h3>
                      <p className="text-sm opacity-90">Certificate of Creation</p>
                      {tokenId && (
                        <Badge variant="secondary" className="mt-4">
                          Token #{tokenId.toString()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* NFT Details */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      {authorHandle && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{authorHandle}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{getNetworkName(chainId)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{new Date().toLocaleDateString()}</span>
                      </div>

                      {contentType && (
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">
                            {contentType.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction Details */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h4 className="font-semibold">Transaction Details</h4>
            
            {transactionHash && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm font-medium">Transaction Hash</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transactionHash, 'tx')}
                  >
                    {copied === 'tx' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {contractAddress && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm font-medium">Contract Address</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(contractAddress, 'contract')}
                  >
                    {copied === 'contract' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {tokenId && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">Token ID</span>
                </div>
                <Badge variant="secondary">
                  #{tokenId.toString()}
                </Badge>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {transactionHash && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(getExplorerUrl(transactionHash), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
            )}
            
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open('/certificates', '_self')}
            >
              View My Certificates
            </Button>
            
            <Button
              className="flex-1"
              onClick={onClose}
            >
              Close
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
