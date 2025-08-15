'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  FingerprintMetadata, 
  UserVault, 
  VaultStats, 
  StoreFingerprintRequest, 
  VaultResult 
} from '@/types/ownership';
import { vaultService } from '@/services/vault-service';
import { useSiweAuth } from './use-siwe-auth';

export function useVault() {
  const { address } = useAccount();
  const { profile } = useSiweAuth();
  
  const [vault, setVault] = useState<UserVault | null>(null);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user identifier
  const getCurrentUser = useCallback(() => {
    if (address) {
      return { type: 'wallet' as const, identifier: address };
    }
    if (profile?.email) {
      return { type: 'email' as const, identifier: profile.email };
    }
    return null;
  }, [address, profile]);

  // Load user vault
  const loadVault = useCallback(async (userIdentifier?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await vaultService.getUserVault(userIdentifier);
      
      if (result.success) {
        setVault(result.data);
      } else {
        setError(result.error.message);
        setVault(null);
      }
    } catch (err) {
      setError('Failed to load vault');
      setVault(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load vault statistics
  const loadStats = useCallback(async () => {
    try {
      const result = await vaultService.getVaultStats();
      
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('Failed to load stats:', result.error.message);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Store new fingerprint
  const storeFingerprint = useCallback(async (request: StoreFingerprintRequest): Promise<VaultResult<FingerprintMetadata>> => {
    const result = await vaultService.storeFingerprint(request);
    
    if (result.success) {
      // Refresh vault after successful storage
      await loadVault();
      await loadStats();
    }
    
    return result;
  }, [loadVault, loadStats]);

  // Update fingerprint with minting data
  const updateFingerprintMinting = useCallback(async (
    fingerprintHash: string,
    mintData: {
      smartContractMintId: string;
      contractAddress: string;
      transactionHash: string;
      blockNumber?: number;
      nftTokenId?: string;
      nftMetadataUri?: string;
    }
  ): Promise<VaultResult<FingerprintMetadata>> => {
    const result = await vaultService.updateFingerprintMinting(fingerprintHash, mintData);
    
    if (result.success) {
      // Refresh vault after successful update
      await loadVault();
      await loadStats();
    }
    
    return result;
  }, [loadVault, loadStats]);

  // Delete fingerprint
  const deleteFingerprint = useCallback(async (fingerprintHash: string): Promise<VaultResult<boolean>> => {
    const result = await vaultService.deleteFingerprint(fingerprintHash);
    
    if (result.success) {
      // Refresh vault after successful deletion
      await loadVault();
      await loadStats();
    }
    
    return result;
  }, [loadVault, loadStats]);

  // Get fingerprints by type
  const getFingerprintsByType = useCallback((type: string) => {
    return vault?.fingerprints.filter(fp => fp.type === type) || [];
  }, [vault]);

  // Get minted NFTs
  const getMintedNFTs = useCallback(() => {
    return vault?.fingerprints.filter(fp => fp.isMinted) || [];
  }, [vault]);

  // Get unminted assets
  const getUnmintedAssets = useCallback(() => {
    return vault?.fingerprints.filter(fp => !fp.isMinted) || [];
  }, [vault]);

  // Search fingerprints
  const searchFingerprints = useCallback((query: string) => {
    if (!vault || !query.trim()) return vault?.fingerprints || [];
    
    const searchTerm = query.toLowerCase();
    return vault.fingerprints.filter(fp => 
      fp.title?.toLowerCase().includes(searchTerm) ||
      fp.description?.toLowerCase().includes(searchTerm) ||
      fp.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      fp.fingerprintHash.toLowerCase().includes(searchTerm) ||
      fp.originalFilename?.toLowerCase().includes(searchTerm)
    );
  }, [vault]);

  // Auto-load vault when user changes
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadVault();
      loadStats();
    } else {
      setVault(null);
      setStats(null);
    }
  }, [getCurrentUser, loadVault, loadStats]);

  // Check if user is authenticated
  const isAuthenticated = getCurrentUser() !== null;

  return {
    // Data
    vault,
    stats,
    isLoading,
    error,
    isAuthenticated,
    
    // User info
    currentUser: getCurrentUser(),
    
    // Actions
    loadVault,
    loadStats,
    storeFingerprint,
    updateFingerprintMinting,
    deleteFingerprint,
    
    // Computed data
    getFingerprintsByType,
    getMintedNFTs,
    getUnmintedAssets,
    searchFingerprints,
    
    // Convenience getters
    totalAssets: vault?.totalAssets || 0,
    totalMinted: vault?.totalMinted || 0,
    totalUnminted: (vault?.totalAssets || 0) - (vault?.totalMinted || 0),
  };
}
