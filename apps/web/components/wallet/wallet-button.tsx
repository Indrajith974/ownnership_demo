'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronDown } from 'lucide-react';
import { WalletModal } from './wallet-modal';

interface WalletButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function WalletButton({ 
  variant = 'default', 
  size = 'default',
  className = '' 
}: WalletButtonProps) {
  const { address, isConnected, connector } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClick = () => {
    setIsModalOpen(true);
  };

  if (isConnected && address) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          className={`flex items-center gap-2 ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{formatAddress(address)}</span>
            <span className="sm:hidden">Connected</span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>

        <WalletModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`flex items-center gap-2 ${className}`}
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
