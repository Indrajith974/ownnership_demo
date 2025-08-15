'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Search,
  Filter,
  Download,
  ExternalLink,
  Hash,
  Calendar,
  FileText,
  Image,
  Video,
  Music,
  Trash2,
  Eye,
  Link,
  Coins,
  TrendingUp,
  Database,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/hooks/use-vault';
import { FingerprintMetadata, ContentType } from '@/types/ownership';

const contentTypeIcons = {
  text: FileText,
  image: Image,
  video: Video,
  audio: Music
};

const contentTypeColors = {
  text: 'bg-blue-100 text-blue-800',
  image: 'bg-green-100 text-green-800',
  video: 'bg-purple-100 text-purple-800',
  audio: 'bg-orange-100 text-orange-800'
};

interface AssetCardProps {
  fingerprint: FingerprintMetadata;
  onView: (fingerprint: FingerprintMetadata) => void;
  onDelete: (fingerprintHash: string) => void;
}

function AssetCard({ fingerprint, onView, onDelete }: AssetCardProps) {
  const Icon = contentTypeIcons[fingerprint.type];
  const colorClass = contentTypeColors[fingerprint.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {fingerprint.title || fingerprint.originalFilename || 'Untitled Asset'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(fingerprint.timestamp).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {fingerprint.isMinted && (
                <Badge variant="default" className="text-xs">
                  <Coins className="w-3 h-3 mr-1" />
                  Minted
                </Badge>
              )}
              {fingerprint.verified && (
                <Shield className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Preview */}
            {fingerprint.preview && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {fingerprint.preview}
              </div>
            )}

            {/* Tags */}
            {fingerprint.tags && fingerprint.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {fingerprint.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {fingerprint.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{fingerprint.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Platform source */}
            {fingerprint.platformSource && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Link className="w-3 h-3 mr-1" />
                {fingerprint.platformSource.toUpperCase()}
                {fingerprint.platformUrl && (
                  <a
                    href={fingerprint.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Fingerprint hash */}
            <div className="flex items-center text-xs text-muted-foreground">
              <Hash className="w-3 h-3 mr-1" />
              <code className="font-mono">
                {fingerprint.fingerprintHash.slice(0, 16)}...
              </code>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(fingerprint)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                {fingerprint.isMinted && fingerprint.transactionHash && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://etherscan.io/tx/${fingerprint.transactionHash}`, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    TX
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(fingerprint.fingerprintHash)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface VaultStatsProps {
  stats: any;
}

function VaultStats({ stats }: VaultStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalFingerprints}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.mintedNFTs}</p>
              <p className="text-xs text-muted-foreground">Minted NFTs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.unmintedAssets}</p>
              <p className="text-xs text-muted-foreground">Unminted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {stats.mintedNFTs > 0 ? Math.round((stats.mintedNFTs / stats.totalFingerprints) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Minted Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MyVaultDashboard() {
  const {
    vault,
    stats,
    isLoading,
    error,
    isAuthenticated,
    currentUser,
    deleteFingerprint,
    searchFingerprints,
    getFingerprintsByType,
    getMintedNFTs,
    getUnmintedAssets
  } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFingerprint, setSelectedFingerprint] = useState<FingerprintMetadata | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Filter fingerprints based on active tab and search
  const filteredFingerprints = useMemo(() => {
    let fingerprints: FingerprintMetadata[] = [];

    switch (activeTab) {
      case 'all':
        fingerprints = vault?.fingerprints || [];
        break;
      case 'minted':
        fingerprints = getMintedNFTs();
        break;
      case 'unminted':
        fingerprints = getUnmintedAssets();
        break;
      case 'text':
      case 'image':
      case 'video':
      case 'audio':
        fingerprints = getFingerprintsByType(activeTab);
        break;
      default:
        fingerprints = vault?.fingerprints || [];
    }

    if (searchQuery.trim()) {
      fingerprints = searchFingerprints(searchQuery);
    }

    return fingerprints.sort((a, b) => b.timestamp - a.timestamp);
  }, [vault, activeTab, searchQuery, getMintedNFTs, getUnmintedAssets, getFingerprintsByType, searchFingerprints]);

  const handleDeleteFingerprint = async (fingerprintHash: string) => {
    if (confirm('Are you sure you want to delete this fingerprint? This action cannot be undone.')) {
      const result = await deleteFingerprint(fingerprintHash);
      if (!result.success) {
        alert(`Failed to delete: ${result.error.message}`);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Access Your Vault</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet or sign in with email to view your ownership vault
            </p>
            <div className="space-x-4">
              <Button>Connect Wallet</Button>
              <Button variant="outline">Sign In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your vault...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Shield className="w-8 h-8 mr-3" />
              My Vault
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your digital ownership certificates and NFTs
            </p>
            {currentUser && (
              <div>
                <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                <p>
                  {currentUser.type === 'wallet' ? '🔗' : '📧'} {currentUser.identifier}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Vault Secured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && <VaultStats stats={stats} />}

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({vault?.totalAssets || 0})</TabsTrigger>
          <TabsTrigger value="minted">Minted ({stats?.mintedNFTs || 0})</TabsTrigger>
          <TabsTrigger value="unminted">Unminted ({stats?.unmintedAssets || 0})</TabsTrigger>
          <TabsTrigger value="text">Text ({stats?.contentTypes?.text || 0})</TabsTrigger>
          <TabsTrigger value="image">Images ({stats?.contentTypes?.image || 0})</TabsTrigger>
          <TabsTrigger value="video">Videos ({stats?.contentTypes?.video || 0})</TabsTrigger>
          <TabsTrigger value="audio">Audio ({stats?.contentTypes?.audio || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredFingerprints.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No assets match your search criteria.' : 'Start by uploading content or importing from social platforms.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredFingerprints.map((fingerprint) => (
                  <AssetCard
                    key={fingerprint.id}
                    fingerprint={fingerprint}
                    onView={setSelectedFingerprint}
                    onDelete={handleDeleteFingerprint}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Detail Modal */}
      <AnimatePresence>
        {selectedFingerprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedFingerprint(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold">Asset Details</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFingerprint(null)}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Title:</span>
                        <p>{selectedFingerprint.title || 'Untitled'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="capitalize">{selectedFingerprint.type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p>{new Date(selectedFingerprint.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p>{selectedFingerprint.isMinted ? 'Minted' : 'Unminted'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Fingerprint</h3>
                    <code className="text-xs bg-muted p-2 rounded block break-all">
                      {selectedFingerprint.fingerprintHash}
                    </code>
                  </div>

                  {selectedFingerprint.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm">{selectedFingerprint.description}</p>
                    </div>
                  )}

                  {selectedFingerprint.tags && selectedFingerprint.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedFingerprint.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFingerprint.isMinted && (
                    <div>
                      <h3 className="font-semibold mb-2">NFT Information</h3>
                      <div className="space-y-2 text-sm">
                        {selectedFingerprint.nftTokenId && (
                          <div>
                            <span className="text-muted-foreground">Token ID:</span>
                            <p>{selectedFingerprint.nftTokenId}</p>
                          </div>
                        )}
                        {selectedFingerprint.contractAddress && (
                          <div>
                            <span className="text-muted-foreground">Contract:</span>
                            <p className="font-mono text-xs">{selectedFingerprint.contractAddress}</p>
                          </div>
                        )}
                        {selectedFingerprint.transactionHash && (
                          <div>
                            <span className="text-muted-foreground">Transaction:</span>
                            <a
                              href={`https://etherscan.io/tx/${selectedFingerprint.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                            >
                              {selectedFingerprint.transactionHash}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
