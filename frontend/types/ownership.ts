export type ContentType = 'text' | 'image' | 'video' | 'audio';

export interface FingerprintMetadata {
  id: string;
  type: ContentType;
  fingerprintHash: string;
  simHash?: string;
  timestamp: number;
  ipfsMetadataUrl?: string;
  smartContractMintId?: string;
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: number;
  
  // Content details
  title?: string;
  description?: string;
  tags?: string[];
  preview?: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Platform-specific data
  platformSource?: 'upload' | 'youtube' | 'instagram' | 'twitter' | 'tiktok';
  platformId?: string;
  platformUrl?: string;
  platformMetadata?: Record<string, any>;
  
  // Ownership and verification
  ownerWalletAddress?: string;
  ownerEmail?: string;
  ownerHandle?: string;
  verified: boolean;
  verificationMethod?: 'wallet_signature' | 'email_verification' | 'oauth';
  
  // NFT and blockchain data
  isMinted: boolean;
  mintedAt?: number;
  mintedBy?: string;
  nftTokenId?: string;
  nftMetadataUri?: string;
  royaltyPercentage?: number;
  
  // Storage locations
  storageLocations: {
    indexedDB: boolean;
    supabase: boolean;
    ipfs: boolean;
  };
  
  // Audit trail
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface UserVault {
  userId: string;
  userType: 'wallet' | 'email';
  userIdentifier: string; // wallet address or email
  totalAssets: number;
  totalMinted: number;
  totalValue?: number;
  fingerprints: FingerprintMetadata[];
  lastUpdated: number;
}

export interface VaultStats {
  totalFingerprints: number;
  mintedNFTs: number;
  unmintedAssets: number;
  contentTypes: Record<ContentType, number>;
  platformSources: Record<string, number>;
  storageHealth: {
    indexedDB: boolean;
    supabase: boolean;
    ipfs: boolean;
  };
}

export interface StoreFingerprintRequest {
  type: ContentType;
  fingerprintHash: string;
  simHash?: string;
  title?: string;
  description?: string;
  tags?: string[];
  preview?: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  platformSource?: string;
  platformId?: string;
  platformUrl?: string;
  platformMetadata?: Record<string, any>;
  ipfsMetadataUrl?: string;
}

export interface VaultError {
  code: string;
  message: string;
  details?: any;
}

export type VaultResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: VaultError;
};
