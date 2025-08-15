'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context-optimized';
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
  1: 'Ethereum',
  11155111: 'Sepolia',
};

const STATUS_COLORS: { [key: string]: string } = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'minted': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'created': 'bg-gray-100 text-gray-800',
};

export default function CertificatesPage() {
  const { user, isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<NFTCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCertificates();
    }
  }, [isAuthenticated, user]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/nfts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      } else {
        throw new Error('Failed to fetch certificates');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.content_preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.author_handle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.content_hash.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || cert.content_type === filterType;
    const matchesStatus = filterStatus === 'all' || cert.mint_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Please Login</h2>
            <p className="text-muted-foreground text-center">
              Please log in to view your ownership certificates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ownership Certificates</h1>
          <p className="text-muted-foreground">
            Your verified content ownership on the blockchain
          </p>
        </div>
        <Button onClick={fetchCertificates} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
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
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="created">Created</option>
                <option value="pending">Pending</option>
                <option value="minted">Minted</option>
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
        </div>
      ) : filteredCertificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Certificates Found</h3>
            <p className="text-muted-foreground text-center">
              {certificates.length === 0 
                ? "You haven't created any ownership certificates yet."
                : "No certificates match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {cert.content_type}
                    </Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[cert.mint_status]}`}>
                      {cert.mint_status}
                    </Badge>
                  </div>
                  {cert.token_id && (
                    <Badge variant="secondary" className="text-xs">
                      #{cert.token_id}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg line-clamp-2">
                  {cert.content_preview || 'Untitled Content'}
                </CardTitle>
                <CardDescription className="flex items-center text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(cert.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Content Hash */}
                <div className="flex items-center space-x-2 text-sm">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {cert.content_hash.slice(0, 16)}...
                  </code>
                </div>

                {/* Chain Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Chain:</span>
                  <Badge variant="outline" className="text-xs">
                    {CHAIN_NAMES[cert.chain_id] || `Chain ${cert.chain_id}`}
                  </Badge>
                </div>

                {/* Author */}
                {cert.author_handle && (
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {cert.author_handle[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {cert.author_handle}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  {cert.opensea_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={cert.opensea_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-3 h-3 mr-1" />
                        View NFT
                      </a>
                    </Button>
                  )}
                  {cert.blockchain_explorer_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={cert.blockchain_explorer_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Explorer
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
