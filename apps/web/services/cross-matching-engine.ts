// Cross-matching engine for duplicate and similar content detection
import type {
  FingerprintMatchRequest,
  CrossMatchResponse,
  MatchResult,
  MatchingConfig,
  FingerprintIndex,
  MatchStatus,
  DuplicateAlert,
  BatchMatchRequest,
  BatchMatchResponse
} from '@/types/cross-matching';

export class CrossMatchingEngine {
  private config: MatchingConfig = {
    exactMatchEnabled: true,
    nearMatchEnabled: true,
    hammingThreshold: 10, // Max 10 bit differences for near match
    confidenceThreshold: 70, // Min 70% confidence to report
    maxResults: 50,
    enableMetadataMatching: true
  };

  private fingerprintDatabase: Map<string, FingerprintIndex> = new Map();
  private hashPrefixIndex: Map<string, Set<string>> = new Map(); // For faster lookups
  private binaryHashCache: Map<string, string> = new Map(); // Cache binary representations

  constructor(config?: Partial<MatchingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Main matching function
  async checkFingerprint(request: FingerprintMatchRequest): Promise<CrossMatchResponse> {
    const startTime = Date.now();
    const matches: MatchResult[] = [];

    try {
      // Step 1: Check for exact matches
      if (this.config.exactMatchEnabled) {
        const exactMatches = await this.findExactMatches(request.hash);
        matches.push(...exactMatches);
      }

      // Step 2: Check for near matches (if no exact matches or if enabled)
      if (this.config.nearMatchEnabled && matches.length === 0) {
        const nearMatches = await this.findNearMatches(request.hash, request.contentType);
        matches.push(...nearMatches);
      }

      // Step 3: Enhanced matching with metadata
      if (this.config.enableMetadataMatching && request.metadata) {
        const metadataMatches = await this.findMetadataMatches(request);
        matches.push(...this.mergeMatches(matches, metadataMatches));
      }

      // Step 4: Filter and sort results
      const filteredMatches = this.filterMatches(matches, request.userIdentifier);
      const sortedMatches = this.sortMatchesByConfidence(filteredMatches);
      const topMatches = sortedMatches.slice(0, this.config.maxResults);

      // Step 5: Determine match status
      const status = this.determineMatchStatus(topMatches);
      const isOriginal = status === 'original';

      // Step 6: Generate recommendations
      const recommendations = this.generateRecommendations(status, topMatches);

      const processingTime = Date.now() - startTime;

      return {
        status,
        isOriginal,
        matches: topMatches,
        totalMatches: matches.length,
        processingTime,
        recommendations
      };

    } catch (error) {
      console.error('Cross-matching error:', error);
      return {
        status: 'original', // Default to original on error
        isOriginal: true,
        matches: [],
        totalMatches: 0,
        processingTime: Date.now() - startTime,
        recommendations: {
          shouldProceed: true,
          warningMessage: 'Unable to verify originality due to technical error'
        }
      };
    }
  }

  // Find exact hash matches
  private async findExactMatches(hash: string): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    const fingerprint = this.fingerprintDatabase.get(hash);

    if (fingerprint) {
      matches.push({
        assetId: fingerprint.id,
        hash: fingerprint.hash,
        ownerWallet: fingerprint.ownerWallet,
        ownerEmail: fingerprint.ownerEmail,
        createdAt: fingerprint.createdAt,
        matchType: 'exact',
        confidence: 100,
        metadata: {
          title: fingerprint.metadata.title,
          description: fingerprint.metadata.description,
          contentType: fingerprint.contentType,
          fileSize: fingerprint.metadata.fileSize,
          mintedTokenId: fingerprint.mintedTokenId,
          contractAddress: fingerprint.metadata.contractAddress
        }
      });
    }

    return matches;
  }

  // Find near matches using Hamming distance
  private async findNearMatches(targetHash: string, contentType: string): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    const targetBinary = this.hexToBinary(targetHash);
    
    // Use prefix indexing for faster searches
    const hashPrefix = targetHash.substring(0, 8);
    const candidateIds = this.hashPrefixIndex.get(hashPrefix) || new Set();

    for (const candidateId of candidateIds) {
      const candidate = this.fingerprintDatabase.get(candidateId);
      if (!candidate || candidate.contentType !== contentType) continue;

      const candidateBinary = this.getBinaryHash(candidate.hash);
      const hammingDistance = this.calculateHammingDistance(targetBinary, candidateBinary);

      if (hammingDistance <= this.config.hammingThreshold) {
        const confidence = this.calculateConfidence(hammingDistance, targetHash.length * 4);
        
        if (confidence >= this.config.confidenceThreshold) {
          matches.push({
            assetId: candidate.id,
            hash: candidate.hash,
            ownerWallet: candidate.ownerWallet,
            ownerEmail: candidate.ownerEmail,
            createdAt: candidate.createdAt,
            matchType: 'near',
            confidence,
            hammingDistance,
            metadata: {
              title: candidate.metadata.title,
              description: candidate.metadata.description,
              contentType: candidate.contentType,
              fileSize: candidate.metadata.fileSize,
              mintedTokenId: candidate.mintedTokenId,
              contractAddress: candidate.metadata.contractAddress
            }
          });
        }
      }
    }

