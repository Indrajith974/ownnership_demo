// Cross-matching engine types for duplicate detection
export type MatchStatus = 'original' | 'duplicate' | 'similar';

export interface FingerprintMatchRequest {
  hash: string;
  contentType: 'text' | 'image' | 'video' | 'audio';
  metadata?: {
    title?: string;
    description?: string;
    fileSize?: number;
    duration?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
  userIdentifier?: string; // wallet address or email
}

export interface MatchResult {
  assetId: string;
  hash: string;
  ownerWallet?: string;
  ownerEmail?: string;
  createdAt: number;
  matchType: 'exact' | 'near';
  confidence: number; // 0-100%
  hammingDistance?: number;
  metadata?: {
    title?: string;
    description?: string;
    contentType: string;
    fileSize?: number;
    mintedTokenId?: string;
    contractAddress?: string;
  };
}

export interface CrossMatchResponse {
  status: MatchStatus;
  isOriginal: boolean;
  matches: MatchResult[];
  totalMatches: number;
  processingTime: number;
  recommendations?: {
    shouldProceed: boolean;
    warningMessage?: string;
    suggestedAction?: 'block' | 'warn' | 'allow';
  };
}

export interface MatchingConfig {
  exactMatchEnabled: boolean;
  nearMatchEnabled: boolean;
  hammingThreshold: number; // Maximum Hamming distance for near matches
  confidenceThreshold: number; // Minimum confidence % to report
  maxResults: number; // Maximum number of matches to return
  enableMetadataMatching: boolean; // Also compare metadata for better accuracy
}

export interface MatchingStats {
  totalFingerprints: number;
  exactMatches: number;
  nearMatches: number;
  originalContent: number;
  duplicateContent: number;
  similarContent: number;
  averageProcessingTime: number;
}

// Database schema for efficient matching
export interface FingerprintIndex {
  id: string;
  hash: string;
  hashBinary?: string; // Binary representation for faster Hamming distance
  contentType: string;
  ownerWallet?: string;
  ownerEmail?: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
  // Indexing fields for performance
  hashPrefix: string; // First 8 characters for quick filtering
  hashSuffix: string; // Last 8 characters for quick filtering
  contentSize?: number;
  isVerified: boolean;
  mintedTokenId?: string;
}

// Alert system for duplicate detection
export interface DuplicateAlert {
  id: string;
  originalAssetId: string;
  duplicateHash: string;
  duplicateSubmitter: string;
  matchConfidence: number;
  alertType: 'exact_duplicate' | 'similar_content' | 'potential_plagiarism';
  createdAt: number;
  acknowledged: boolean;
  ownerNotified: boolean;
}

// Batch matching for multiple fingerprints
export interface BatchMatchRequest {
  fingerprints: FingerprintMatchRequest[];
  config?: Partial<MatchingConfig>;
}

export interface BatchMatchResponse {
  results: Array<{
    hash: string;
    match: CrossMatchResponse;
  }>;
  summary: {
    totalProcessed: number;
    originalCount: number;
    duplicateCount: number;
    similarCount: number;
    totalProcessingTime: number;
  };
}
