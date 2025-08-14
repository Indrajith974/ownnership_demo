// API endpoint for cross-matching fingerprints
import { NextRequest, NextResponse } from 'next/server';
import { getCrossMatchingEngine } from '@/services/cross-matching-engine';
import { VaultService } from '@/services/vault-service';
import type { 
  FingerprintMatchRequest, 
  CrossMatchResponse,
  FingerprintIndex,
  DuplicateAlert 
} from '@/types/cross-matching';

// Initialize services
const matchingEngine = getCrossMatchingEngine();
const vaultService = new VaultService();

export async function POST(request: NextRequest) {
  try {
    const body: FingerprintMatchRequest = await request.json();
    
    // Validate request
    if (!body.hash || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: hash and contentType' },
        { status: 400 }
      );
    }

    // Load fingerprints from vault into matching engine if not already loaded
    await loadFingerprintsIntoEngine();

    // Perform cross-matching
    const matchResult: CrossMatchResponse = await matchingEngine.checkFingerprint(body);

    // If duplicates found, create alerts for original owners
    if (matchResult.status === 'duplicate' && matchResult.matches.length > 0) {
      await createDuplicateAlerts(body, matchResult.matches);
    }

    // Log the match attempt for analytics
    await logMatchAttempt(body, matchResult);

    return NextResponse.json(matchResult);

  } catch (error) {
    console.error('Cross-matching API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during cross-matching',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Batch matching endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.fingerprints || !Array.isArray(body.fingerprints)) {
      return NextResponse.json(
        { error: 'Missing or invalid fingerprints array' },
        { status: 400 }
      );
    }

    // Load fingerprints into engine
    await loadFingerprintsIntoEngine();

    // Perform batch matching
    const batchResult = await matchingEngine.checkBatch(body);

    return NextResponse.json(batchResult);

  } catch (error) {
    console.error('Batch cross-matching API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during batch cross-matching',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get matching statistics
export async function GET(request: NextRequest) {
  try {
    const stats = matchingEngine.getStats();
    
    // Add additional stats from vault
    const vaultStats = await getVaultStats();
    
    return NextResponse.json({
      ...stats,
      ...vaultStats,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}

// Load fingerprints from vault into matching engine
async function loadFingerprintsIntoEngine(): Promise<void> {
  try {
    // Get all users' vaults (in production, this would be paginated)
    const allFingerprints = await getAllFingerprints();
    
    for (const fingerprint of allFingerprints) {
      const fingerprintIndex: FingerprintIndex = {
        id: fingerprint.id || generateId(),
        hash: fingerprint.hash,
        contentType: fingerprint.type,
        ownerWallet: fingerprint.userIdentifier?.startsWith('0x') ? fingerprint.userIdentifier : undefined,
        ownerEmail: !fingerprint.userIdentifier?.startsWith('0x') ? fingerprint.userIdentifier : undefined,
        createdAt: fingerprint.createdAt,
        updatedAt: fingerprint.updatedAt || fingerprint.createdAt,
        metadata: fingerprint.metadata || {},
        hashPrefix: fingerprint.hash.substring(0, 8),
        hashSuffix: fingerprint.hash.substring(fingerprint.hash.length - 8),
        contentSize: fingerprint.metadata?.fileSize,
        isVerified: !!fingerprint.mintingInfo?.tokenId,
        mintedTokenId: fingerprint.mintingInfo?.tokenId
      };

      await matchingEngine.addFingerprint(fingerprintIndex);
    }
  } catch (error) {
    console.error('Failed to load fingerprints into engine:', error);
  }
}

// Get all fingerprints from all users (simplified for demo)
async function getAllFingerprints() {
  // In production, this would query a database with proper pagination
  // For now, we'll simulate getting fingerprints from multiple users
  const fingerprints: any[] = [];
  
  // This is a simplified implementation - in production you'd query your database
  // Example: SELECT * FROM fingerprints ORDER BY created_at DESC
  
  return fingerprints;
}

// Create duplicate alerts for original content owners
async function createDuplicateAlerts(
  request: FingerprintMatchRequest, 
  matches: any[]
): Promise<void> {
  for (const match of matches) {
    if (match.matchType === 'exact' || match.confidence >= 95) {
      const alert: DuplicateAlert = {
        id: generateId(),
        originalAssetId: match.assetId,
        duplicateHash: request.hash,
        duplicateSubmitter: request.userIdentifier || 'unknown',
        matchConfidence: match.confidence,
        alertType: match.matchType === 'exact' ? 'exact_duplicate' : 'similar_content',
        createdAt: Date.now(),
        acknowledged: false,
        ownerNotified: false
      };

      // Store alert (in production, save to database)
      await storeAlert(alert);

      // Send notification to original owner
      await notifyOriginalOwner(match, alert);
    }
  }
}

// Store duplicate alert
async function storeAlert(alert: DuplicateAlert): Promise<void> {
  // In production, save to database
  console.log('Duplicate alert created:', alert);
}

// Notify original content owner
async function notifyOriginalOwner(match: any, alert: DuplicateAlert): Promise<void> {
  // In production, send email/push notification
  console.log(`Notifying ${match.ownerWallet || match.ownerEmail} of duplicate content`);
  
  // Example notification payload:
  const notification = {
    to: match.ownerWallet || match.ownerEmail,
    subject: 'Duplicate Content Detected',
    message: `Someone has submitted content that matches your original creation (${alert.matchConfidence}% match). Review the duplicate submission in your dashboard.`,
    alertId: alert.id,
    originalAssetId: alert.originalAssetId
  };

  // Send notification via your preferred service (email, push, etc.)
}

// Log match attempt for analytics
async function logMatchAttempt(
  request: FingerprintMatchRequest, 
  result: CrossMatchResponse
): Promise<void> {
  const logEntry = {
    timestamp: Date.now(),
    hash: request.hash,
    contentType: request.contentType,
    userIdentifier: request.userIdentifier,
    matchStatus: result.status,
    matchCount: result.totalMatches,
    processingTime: result.processingTime,
    highestConfidence: result.matches.length > 0 ? Math.max(...result.matches.map(m => m.confidence)) : 0
  };

  // In production, save to analytics database
  console.log('Match attempt logged:', logEntry);
}

// Get vault statistics
async function getVaultStats() {
  // In production, query database for stats
  return {
    totalUsers: 0,
    totalAssets: 0,
    verifiedAssets: 0,
    duplicateAlerts: 0
  };
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
