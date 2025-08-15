'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/auth-context-optimized';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Hash, 
  Award, 
  Calendar, 
  Shield, 
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface FingerprintSummary {
  id: string;
  fingerprint_id: string;
  title?: string;
  content_type: string;
  created_at: string;
  is_public: boolean;
}

interface NFTSummary {
  id: string;
  token_id: number;
  mint_status: string;
  created_at: string;
}

const StatsCard = memo(({ title, value, icon: Icon, color }: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
}) => (
  <div className="text-center p-4 bg-muted/50 rounded-lg">
    <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-muted-foreground">{title}</div>
  </div>
));

const FingerprintCard = memo(({ fingerprint, onMint }: {
  fingerprint: FingerprintSummary;
  onMint: (id: string) => void;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">
            {fingerprint.title || 'Untitled Content'}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Hash className="h-3 w-3" />
            {fingerprint.content_type}
            <Calendar className="h-3 w-3 ml-2" />
            {new Date(fingerprint.created_at).toLocaleDateString()}
          </CardDescription>
        </div>
        <Badge variant={fingerprint.is_public ? 'default' : 'secondary'} className="ml-2">
          {fingerprint.is_public ? 'Public' : 'Private'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex justify-between items-center">
        <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1 mr-2">
          {fingerprint.fingerprint_id}
        </code>
        <Button 
          size="sm" 
          onClick={() => onMint(fingerprint.fingerprint_id)}
          className="shrink-0"
        >
          <Award className="h-3 w-3 mr-1" />
          Mint
        </Button>
      </div>
    </CardContent>
  </Card>
));

export function DashboardLite() {
  const { user, token, isAuthenticated } = useAuth();
  const [fingerprints, setFingerprints] = useState<FingerprintSummary[]>([]);
  const [nfts, setNFTs] = useState<NFTSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Fetch only essential data with limits
      const [fingerprintsRes, nftsRes] = await Promise.all([
        fetch(`${API_URL}/api/fingerprints?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/nfts?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (fingerprintsRes.ok) {
        const fingerprintsData = await fingerprintsRes.json();
        setFingerprints(fingerprintsData || []);
      }

      if (nftsRes.ok) {
        const nftsData = await nftsRes.json();
        setNFTs(nftsData || []);
      }

    } catch (err) {
      setError('Failed to load data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMint = useCallback(async (fingerprintId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fingerprint_id: fingerprintId })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`NFT minted! Token ID: ${result.token_id}`);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Mint failed: ${error.detail}`);
      }
    } catch (err) {
      alert('Mint failed');
      console.error('Mint error:', err);
    }
  }, [token, API_URL, fetchData]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Welcome back, {user?.full_name || user?.username || user?.email?.split('@')[0]}!
              </CardTitle>
              <CardDescription>
                Quick overview of your content protection
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StatsCard
              title="Fingerprints"
              value={fingerprints.length}
              icon={Hash}
              color="text-blue-600"
            />
            <StatsCard
              title="NFT Certificates"
              value={nfts.length}
              icon={Award}
              color="text-green-600"
            />
            <StatsCard
              title="Public Content"
              value={fingerprints.filter(fp => fp.is_public).length}
              icon={Shield}
              color="text-purple-600"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recent Fingerprints */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Content Fingerprints</CardTitle>
          <CardDescription>Your latest protected content</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : fingerprints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fingerprints yet. Create your first one to get started!
            </div>
          ) : (
            <div className="grid gap-3">
              {fingerprints.slice(0, 3).map((fingerprint) => (
                <FingerprintCard
                  key={fingerprint.id}
                  fingerprint={fingerprint}
                  onMint={handleMint}
                />
              ))}
              {fingerprints.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    View All ({fingerprints.length} total)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent NFTs */}
      {nfts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent NFT Certificates</CardTitle>
            <CardDescription>Your ownership certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {nfts.slice(0, 3).map((nft) => (
                <div key={nft.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">Token #{nft.token_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(nft.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={nft.mint_status === 'minted' ? 'default' : 'secondary'}>
                    {nft.mint_status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
