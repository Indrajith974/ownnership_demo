'use client';

import { 
  FingerprintMetadata, 
  UserVault, 
  VaultStats, 
  StoreFingerprintRequest, 
  VaultResult,
  ContentType 
} from '@/types/ownership';

class VaultService {
  private dbName = 'OwnershipVault';
  private dbVersion = 1;
  private storeName = 'fingerprints';

  // IndexedDB instance
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create fingerprints store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('ownerWalletAddress', 'ownerWalletAddress', { unique: false });
          store.createIndex('ownerEmail', 'ownerEmail', { unique: false });
          store.createIndex('fingerprintHash', 'fingerprintHash', { unique: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('isMinted', 'isMinted', { unique: false });
          store.createIndex('platformSource', 'platformSource', { unique: false });
        }
      };
    });
  }

  // Generate unique ID for fingerprint
  private generateFingerprintId(): string {
    return `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current user identifier (wallet or email)
  private getCurrentUserIdentifier(): { type: 'wallet' | 'email', identifier: string } | null {
    // Check for wallet connection (this would integrate with your wagmi setup)
    const walletAddress = this.getConnectedWallet();
    if (walletAddress) {
      return { type: 'wallet', identifier: walletAddress };
    }

    // Check for email session (this would integrate with your Supabase auth)
    const email = this.getAuthenticatedEmail();
    if (email) {
      return { type: 'email', identifier: email };
    }

    return null;
  }

  // Mock wallet connection - replace with actual wagmi integration
  private getConnectedWallet(): string | null {
    // This should integrate with your existing wallet connection logic
    if (typeof window !== 'undefined') {
      return localStorage.getItem('connected_wallet') || null;
    }
    return null;
  }

  // Mock email authentication - replace with actual Supabase integration
  private getAuthenticatedEmail(): string | null {
    // This should integrate with your existing Supabase auth
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authenticated_email') || null;
    }
    return null;
  }

  // Store fingerprint securely
  async storeFingerprint(request: StoreFingerprintRequest): Promise<VaultResult<FingerprintMetadata>> {
    try {
      const user = this.getCurrentUserIdentifier();
      if (!user) {
        return {
          success: false,
          error: {
            code: 'NO_AUTH',
            message: 'User must be authenticated with wallet or email to store fingerprints'
          }
        };
      }

      // Check if fingerprint already exists
      const existing = await this.getFingerprintByHash(request.fingerprintHash);
      if (existing.success) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_FINGERPRINT',
            message: 'Fingerprint already exists in vault'
          }
        };
      }

      const now = Date.now();
      const metadata: FingerprintMetadata = {
        id: this.generateFingerprintId(),
        type: request.type,
        fingerprintHash: request.fingerprintHash,
        simHash: request.simHash,
        timestamp: now,
        ipfsMetadataUrl: request.ipfsMetadataUrl,
        
        // Content details
        title: request.title,
        description: request.description,
        tags: request.tags || [],
        preview: request.preview,
        originalFilename: request.originalFilename,
        fileSize: request.fileSize,
        mimeType: request.mimeType,
        
        // Platform data
        platformSource: request.platformSource as any,
        platformId: request.platformId,
        platformUrl: request.platformUrl,
        platformMetadata: request.platformMetadata,
        
        // Ownership
        ownerWalletAddress: user.type === 'wallet' ? user.identifier : undefined,
        ownerEmail: user.type === 'email' ? user.identifier : undefined,
        verified: true,
        verificationMethod: user.type === 'wallet' ? 'wallet_signature' : 'email_verification',
        
        // NFT status
        isMinted: false,
        
        // Storage tracking
        storageLocations: {
          indexedDB: false,
          supabase: false,
          ipfs: !!request.ipfsMetadataUrl
        },
        
        // Audit
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      // Store in IndexedDB
      await this.storeInIndexedDB(metadata);
      metadata.storageLocations.indexedDB = true;

      // Store in Supabase (if available)
      try {
        await this.storeInSupabase(metadata);
        metadata.storageLocations.supabase = true;
      } catch (error) {
        console.warn('Failed to store in Supabase:', error);
      }

      return {
        success: true,
        data: metadata
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to store fingerprint',
          details: error
        }
      };
    }
  }

  // Get user's complete vault
  async getUserVault(walletOrEmail?: string): Promise<VaultResult<UserVault>> {
    try {
      let userIdentifier: string;
      let userType: 'wallet' | 'email';

      if (walletOrEmail) {
        // Use provided identifier
        userIdentifier = walletOrEmail;
        userType = walletOrEmail.includes('@') ? 'email' : 'wallet';
      } else {
        // Use current authenticated user
        const user = this.getCurrentUserIdentifier();
        if (!user) {
          return {
            success: false,
            error: {
              code: 'NO_AUTH',
              message: 'User must be authenticated to access vault'
            }
          };
        }
        userIdentifier = user.identifier;
        userType = user.type;
      }

      const fingerprints = await this.getFingerprintsByUser(userIdentifier, userType);
      const mintedCount = fingerprints.filter(fp => fp.isMinted).length;

      const vault: UserVault = {
        userId: userIdentifier,
        userType,
        userIdentifier,
        totalAssets: fingerprints.length,
        totalMinted: mintedCount,
        fingerprints,
        lastUpdated: Date.now()
      };

      return {
        success: true,
        data: vault
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VAULT_ERROR',
          message: 'Failed to retrieve user vault',
          details: error
        }
      };
    }
  }

  // Get vault statistics
  async getVaultStats(): Promise<VaultResult<VaultStats>> {
    try {
      const user = this.getCurrentUserIdentifier();
      if (!user) {
        return {
          success: false,
          error: {
            code: 'NO_AUTH',
            message: 'User must be authenticated to view stats'
          }
        };
      }

      const fingerprints = await this.getFingerprintsByUser(user.identifier, user.type);
      
      const stats: VaultStats = {
        totalFingerprints: fingerprints.length,
        mintedNFTs: fingerprints.filter(fp => fp.isMinted).length,
        unmintedAssets: fingerprints.filter(fp => !fp.isMinted).length,
        contentTypes: fingerprints.reduce((acc, fp) => {
          acc[fp.type] = (acc[fp.type] || 0) + 1;
          return acc;
        }, {} as Record<ContentType, number>),
        platformSources: fingerprints.reduce((acc, fp) => {
          const source = fp.platformSource || 'upload';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        storageHealth: {
          indexedDB: true, // Always true if we can query
          supabase: await this.checkSupabaseHealth(),
          ipfs: await this.checkIPFSHealth()
        }
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to generate vault statistics',
          details: error
        }
      };
    }
  }

  // Update fingerprint with minting information
  async updateFingerprintMinting(
    fingerprintHash: string,
    mintData: {
      smartContractMintId: string;
      contractAddress: string;
      transactionHash: string;
      blockNumber?: number;
      nftTokenId?: string;
      nftMetadataUri?: string;
    }
  ): Promise<VaultResult<FingerprintMetadata>> {
    try {
      const existing = await this.getFingerprintByHash(fingerprintHash);
      if (!existing.success) {
        return existing;
      }

      const updated: FingerprintMetadata = {
        ...existing.data,
        smartContractMintId: mintData.smartContractMintId,
        contractAddress: mintData.contractAddress,
        transactionHash: mintData.transactionHash,
        blockNumber: mintData.blockNumber,
        nftTokenId: mintData.nftTokenId,
        nftMetadataUri: mintData.nftMetadataUri,
        isMinted: true,
        mintedAt: Date.now(),
        updatedAt: Date.now(),
        version: existing.data.version + 1
      };

      await this.storeInIndexedDB(updated);
      
      try {
        await this.storeInSupabase(updated);
      } catch (error) {
        console.warn('Failed to update in Supabase:', error);
      }

      return {
        success: true,
        data: updated
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update fingerprint minting data',
          details: error
        }
      };
    }
  }

  // Private helper methods
  private async storeInIndexedDB(metadata: FingerprintMetadata): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(metadata);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async storeInSupabase(metadata: FingerprintMetadata): Promise<void> {
    // This would integrate with your Supabase client
    // For now, we'll simulate the storage
    console.log('Storing in Supabase:', metadata.id);
  }

  private async getFingerprintByHash(hash: string): Promise<VaultResult<FingerprintMetadata>> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('fingerprintHash');
      const request = index.get(hash);

      request.onerror = () => resolve({
        success: false,
        error: { code: 'DB_ERROR', message: 'Database query failed' }
      });

      request.onsuccess = () => {
        if (request.result) {
          resolve({ success: true, data: request.result });
        } else {
          resolve({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Fingerprint not found' }
          });
        }
      };
    });
  }

  private async getFingerprintsByUser(identifier: string, type: 'wallet' | 'email'): Promise<FingerprintMetadata[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const indexName = type === 'wallet' ? 'ownerWalletAddress' : 'ownerEmail';
      const index = store.index(indexName);
      const request = index.getAll(identifier);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  private async checkSupabaseHealth(): Promise<boolean> {
    // This would check Supabase connection
    return true;
  }

  private async checkIPFSHealth(): Promise<boolean> {
    // This would check IPFS connection
    return true;
  }

  // Delete fingerprint
  async deleteFingerprint(fingerprintHash: string): Promise<VaultResult<boolean>> {
    try {
      const existing = await this.getFingerprintByHash(fingerprintHash);
      if (!existing.success) {
        return existing as any;
      }

      // Verify ownership
      const user = this.getCurrentUserIdentifier();
      if (!user) {
        return {
          success: false,
          error: {
            code: 'NO_AUTH',
            message: 'User must be authenticated to delete fingerprints'
          }
        };
      }

      const isOwner = (user.type === 'wallet' && existing.data.ownerWalletAddress === user.identifier) ||
                     (user.type === 'email' && existing.data.ownerEmail === user.identifier);

      if (!isOwner) {
        return {
          success: false,
          error: {
            code: 'NOT_OWNER',
            message: 'User does not own this fingerprint'
          }
        };
      }

      // Delete from IndexedDB
      await this.deleteFromIndexedDB(existing.data.id);

      return {
        success: true,
        data: true
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete fingerprint',
          details: error
        }
      };
    }
  }

  private async deleteFromIndexedDB(id: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Export singleton instance
export const vaultService = new VaultService();
