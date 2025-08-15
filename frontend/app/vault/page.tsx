'use client';

import { MyVaultDashboard } from '@/components/vault/my-vault-dashboard';

export default function VaultPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Ownership Vault
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your fingerprinted content and minted NFT certificates
          </p>
        </div>
        
        <MyVaultDashboard />
      </div>
    </div>
  );
}
