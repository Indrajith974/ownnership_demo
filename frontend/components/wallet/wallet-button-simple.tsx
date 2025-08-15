'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context-optimized';
import { toast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function WalletButton() {
  const { isAuthenticated, walletAddress, isWalletConnected, connectWallet, disconnectWallet } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    // Check if MetaMask or other wallet is installed
    setWalletInstalled(typeof window !== 'undefined' && !!window.ethereum);
    
    // Check if already connected and sync with auth context
    if (window.ethereum && isAuthenticated && !isWalletConnected) {
      checkConnection();
    }
  }, [isAuthenticated, isWalletConnected]);

  const checkConnection = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0 && !isWalletConnected) {
        await connectWallet(accounts[0]);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const handleConnectWallet = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please log in first before connecting your wallet.',
        variant: 'destructive',
      });
      return;
    }

    if (!walletInstalled) {
      toast({
        title: 'Wallet Not Found',
        description: 'Please install MetaMask or another Web3 wallet to continue.',
        variant: 'destructive',
      });
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        await connectWallet(accounts[0]);
        toast({
          title: 'Wallet Connected',
          description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });

        // Optional: Switch to a preferred network (e.g., Polygon)
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // Polygon mainnet
          });
        } catch (switchError: any) {
          // If the chain hasn't been added to MetaMask, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x89',
                    chainName: 'Polygon Mainnet',
                    nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18,
                    },
                    rpcUrls: ['https://polygon-rpc.com/'],
                    blockExplorerUrls: ['https://polygonscan.com/'],
                  },
                ],
              });
            } catch (addError) {
              console.error('Error adding network:', addError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected.',
    });
  };

  if (!isAuthenticated) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled
        className="flex items-center gap-2 opacity-50"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Login First</span>
      </Button>
    );
  }

  if (walletAddress) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDisconnectWallet}
        className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
      >
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleConnectWallet}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      {!walletInstalled ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isConnecting ? 'Connecting...' : !walletInstalled ? 'Install Wallet' : 'Connect Wallet'}
      </span>
    </Button>
  );
}
