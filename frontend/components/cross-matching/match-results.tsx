// UI components for displaying cross-matching results
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Copy, 
  Clock, 
  User, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CrossMatchResponse, MatchResult } from '@/types/cross-matching';

interface MatchResultsProps {
  result: CrossMatchResponse;
  isLoading?: boolean;
  onProceed?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export function MatchResults({ 
  result, 
  isLoading = false, 
  onProceed, 
  onCancel,
  showActions = true 
}: MatchResultsProps) {
  if (isLoading) {
    return <MatchResultsSkeleton />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'original':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'duplicate':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'similar':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'original':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'duplicate':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'similar':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getStatusMessage = (status: string, matchCount: number) => {
    switch (status) {
      case 'original':
        return 'This content appears to be original. No duplicates found.';
      case 'duplicate':
        return `Exact or high-confidence duplicate detected. Found ${matchCount} matching ${matchCount === 1 ? 'asset' : 'assets'}.`;
      case 'similar':
        return `Similar content found. Found ${matchCount} potentially related ${matchCount === 1 ? 'asset' : 'assets'}.`;
      default:
        return 'Unable to determine originality status.';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Status Overview */}
      <Card className={`border-2 ${getStatusColor(result.status)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon(result.status)}
            <span className="capitalize">{result.status} Content</span>
            {result.status === 'original' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Shield className="w-3 h-3 mr-1" />
                Verified Original
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-3">
            {getStatusMessage(result.status, result.totalMatches)}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Processed in {result.processingTime}ms</span>
            <span>•</span>
            <span>{result.totalMatches} matches found</span>
          </div>

          {result.recommendations?.warningMessage && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {result.recommendations.warningMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Match Details */}
      <AnimatePresence>
        {result.matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Matching Assets ({result.matches.length})
            </h3>
            
            {result.matches.map((match, index) => (
              <MatchCard key={match.assetId} match={match} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {showActions && result.recommendations && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 pt-4"
        >
          {result.recommendations.shouldProceed ? (
            <Button onClick={onProceed} className="flex-1">
              {result.status === 'similar' ? 'Proceed Anyway' : 'Continue'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={onCancel} className="flex-1">
              Cancel Submission
            </Button>
          )}
          
          {result.status !== 'original' && (
            <Button variant="outline" onClick={onCancel}>
              Review & Edit
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

interface MatchCardProps {
  match: MatchResult;
  index: number;
}

function MatchCard({ match, index }: MatchCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchTypeColor = (matchType: string) => {
    return matchType === 'exact' ? 'text-red-600' : 'text-yellow-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant={match.matchType === 'exact' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {match.matchType === 'exact' ? 'Exact Match' : 'Similar'}
                </Badge>
                <span className={`font-semibold ${getMatchTypeColor(match.matchType)}`}>
                  {match.confidence}% match
                </span>
              </div>
              
              {match.metadata?.title && (
                <h4 className="font-medium text-sm mb-1">{match.metadata.title}</h4>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {match.ownerWallet ? 
                    `${match.ownerWallet.slice(0, 6)}...${match.ownerWallet.slice(-4)}` : 
                    match.ownerEmail
                  }
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(match.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Progress value={match.confidence} className="w-20 h-2" />
              
              {match.metadata?.mintedTokenId && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  NFT Minted
                </Badge>
              )}
            </div>
          </div>

          {match.metadata?.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {match.metadata.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2 text-xs text-gray-500">
              <span>{match.metadata?.contentType}</span>
              {match.metadata?.fileSize && (
                <>
                  <span>•</span>
                  <span>{(match.metadata.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                </>
              )}
              {match.hammingDistance !== undefined && (
                <>
                  <span>•</span>
                  <span>HD: {match.hammingDistance}</span>
                </>
              )}
            </div>

            <Button variant="ghost" size="sm" className="h-6 px-2">
              <ExternalLink className="w-3 h-3 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MatchResultsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 space-y-2">
                <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="w-20 h-2 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact version for inline display
interface CompactMatchResultsProps {
  result: CrossMatchResponse;
  className?: string;
}

export function CompactMatchResults({ result, className = '' }: CompactMatchResultsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'original':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'duplicate':
        return <Copy className="w-4 h-4 text-red-500" />;
      case 'similar':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon(result.status)}
      <span className="text-sm font-medium capitalize">{result.status}</span>
      {result.totalMatches > 0 && (
        <Badge variant="secondary" className="text-xs">
          {result.totalMatches} matches
        </Badge>
      )}
    </div>
  );
}