    return matches;
  }

  // Find matches based on metadata similarity
  private async findMetadataMatches(request: FingerprintMatchRequest): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    
    if (!request.metadata) return matches;

    for (const [_, fingerprint] of this.fingerprintDatabase) {
      if (fingerprint.contentType !== request.contentType) continue;

      const metadataScore = this.calculateMetadataSimilarity(
        request.metadata,
        fingerprint.metadata
      );

      if (metadataScore >= 0.8) { // 80% metadata similarity threshold
        const confidence = Math.round(metadataScore * 100);
        
        matches.push({
          assetId: fingerprint.id,
          hash: fingerprint.hash,
          ownerWallet: fingerprint.ownerWallet,
          ownerEmail: fingerprint.ownerEmail,
          createdAt: fingerprint.createdAt,
          matchType: 'near',
          confidence,
          metadata: {
            title: fingerprint.metadata.title,
            description: fingerprint.metadata.description,
            contentType: fingerprint.contentType,
            fileSize: fingerprint.metadata.fileSize,
            mintedTokenId: fingerprint.mintedTokenId,
            contractAddress: fingerprint.metadata.contractAddress
          }
        });
      }
    }

    return matches;
  }

  // Calculate Hamming distance between two binary strings
  private calculateHammingDistance(binary1: string, binary2: string): number {
    if (binary1.length !== binary2.length) {
      // Pad shorter string with zeros
      const maxLength = Math.max(binary1.length, binary2.length);
      binary1 = binary1.padEnd(maxLength, '0');
      binary2 = binary2.padEnd(maxLength, '0');
    }

    let distance = 0;
    for (let i = 0; i < binary1.length; i++) {
      if (binary1[i] !== binary2[i]) {
        distance++;
      }
    }
    return distance;
  }

  // Calculate confidence percentage from Hamming distance
  private calculateConfidence(hammingDistance: number, totalBits: number): number {
    const similarity = 1 - (hammingDistance / totalBits);
    return Math.round(similarity * 100);
  }

  // Calculate metadata similarity score
  private calculateMetadataSimilarity(metadata1: any, metadata2: any): number {
    let totalScore = 0;
    let comparisons = 0;

    // Title similarity
    if (metadata1.title && metadata2.title) {
      totalScore += this.calculateStringSimilarity(metadata1.title, metadata2.title);
      comparisons++;
    }

    // Description similarity
    if (metadata1.description && metadata2.description) {
      totalScore += this.calculateStringSimilarity(metadata1.description, metadata2.description);
      comparisons++;
    }

    // File size similarity (within 10% tolerance)
    if (metadata1.fileSize && metadata2.fileSize) {
      const sizeDiff = Math.abs(metadata1.fileSize - metadata2.fileSize);
      const avgSize = (metadata1.fileSize + metadata2.fileSize) / 2;
      const sizeScore = Math.max(0, 1 - (sizeDiff / avgSize));
      totalScore += sizeScore;
      comparisons++;
    }

    // Duration similarity (for video/audio)
    if (metadata1.duration && metadata2.duration) {
      const durationDiff = Math.abs(metadata1.duration - metadata2.duration);
      const avgDuration = (metadata1.duration + metadata2.duration) / 2;
      const durationScore = Math.max(0, 1 - (durationDiff / avgDuration));
      totalScore += durationScore;
      comparisons++;
    }

    return comparisons > 0 ? totalScore / comparisons : 0;
  }

  // Calculate string similarity using Levenshtein distance
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  // Levenshtein distance implementation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Convert hex hash to binary
  private hexToBinary(hex: string): string {
    return hex.split('').map(char => 
      parseInt(char, 16).toString(2).padStart(4, '0')
    ).join('');
  }

  // Get or generate binary hash
  private getBinaryHash(hash: string): string {
    if (!this.binaryHashCache.has(hash)) {
      this.binaryHashCache.set(hash, this.hexToBinary(hash));
    }
    return this.binaryHashCache.get(hash)!;
  }

  // Filter out matches from the same user
  private filterMatches(matches: MatchResult[], userIdentifier?: string): MatchResult[] {
    if (!userIdentifier) return matches;

    return matches.filter(match => 
      match.ownerWallet !== userIdentifier && match.ownerEmail !== userIdentifier
    );
  }

  // Sort matches by confidence (highest first)
  private sortMatchesByConfidence(matches: MatchResult[]): MatchResult[] {
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  // Merge and deduplicate match results
  private mergeMatches(existing: MatchResult[], additional: MatchResult[]): MatchResult[] {
    const merged = [...existing];
    const existingIds = new Set(existing.map(m => m.assetId));

    for (const match of additional) {
      if (!existingIds.has(match.assetId)) {
        merged.push(match);
      }
    }

    return merged;
  }

  // Determine overall match status
  private determineMatchStatus(matches: MatchResult[]): MatchStatus {
    if (matches.length === 0) return 'original';

    const hasExactMatch = matches.some(m => m.matchType === 'exact');
    if (hasExactMatch) return 'duplicate';

    const hasHighConfidenceMatch = matches.some(m => m.confidence >= 90);
    if (hasHighConfidenceMatch) return 'duplicate';

    return 'similar';
  }

  // Generate recommendations based on match results
  private generateRecommendations(status: MatchStatus, matches: MatchResult[]) {
    switch (status) {
      case 'original':
        return {
          shouldProceed: true,
          suggestedAction: 'allow' as const
        };

      case 'duplicate':
        const exactMatch = matches.find(m => m.matchType === 'exact');
        return {
          shouldProceed: false,
          warningMessage: exactMatch 
            ? `Exact duplicate found. Original created by ${exactMatch.ownerWallet || exactMatch.ownerEmail} on ${new Date(exactMatch.createdAt).toLocaleDateString()}`
            : `High-confidence duplicate detected (${matches[0]?.confidence}% match)`,
          suggestedAction: 'block' as const
        };

      case 'similar':
        return {
          shouldProceed: true,
          warningMessage: `Similar content found (${matches[0]?.confidence}% match). Please verify originality.`,
          suggestedAction: 'warn' as const
        };

      default:
        return {
          shouldProceed: true,
          suggestedAction: 'allow' as const
        };
    }
  }

  // Add fingerprint to database
  async addFingerprint(fingerprint: FingerprintIndex): Promise<void> {
    this.fingerprintDatabase.set(fingerprint.hash, fingerprint);
    
    // Update prefix index
    const prefix = fingerprint.hash.substring(0, 8);
    if (!this.hashPrefixIndex.has(prefix)) {
      this.hashPrefixIndex.set(prefix, new Set());
    }
    this.hashPrefixIndex.get(prefix)!.add(fingerprint.hash);

    // Cache binary representation
    this.binaryHashCache.set(fingerprint.hash, this.hexToBinary(fingerprint.hash));
  }

  // Remove fingerprint from database
  async removeFingerprint(hash: string): Promise<boolean> {
    const removed = this.fingerprintDatabase.delete(hash);
    
    if (removed) {
      // Update prefix index
      const prefix = hash.substring(0, 8);
      const prefixSet = this.hashPrefixIndex.get(prefix);
      if (prefixSet) {
        prefixSet.delete(hash);
        if (prefixSet.size === 0) {
          this.hashPrefixIndex.delete(prefix);
        }
      }

      // Remove from cache
      this.binaryHashCache.delete(hash);
    }

    return removed;
  }

  // Batch matching for multiple fingerprints
  async checkBatch(request: BatchMatchRequest): Promise<BatchMatchResponse> {
    const startTime = Date.now();
    const results: Array<{ hash: string; match: CrossMatchResponse }> = [];
    
    // Apply custom config if provided
    const originalConfig = { ...this.config };
    if (request.config) {
      this.config = { ...this.config, ...request.config };
    }

    try {
      for (const fingerprintRequest of request.fingerprints) {
        const match = await this.checkFingerprint(fingerprintRequest);
        results.push({
          hash: fingerprintRequest.hash,
          match
        });
      }

      const summary = {
        totalProcessed: results.length,
        originalCount: results.filter(r => r.match.status === 'original').length,
        duplicateCount: results.filter(r => r.match.status === 'duplicate').length,
        similarCount: results.filter(r => r.match.status === 'similar').length,
        totalProcessingTime: Date.now() - startTime
      };

      return { results, summary };

    } finally {
      // Restore original config
      this.config = originalConfig;
    }
  }

  // Get matching statistics
  getStats() {
    const totalFingerprints = this.fingerprintDatabase.size;
    return {
      totalFingerprints,
      exactMatches: 0, // Would need to track this in real implementation
      nearMatches: 0,
      originalContent: 0,
      duplicateContent: 0,
      similarContent: 0,
      averageProcessingTime: 0
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<MatchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Clear all data (for testing)
  clear(): void {
    this.fingerprintDatabase.clear();
    this.hashPrefixIndex.clear();
    this.binaryHashCache.clear();
  }
}

// Singleton instance
let matchingEngineInstance: CrossMatchingEngine | null = null;

export function getCrossMatchingEngine(config?: Partial<MatchingConfig>): CrossMatchingEngine {
  if (!matchingEngineInstance) {
    matchingEngineInstance = new CrossMatchingEngine(config);
  }
  return matchingEngineInstance;
}

export function resetCrossMatchingEngine(): void {
  matchingEngineInstance = null;
}
