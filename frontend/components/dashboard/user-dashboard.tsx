'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Hash, 
  FileText, 
  Award, 
  Calendar, 
  Eye, 
  Shield, 
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';

interface Fingerprint {
  id: string;
  fingerprint_id: string;
  content_type: string;
  content_hash: string;
  content_preview: string;
  title?: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

interface NFT {
  id: string;
  fingerprint_id: string;
  token_id: number;
  contract_address: string;
  transaction_hash: string;
  mint_status: string;
  created_at: string;
  minted_at?: string;
}

export function UserDashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUserData();
    }
  }, [isAuthenticated, token]);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch fingerprints
      const fingerprintsResponse = await fetch(`${API_URL}/api/fingerprints`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (fingerprintsResponse.ok) {
        const fingerprintsData = await fingerprintsResponse.json();
        setFingerprints(fingerprintsData);
      }

      // Fetch NFTs
      const nftsResponse = await fetch(`${API_URL}/api/nfts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        setNFTs(nftsData);
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const mintNFT = async (fingerprintId: string) => {
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
        alert(`NFT minted successfully! Token ID: ${result.token_id}`);
        fetchUserData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to mint NFT: ${error.detail}`);
      }
    } catch (err) {
      alert('Failed to mint NFT');
      console.error('Mint error:', err);
    }
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading dashboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Welcome back, {user?.full_name || user?.username || user?.email}!
          </CardTitle>
          <CardDescription>
            Manage your content fingerprints and NFT certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{fingerprints.length}</div>
              <div className="text-sm text-muted-foreground">Content Fingerprints</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{nfts.length}</div>
              <div className="text-sm text-muted-foreground">NFT Certificates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {fingerprints.filter(fp => fp.is_public).length}
              </div>
              <div className="text-sm text-muted-foreground">Public Content</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="fingerprints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fingerprints">Content Fingerprints</TabsTrigger>
          <TabsTrigger value="nfts">NFT Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="fingerprints" className="space-y-4">
          {fingerprints.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No content fingerprints yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first fingerprint to protect your intellectual property
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Fingerprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {fingerprints.map((fingerprint) => (
                <Card key={fingerprint.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {fingerprint.title || 'Untitled Content'}
                        </CardTitle>
                        <CardDescription>
                          {fingerprint.description || fingerprint.content_preview}
                        </CardDescription>
                      </div>
                      <Badge variant={fingerprint.is_public ? 'default' : 'secondary'}>
                        {fingerprint.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        {fingerprint.content_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(fingerprint.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Fingerprint ID:</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded">
                        {fingerprint.fingerprint_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Content Hash:</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                        {fingerprint.content_hash}
                      </p>
                    </div>

                    {fingerprint.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {fingerprint.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => mintNFT(fingerprint.fingerprint_id)}
                        disabled={nfts.some(nft => nft.fingerprint_id === fingerprint.fingerprint_id)}
                      >
                        {nfts.some(nft => nft.fingerprint_id === fingerprint.fingerprint_id) ? (
                          <>
                            <Award className="h-4 w-4 mr-1" />
                            NFT Minted
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4 mr-1" />
                            Mint NFT
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nfts" className="space-y-4">
          {nfts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No NFT certificates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Mint NFTs from your content fingerprints to create ownership certificates
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {nfts.map((nft) => (
                <Card key={nft.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      NFT Certificate #{nft.token_id}
                    </CardTitle>
                    <CardDescription>
                      Ownership certificate for fingerprint: {nft.fingerprint_id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Token ID:</p>
                        <p className="text-muted-foreground">{nft.token_id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status:</p>
                        <Badge variant={nft.mint_status === 'minted' ? 'default' : 'secondary'}>
                          {nft.mint_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">Contract:</p>
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          {nft.contract_address}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Transaction:</p>
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          {nft.transaction_hash}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {new Date(nft.created_at).toLocaleDateString()}
                      </span>
                      {nft.minted_at && (
                        <span className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          Minted: {new Date(nft.minted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
