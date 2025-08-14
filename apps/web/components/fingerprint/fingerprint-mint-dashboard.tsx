'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UploadAndFingerprint } from './upload-and-fingerprint';
import { NFTProofCard } from './nft-proof-card';
import { MintButton } from '../nft/mint-button';
import { YouTubeImport } from '@/components/integrations/youtube-import';
import { InstagramImport } from '@/components/integrations/instagram-import';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { useAccount } from 'wagmi';
import { useVault } from '@/hooks/use-vault';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Wallet,
  User,
  Zap,
  Trophy,
  Upload,
  Youtube,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FingerprintResult } from '@/utils/fingerprint-engine';

interface DashboardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

export function FingerprintMintDashboard() {
  const { address, isConnected } = useAccount();
  const { isSignedIn, signIn, signOut, isLoading: authLoading } = useSiweAuth();
  const { storeFingerprint, updateFingerprintMinting } = useVault();
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fingerprintResult, setFingerprintResult] = useState<FingerprintResult | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);
  const [mintTransactionHash, setMintTransactionHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [mintTimestamp, setMintTimestamp] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'instagram'>('upload');
  const [youtubeData, setYoutubeData] = useState<any>(null);
  const [instagramData, setInstagramData] = useState<any>(null);

  const handleFingerprintGenerated = async (result: FingerprintResult, sourceData?: any) => {
    try {
      await storeFingerprint({
        hash: result.hash,
        type: activeTab === 'upload' ? (currentFile?.type.startsWith('image/') ? 'image' : 
               currentFile?.type.startsWith('audio/') ? 'audio' : 
               currentFile?.type.startsWith('video/') ? 'video' : 'text') : activeTab,
        metadata: {
          filename: currentFile?.name,
          size: currentFile?.size,
          mimeType: currentFile?.type,
          ...sourceData
        },
        source: activeTab,
        userIdentifier: address || 'unknown'
      });
    } catch (error) {
      console.error('Failed to store fingerprint in vault:', error);
    }
  };

  const handleMintSuccess = async (tokenId: bigint, txHash: string, contractAddr?: string) => {
    if (fingerprintResult) {
      try {
        await updateFingerprintMinting(fingerprintResult.hash, {
          tokenId: tokenId.toString(),
          transactionHash: txHash,
          contractAddress: contractAddr || '',
          mintedAt: Date.now(),
          blockchainNetwork: 'base-sepolia'
        });
      } catch (error) {
        console.error('Failed to update vault with minting info:', error);
      }
    }
    
    setMintedTokenId(tokenId);
    setMintTransactionHash(txHash);
    if (contractAddr) setContractAddress(contractAddr);
    setMintTimestamp(Date.now());
  };

  const getCurrentStep = (): number => {
    if (!isConnected) return 1;
    if (!isSignedIn) return 2;
    if (!fingerprintResult) return 3;
    if (!mintedTokenId) return 4;
    return 5;
  };

  const currentStep = getCurrentStep();

  const steps: DashboardStep[] = [
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Connect your Web3 wallet to get started',
      icon: Wallet,
      completed: isConnected
    },
    {
      id: 2,
      title: 'Sign In',
      description: 'Authenticate with your wallet signature',
      icon: User,
      completed: isSignedIn
    },
    {
      id: 3,
      title: 'Upload & Fingerprint',
      description: 'Upload your content and generate cryptographic proof',
      icon: Sparkles,
      completed: !!fingerprintResult
    },
    {
      id: 4,
      title: 'Mint NFT Certificate',
      description: 'Create your blockchain ownership certificate',
      icon: Zap,
      completed: !!mintedTokenId
    },
    {
      id: 5,
      title: 'Proof Complete',
      description: 'Your ownership is now verified on-chain',
      icon: Trophy,
      completed: !!mintedTokenId
    }
  ];

  const handleFileFingerprint = async (result: FingerprintResult) => {
    setFingerprintResult(result);
    await handleFingerprintGenerated(result);
  };

  const handleYouTubeData = async (data: any, fingerprint: string) => {
    setYoutubeData(data);
    const result = {
      hash: fingerprint,
      similarity: 1.0,
      metadata: {
        title: data.title,
        description: data.description,
        channel: data.channel,
        duration: data.duration,
        uploadDate: data.uploadDate,
        tags: data.tags
      }
    };
    setFingerprintResult(result);
    await handleFingerprintGenerated(result, data);
  };

  const handleInstagramData = async (data: any, fingerprint: string) => {
    setInstagramData(data);
    const result = {
      hash: fingerprint,
      similarity: 1.0,
      metadata: {
        caption: data.caption,
        hashtags: data.hashtags,
        likes: data.likes,
        username: data.username,
        timestamp: data.timestamp,
        postType: data.postType
      }
    };
    setFingerprintResult(result);
    await handleFingerprintGenerated(result, data);
  };

  const handleTabChange = (tab: 'upload' | 'youtube' | 'instagram') => {
    setActiveTab(tab);
    // Clear data when switching tabs
    if (tab === 'upload') {
      setYoutubeData(null);
      setInstagramData(null);
    } else if (tab === 'youtube') {
      setCurrentFile(null);
      setInstagramData(null);
    } else if (tab === 'instagram') {
      setCurrentFile(null);
    setFingerprintResult(null);
    setMintedTokenId(null);
    setMintTransactionHash(null);
    setContractAddress(null);
    setMintTimestamp(null);
    setYoutubeData(null);
    setInstagramData(null);
  };

  const resetDashboard = () => {
    setCurrentFile(null);
    setFingerprintResult(null);
    setMintedTokenId(null);
    setMintTransactionHash(null);
    setContractAddress(null);
    setMintTimestamp(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Sparkles className="w-12 h-12 text-purple-600" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Fingerprint & Mint Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload any media, generate cryptographic proof, and mint your ownership NFT
            </p>
          </div>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>
              Follow these steps to create your ownership certificate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = step.completed;
                
                return (
                  <div key={step.id} className="flex items-center space-x-4 flex-1">
                    <div className="flex flex-col items-center space-y-2 min-w-0">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCompleted ? 'bg-green-500 text-white' : 
                          isActive ? 'bg-primary text-primary-foreground' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground hidden md:block">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Upload & Mint */}
        <div className="space-y-6">
          {/* Upload Methods - Tabbed Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Create Your Ownership Certificate</CardTitle>
                <CardDescription>
                  Choose how you want to import your content
                </CardDescription>
                
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={activeTab === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTabChange('upload')}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </Button>
                  <Button
                    variant={activeTab === 'youtube' ? 'default' : 'outline'}
                    onClick={() => handleTabChange('youtube')}
                    className="flex items-center space-x-2"
                  >
                    <Youtube className="w-4 h-4" />
                    <span>YouTube</span>
                  </Button>
                  <Button
                    variant={activeTab === 'instagram' ? 'default' : 'outline'}
                    onClick={() => handleTabChange('instagram')}
                    className="flex items-center space-x-2"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <UploadAndFingerprint
                        onFingerprintComplete={handleFingerprintComplete}
                        onError={(error) => console.error('Fingerprint error:', error)}
                        maxFileSize={50}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="youtube"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {activeTab === 'youtube' && (
                        <YouTubeImport
                          onDataFetched={handleYouTubeData}
                          onError={handleYouTubeError}
                        />
                      )}
                      {activeTab === 'instagram' && (
                        <InstagramImport
                          onDataFetched={handleInstagramData}
                          onError={handleInstagramError}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mint Section */}
          <AnimatePresence>
            {fingerprintResult && (currentFile || youtubeData || instagramData) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Mint Ownership Certificate
                    </CardTitle>
                    <CardDescription>
                      Create your blockchain-verified ownership NFT
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mint Summary */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Content:</span>
                        <span className="text-sm text-muted-foreground">
                          {currentFile ? currentFile.name : youtubeData?.title || instagramData?.caption || 'Social Media Content'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Source:</span>
                        <Badge variant="outline" className="text-xs">
                          {currentFile ? 'FILE UPLOAD' : youtubeData ? 'YOUTUBE' : 'INSTAGRAM'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Type:</span>
                        <Badge variant="outline" className="text-xs">
                          {fingerprintResult.contentType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Hash:</span>
                        <code className="text-xs text-muted-foreground">
                          {fingerprintResult.hash.slice(0, 16)}...
                        </code>
                      </div>
                      {youtubeData && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Channel:</span>
                            <span className="text-sm text-muted-foreground">
                              {youtubeData.channelTitle}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Published:</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(youtubeData.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      )}
                      {instagramData && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Username:</span>
                            <span className="text-sm text-muted-foreground">
                              @{instagramData.username}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Posted:</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(instagramData.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Likes:</span>
                            <span className="text-sm text-muted-foreground">
                              {instagramData.likesCount?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Mint Button */}
                    <MintButton
                      contentHash={fingerprintResult.hash}
                      contentType={fingerprintResult.contentType}
                      contentPreview={
                        fingerprintResult.metadata.preview || 
                        currentFile?.name || 
                        youtubeData?.title || 
                        instagramData?.caption || 
                        'Content'
                      }
                      authorHandle={profile?.handle}
                      tags={fingerprintResult.metadata.features || youtubeData?.tags || instagramData?.hashtags || []}
                      metadataURI={`ipfs://metadata/${fingerprintResult.hash}`}
                      simHash={fingerprintResult.simHash}
                      onMintSuccess={handleMintSuccess}
                      onMintError={handleMintError}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Proof Display */}
        <div className="space-y-6">
          <AnimatePresence>
            {mintedTokenId && fingerprintResult && currentFile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <NFTProofCard
                  fingerprintResult={fingerprintResult}
                  file={currentFile}
                  tokenId={mintedTokenId}
                  transactionHash={mintTransactionHash || undefined}
                  contractAddress={contractAddress || undefined}
                  authorHandle={profile?.handle}
                  mintTimestamp={mintTimestamp || undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions Card */}
          {!mintedTokenId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload Your Content</p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop any file - text, code, images, audio, or video
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Generate Fingerprint</p>
                        <p className="text-xs text-muted-foreground">
                          Our AI creates a unique cryptographic signature of your content
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Mint NFT Certificate</p>
                        <p className="text-xs text-muted-foreground">
                          Create a permanent, verifiable ownership record on the blockchain
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">4</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Prove Ownership</p>
                        <p className="text-xs text-muted-foreground">
                          Share your proof with anyone - it's permanently verified
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Supported File Types:</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">Text</Badge>
                      <Badge variant="outline" className="text-xs">Code</Badge>
                      <Badge variant="outline" className="text-xs">Images</Badge>
                      <Badge variant="outline" className="text-xs">Audio</Badge>
                      <Badge variant="outline" className="text-xs">Video</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Reset Button */}
      <AnimatePresence>
        {mintedTokenId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <Button
              variant="outline"
              onClick={resetDashboard}
              className="mx-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create Another Certificate
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
