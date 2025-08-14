'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { useAccount } from 'wagmi';
import { 
  Award, 
  ExternalLink, 
  Search, 
  Filter, 
  Calendar,
  Hash,
  Wallet,
  Eye,
  RefreshCw,
  Zap
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface NFTCertificate {
  id: string;
  fingerprint_id: string;
  content_hash: string;
  token_id?: number;
  contract_address?: string;
  chain_id: number;
  owner_address: string;
  author_handle?: string;
  content_type: string;
  content_preview: string;
  ipfs_metadata_uri?: string;
  transaction_hash?: string;
  mint_status: string;
  created_at: string;
  minted_at?: string;
  opensea_url?: string;
  blockchain_explorer_url?: string;
}

const CHAIN_NAMES: { [key: number]: string } = {
  137: 'Polygon',
  80001: 'Polygon Mumbai',
  8453: 'Base',
  84532: 'Base Sepolia',
};

const STATUS_COLORS: { [key: string]: string } = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'minting': 'bg-blue-100 text-blue-800',
  'minted': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'created': 'bg-gray-100 text-gray-800',
};

export default function CertificatesPage() {
  const { address, isConnected } = useAccount();
  const { profile, isAuthenticated } = useSiweAuth();
  const [certificates, setCertificates] = useState<NFTCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (isAuthenticated && address) {
      fetchCertificates();
    }
  }, [isAuthenticated, address]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/nft/certificates/by-owner/${address}`);
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      } else {
        throw new Error('Failed to fetch certificates');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const retryMint = async (certificateId: string) => {
    try {
      const response = await fetch(`/api/nft/retry-mint/${certificateId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: 'Minting Retry Initiated',
          description: 'Your certificate minting has been queued for retry.',
        });
        fetchCertificates(); // Refresh the list
      } else {
        throw new Error('Retry failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry minting',
        variant: 'destructive',
      });
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.content_preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.content_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cert.author_handle && cert.author_handle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || cert.content_type === filterType;
    const matchesStatus = filterStatus === 'all' || cert.mint_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center">
              Please connect your wallet to view your ownership certificates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground text-center">
              Please sign in with your wallet to access your certificates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Award className="w-8 h-8 mr-3" />
            My Certificates
          </h1>
          <p className="text-muted-foreground">
            Your cryptographic proof of creation NFTs
          </p>
        </div>
        <Button onClick={fetchCertificates} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Certificates</p>
                <p className="text-2xl font-bold">{certificates.length}</p>
              </div>
              <Award className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Minted NFTs</p>
                <p className="text-2xl font-bold">
                  {certificates.filter(c => c.mint_status === 'minted').length}
                </p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Mints</p>
                <p className="text-2xl font-bold">
                  {certificates.filter(c => ['pending', 'minting'].includes(c.mint_status)).length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Content Types</p>
                <p className="text-2xl font-bold">
                  {new Set(certificates.map(c => c.content_type)).size}
                </p>
              </div>
              <Hash className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="code">Code</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="minted">Minted</option>
                <option value="pending">Pending</option>
                <option value="minting">Minting</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading certificates...</span>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Certificates Found</h3>
            <p className="text-muted-foreground text-center">
              {certificates.length === 0 
                ? "You haven't created any certificates yet. Start by fingerprinting your content!"
                : "No certificates match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getContentTypeIcon(certificate.content_type)}</span>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {certificate.content_type.toUpperCase()} Certificate
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {CHAIN_NAMES[certificate.chain_id] || `Chain ${certificate.chain_id}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs ${STATUS_COLORS[certificate.mint_status] || 'bg-gray-100 text-gray-800'}`}
                    variant="secondary"
                  >
                    {certificate.mint_status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Content Preview */}
                <div>
                  <p className="text-sm font-medium mb-1">Content Preview</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {certificate.content_preview}
                  </p>
                </div>

                {/* Content Hash */}
                <div>
                  <p className="text-sm font-medium mb-1">Content Hash</p>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {certificate.content_hash.slice(0, 32)}...
                  </p>
                </div>

                {/* Token Info */}
                {certificate.token_id && (
                  <div>
                    <p className="text-sm font-medium mb-1">Token ID</p>
                    <p className="text-xs text-muted-foreground">#{certificate.token_id}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    Created: {formatDate(certificate.created_at)}
                  </div>
                  {certificate.minted_at && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Award className="w-3 h-3 mr-1" />
                      Minted: {formatDate(certificate.minted_at)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {certificate.mint_status === 'failed' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => retryMint(certificate.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry Mint
                    </Button>
                  )}
                  
                  {certificate.opensea_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(certificate.opensea_url, '_blank')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      OpenSea
                    </Button>
                  )}
                  
                  {certificate.blockchain_explorer_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(certificate.blockchain_explorer_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Explorer
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/proof/${certificate.content_hash}`, '_blank')}
                  >
                    <Award className="w-3 h-3 mr-1" />
                    Proof
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
