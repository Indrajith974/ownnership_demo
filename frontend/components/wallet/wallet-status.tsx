'use client';

import { useAccount, useBalance } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';

export function WalletStatus() {
  const { address, isConnected, connector, chain } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });

  if (!isConnected) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-sm font-medium">Wallet Not Connected</p>
            <p className="text-xs text-muted-foreground">
              Connect your wallet to access all features
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            Disconnected
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Wallet Connected</span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </Badge>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Wallet:</span>
            <span className="font-mono">{connector?.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Address:</span>
            <span className="font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Network:</span>
            <span>{chain?.name || 'Unknown'}</span>
          </div>

          {balance && (
            <div className="flex justify-between">
              <span>Balance:</span>
              <span className="font-mono">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
