'use client';

import React from 'react';

// Simple wallet provider that doesn't require external configuration
// This prevents the Reown/WalletConnect configuration errors
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <div data-wallet-provider="simple">
      {children}
    </div>
  );
}
