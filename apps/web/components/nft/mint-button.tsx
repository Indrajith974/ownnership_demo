'use client';

import React, { useState, useEffect } from 'react';
import { useMintOwnershipNFT } from '@/hooks/use-mint-ownership-nft';
import { useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MintSuccessModal } from './mint-success-modal';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Wallet,
  AlertTriangle,
  Trophy,
  Hash,
  AlertCircle,
  Award,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface MintButtonProps {
  contentHash: string;
  contentType: string;
  contentPreview: string;
  authorHandle?: string;
  tags?: string[];
  metadataURI: string;
  simHash?: string;
  disabled?: boolean;
  className?: string;
  onMintSuccess?: (tokenId?: bigint, txHash?: string) => void;
  onMintError?: (error: Error) => void;
}

const CHAIN_NAMES: { [key: number]: string } = {
  1: 'Ethereum',
  137: 'Polygon',
  80001: 'Polygon Mumbai',
  8453: 'Base',
  84532: 'Base Sepolia',
  11155111: 'Sepolia',
};

const CHAIN_EXPLORERS: { [key: number]: string } = {
  1: 'https://etherscan.io',
  137: 'https://polygonscan.com',
  80001: 'https://mumbai.polygonscan.com',
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  11155111: 'https://sepolia.etherscan.io',
};

export function MintButton({
  contentHash,
  contentType,
  contentPreview,
  authorHandle,
  tags = [],
  metadataURI,
  simHash,
  disabled = false,
  className = '',
  onMintSuccess,
  onMintError
}: MintButtonProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [showConfetti, setShowConfetti] = useState(false);
  
  const {
    mint,
    isMinting,
    txSuccess,
    txError,
    txHash,
    tokenId,
    reset,
    isSupported,
    contractAddress
  } = useMintOwnershipNFT();

  // Handle success effects
  useEffect(() => {
    if (txSuccess && !showConfetti) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']
      });
      setShowConfetti(true);
      
      // Call success callback
      if (onMintSuccess) {
        onMintSuccess(tokenId, txHash);
      }
    }
  }, [txSuccess, showConfetti, tokenId, txHash, onMintSuccess]);

  // Handle error callback
  useEffect(() => {
    if (txError && onMintError) {
      onMintError(txError);
    }
  }, [txError, onMintError]);

  const handleMint = () => {
    if (!isConnected) {
      return;
    }

    mint({
      contentHash,
      simHash,
      contentType,
      contentPreview,
      authorHandle,
      tags,
      metadataURI
    });
  };

  const handleReset = () => {
    reset();
    setShowConfetti(false);
  };

  const getExplorerUrl = (hash: string) => {
    if (!chainId || !CHAIN_EXPLORERS[chainId]) return null;
    return `${CHAIN_EXPLORERS[chainId]}/tx/${hash}`;
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Button disabled className="w-full">
          <AlertCircle className="w-4 h-4 mr-2" />
          Connect Wallet to Mint
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Connect your wallet to mint an ownership certificate
        </p>
      </div>
    );
  }

  // Unsupported network
  if (!isSupported) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Button disabled variant="destructive" className="w-full">
          <AlertCircle className="w-4 h-4 mr-2" />
          Unsupported Network
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Switch to {Object.values(CHAIN_NAMES).join(', ')} to mint
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <AnimatePresence mode="wait">
        {/* Success State */}
        {txSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <Button
              onClick={handleReset}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              ✅ Minted Successfully!
            </Button>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  🎉 Ownership Certificate Created
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Award className="w-3 h-3 mr-1" />
                  NFT
                </Badge>
              </div>
              
              {tokenId && (
                <p className="text-sm text-green-700">
                  Token ID: <span className="font-mono">#{tokenId.toString()}</span>
                </p>
              )}
              
              <p className="text-sm text-green-700">
                Network: {CHAIN_NAMES[chainId] || 'Unknown'}
              </p>
              
              {txHash && (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    Mint Another
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {txError && !txSuccess && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <Button
              onClick={handleReset}
              variant="destructive"
              className="w-full"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              ❌ Mint Failed
            </Button>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-red-800">
                Minting Error
              </p>
              <p className="text-sm text-red-700">
                {txError.message.includes('user rejected') 
                  ? 'Transaction was cancelled by user'
                  : txError.message.slice(0, 100) + (txError.message.length > 100 ? '...' : '')
                }
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        )}

        {/* Minting State */}
        {isMinting && (
          <motion.div
            key="minting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <Button disabled className="w-full bg-blue-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Minting...
            </Button>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </motion.div>
                <span className="text-sm font-medium text-blue-800">
                  Creating your ownership certificate...
                </span>
              </div>
              
              <p className="text-sm text-blue-700">
                Please confirm the transaction in your wallet and wait for blockchain confirmation.
              </p>
              
              {txHash && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Default State */}
        {!isMinting && !txSuccess && !txError && (
          <motion.div
            key="default"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <Button
              onClick={handleMint}
              disabled={disabled}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Mint Ownership Certificate
            </Button>
            
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Content Type</span>
                <Badge variant="outline">{contentType.toUpperCase()}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network</span>
                <Badge variant="outline">{CHAIN_NAMES[chainId] || 'Unknown'}</Badge>
              </div>
              
              {authorHandle && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Author</span>
                  <Badge variant="outline">{authorHandle}.own</Badge>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground pt-2">
                This will create a permanent, blockchain-verified certificate of ownership for your content.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
