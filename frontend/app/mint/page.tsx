'use client';

import { ClaimNFTSection } from '@/components/nft/claim-nft-section';
import { useAuth } from '@/contexts/auth-context-optimized';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, User, Award } from 'lucide-react';

export default function MintPage() {
  const { user, isAuthenticated } = useAuth();

  // Show authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center">
              Please connect your wallet to mint ownership certificates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground text-center">
              Please sign in with your wallet to access the minting interface.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ClaimNFTSection />
    </div>
  );
}
