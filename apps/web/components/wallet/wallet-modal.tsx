'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Wallet, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };

  const handleConnect = (connectorToConnect: any) => {
    connect({ connector: connectorToConnect });
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
    toast.success('Wallet disconnected');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isConnected ? (
            // Connected State
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Connected to {connector?.name}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {formatAddress(address!)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Connected
                </Badge>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={handleCopyAddress}
                >
                  <span className="flex items-center gap-2">
                    {copiedAddress ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedAddress ? 'Copied!' : 'Copy Address'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatAddress(address!)}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(`https://etherscan.io/address/${address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Etherscan
                </Button>
              </div>

              <Separator />

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisconnect}
              >
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            // Disconnected State
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Connect your wallet to access The Ownership Layer
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error.message}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {connectors.map((connectorItem) => (
                  <Button
                    key={connectorItem.uid}
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={() => handleConnect(connectorItem)}
                    disabled={isPending}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Wallet className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{connectorItem.name}</span>
                    </div>
                    {isPending && (
                      <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    )}
                  </Button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>By connecting, you agree to our Terms of Service</p>
                <p>We do not store any personal information</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
