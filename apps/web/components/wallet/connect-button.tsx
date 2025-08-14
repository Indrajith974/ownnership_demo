'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Wallet, User, LogOut } from 'lucide-react';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { useAccount } from 'wagmi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function WalletConnectButton() {
  const { isConnected } = useAccount();
  const { isAuthenticated, profile, signIn, signOut, isLoading } = useSiweAuth();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Loading state
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        if (!ready) {
          return (
            <Button disabled variant="outline">
              <Wallet className="w-4 h-4 mr-2" />
              Loading...
            </Button>
          );
        }

        if (!connected) {
          return (
            <Button onClick={openConnectModal} variant="outline">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button onClick={openChainModal} variant="destructive">
              Wrong network
            </Button>
          );
        }

        // Connected but not authenticated with SIWE
        if (connected && !isAuthenticated) {
          return (
            <Button
              onClick={signIn}
              disabled={isLoading}
              variant="default"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <User className="w-4 h-4 mr-2" />
              {isLoading ? 'Signing...' : 'Sign In'}
            </Button>
          );
        }

        // Fully authenticated
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback>
                    {account.displayName?.[0] || account.address.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">
                      {profile?.handle ? `${profile.handle}.own` : account.displayName}
                    </span>
                    {profile?.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {profile?.credits || 0} credits
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {profile?.handle ? `${profile.handle}.own` : 'Anonymous'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-xs">
                    Rep: {profile?.reputation || 0}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {profile?.credits || 0} credits
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                <User className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openAccountModal}>
                <Wallet className="w-4 h-4 mr-2" />
                Wallet Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }}
    </ConnectButton.Custom>
  );
}
