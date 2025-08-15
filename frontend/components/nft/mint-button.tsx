'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Wallet, AlertTriangle } from 'lucide-react';

interface MintButtonProps {
  contentHash: string;
  contentType: string;
  contentPreview: string;
  authorHandle?: string;
  tags?: string[];
  disabled?: boolean;
  className?: string;
  onMintSuccess?: (tokenId: number, transactionHash: string) => void;
  onMintError?: (error: string) => void;
}

export function MintButton({
  contentHash,
  contentType,
  contentPreview,
  authorHandle,
  tags = [],
  disabled = false,
  className = '',
  onMintSuccess,
  onMintError
}: MintButtonProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [mintStatus, setMintStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleMint = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      setMintStatus('error');
      return;
    }

    setIsLoading(true);
    setMintStatus('idle');
    setErrorMessage('');

    try {
      // Simulate minting process (replace with actual minting logic)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful mint
      const mockTokenId = Math.floor(Math.random() * 10000);
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      setMintStatus('success');
      onMintSuccess?.(mockTokenId, mockTxHash);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mint NFT';
      setErrorMessage(errorMsg);
      setMintStatus('error');
      onMintError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet to Mint
          </CardTitle>
          <CardDescription>
            Connect your wallet to mint an ownership certificate for this content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to continue with minting
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mintStatus === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Wallet className="h-5 w-5" />
          )}
          {mintStatus === 'success' ? 'NFT Minted Successfully!' : 'Mint Ownership Certificate'}
        </CardTitle>
        <CardDescription>
          Create an NFT certificate proving ownership of this content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Content:</strong> {contentPreview}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Type:</strong> {contentType}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Hash:</strong> {contentHash.slice(0, 16)}...
          </p>
          {authorHandle && (
            <p className="text-sm text-muted-foreground">
              <strong>Author:</strong> {authorHandle}
            </p>
          )}
        </div>

        {mintStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {mintStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your ownership certificate has been minted successfully!
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleMint}
          disabled={disabled || isLoading || mintStatus === 'success'}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Minting Certificate...
            </>
          ) : mintStatus === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Minted Successfully
            </>
          ) : (
            'Mint Ownership Certificate'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
