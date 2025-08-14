'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Certificate, 
  ExternalLink, 
  Calendar,
  Hash,
  User,
  Shield,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Fingerprint
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ProofData {
  content_hash: string;
  content_type: string;
  content_preview: string;
  author_handle?: string;
  author_wallet: string;
  created_at: string;
  fingerprint_data: any;
  nft_certificate?: {
    id: string;
    token_id?: number;
    contract_address?: string;
    chain_id: number;
    mint_status: string;
    transaction_hash?: string;
    opensea_url?: string;
    blockchain_explorer_url?: string;
    minted_at?: string;
  };
  similarity_matches?: Array<{
    content_hash: string;
    similarity_score: number;
    author_handle?: string;
    created_at: string;
  }>;
}

const CHAIN_NAMES: { [key: number]: string } = {
  137: 'Polygon',
  80001: 'Polygon Mumbai',
  8453: 'Base',
  84532: 'Base Sepolia',
};

export default function ProofPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hash) {
      fetchProofData();
    }
  }, [hash]);

  const fetchProofData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fingerprint data
      const fingerprintResponse = await fetch(`/api/fingerprint/${hash}`);
      if (!fingerprintResponse.ok) {
        throw new Error('Content not found');
      }

      const fingerprintData = await fingerprintResponse.json();

      // Fetch NFT certificate if exists
      let nftCertificate = null;
      try {
        const certResponse = await fetch(`/api/nft/certificate/by-hash/${hash}`);
        if (certResponse.ok) {
          nftCertificate = await certResponse.json();
        }
      } catch (e) {
        // Certificate doesn't exist, which is fine
      }

      // Fetch similarity matches
      let similarityMatches = [];
      try {
        const matchResponse = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: fingerprintData.content_preview,
            content_type: fingerprintData.content_type,
            threshold: 0.7
          })
        });
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          similarityMatches = matchData.matches || [];
        }
      } catch (e) {
        // Matches fetch failed, continue without
      }

      setProofData({
        content_hash: fingerprintData.content_hash,
        content_type: fingerprintData.content_type,
        content_preview: fingerprintData.content_preview,
        author_handle: fingerprintData.creator?.handle,
        author_wallet: fingerprintData.creator?.wallet_address,
        created_at: fingerprintData.created_at,
        fingerprint_data: fingerprintData.fingerprint_data,
        nft_certificate: nftCertificate,
        similarity_matches: similarityMatches.filter((match: any) => match.content_hash !== hash)
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load proof data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'Content hash copied successfully',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      case 'code': return '💻';
      default: return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getVerificationStatus = () => {
    if (!proofData?.nft_certificate) {
      return { status: 'unverified', color: 'text-yellow-600', icon: AlertCircle };
    }
    
    if (proofData.nft_certificate.mint_status === 'minted') {
      return { status: 'verified', color: 'text-green-600', icon: CheckCircle };
    }
    
    if (proofData.nft_certificate.mint_status === 'minting') {
      return { status: 'pending', color: 'text-blue-600', icon: Clock };
    }
    
    return { status: 'unverified', color: 'text-yellow-600', icon: AlertCircle };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Fingerprint className="w-8 h-8 animate-pulse text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Verifying proof of creation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Proof Not Found</h2>
            <p className="text-muted-foreground text-center">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!proofData) return null;

  const verification = getVerificationStatus();
  const VerificationIcon = verification.icon;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Certificate className="w-12 h-12 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold">Proof of Creation</h1>
            <p className="text-muted-foreground">Cryptographic verification of content authorship</p>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      <Card className="mb-6 border-2 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            <VerificationIcon className={`w-8 h-8 ${verification.color}`} />
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {verification.status === 'verified' && 'Blockchain Verified'}
                {verification.status === 'pending' && 'Verification Pending'}
                {verification.status === 'unverified' && 'Fingerprint Recorded'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {verification.status === 'verified' && 'This content has been minted as an NFT certificate'}
                {verification.status === 'pending' && 'NFT certificate minting in progress'}
                {verification.status === 'unverified' && 'Content fingerprint exists but no NFT certificate'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">{getContentTypeIcon(proofData.content_type)}</span>
              Content Information
            </CardTitle>
            <CardDescription>Original content details and fingerprint data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Preview */}
            <div>
              <h4 className="font-medium mb-2">Content Preview</h4>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {proofData.content_preview}
                </p>
              </div>
            </div>

            {/* Content Hash */}
            <div>
              <h4 className="font-medium mb-2">Content Hash (SHA-256)</h4>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">
                  {proofData.content_hash}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(proofData.content_hash)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Fingerprint Data */}
            {proofData.fingerprint_data && (
              <div>
                <h4 className="font-medium mb-2">Fingerprint Analysis</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {proofData.content_type === 'text' && proofData.fingerprint_data.word_count && (
                    <p className="text-sm">Word Count: {proofData.fingerprint_data.word_count}</p>
                  )}
                  {proofData.content_type === 'image' && proofData.fingerprint_data.dimensions && (
                    <p className="text-sm">
                      Dimensions: {proofData.fingerprint_data.dimensions.width}x{proofData.fingerprint_data.dimensions.height}
                    </p>
                  )}
                  {proofData.content_type === 'audio' && proofData.fingerprint_data.duration && (
                    <p className="text-sm">Duration: {proofData.fingerprint_data.duration}s</p>
                  )}
                  {proofData.content_type === 'code' && proofData.fingerprint_data.language && (
                    <p className="text-sm">Language: {proofData.fingerprint_data.language}</p>
                  )}
                </div>
              </div>
            )}

            {/* Creation Timestamp */}
            <div>
              <h4 className="font-medium mb-2">Creation Timestamp</h4>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(proofData.created_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Author & Certificate Info */}
        <div className="space-y-6">
          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Author
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3 mb-4">
                <Avatar>
                  <AvatarFallback>
                    {proofData.author_handle?.[0]?.toUpperCase() || 
                     proofData.author_wallet.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {proofData.author_handle ? `${proofData.author_handle}.own` : 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {proofData.author_wallet.slice(0, 6)}...{proofData.author_wallet.slice(-4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NFT Certificate */}
          {proofData.nft_certificate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  NFT Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Network</p>
                  <p className="text-sm text-muted-foreground">
                    {CHAIN_NAMES[proofData.nft_certificate.chain_id] || `Chain ${proofData.nft_certificate.chain_id}`}
                  </p>
                </div>

                {proofData.nft_certificate.token_id && (
                  <div>
                    <p className="text-sm font-medium">Token ID</p>
                    <p className="text-sm text-muted-foreground">#{proofData.nft_certificate.token_id}</p>
                  </div>
                )}

                {proofData.nft_certificate.minted_at && (
                  <div>
                    <p className="text-sm font-medium">Minted</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(proofData.nft_certificate.minted_at)}
                    </p>
                  </div>
                )}

                <div className="flex flex-col space-y-2 pt-2">
                  {proofData.nft_certificate.opensea_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={proofData.nft_certificate.opensea_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-2" />
                        View on OpenSea
                      </a>
                    </Button>
                  )}
                  
                  {proofData.nft_certificate.blockchain_explorer_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={proofData.nft_certificate.blockchain_explorer_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Blockchain Explorer
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Similar Content */}
      {proofData.similarity_matches && proofData.similarity_matches.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Similar Content Found</CardTitle>
            <CardDescription>
              Other content with similar fingerprints (potential derivatives or related works)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proofData.similarity_matches.slice(0, 3).map((match, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Similarity: {(match.similarity_score * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By {match.author_handle || 'Anonymous'} • {formatDate(match.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/proof/${match.content_hash}`}>
                      View Proof
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Share this proof of creation
            </p>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(window.location.href)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Proof Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
