// Verification badge components for original content creators
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertTriangle, Copy, Crown, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CrossMatchResponse } from '@/types/cross-matching';

interface VerificationBadgeProps {
  matchResult?: CrossMatchResponse;
  isVerified?: boolean;
  isMinted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function VerificationBadge({ 
  matchResult, 
  isVerified = false,
  isMinted = false,
  size = 'md', 
  showTooltip = true,
  className = '' 
}: VerificationBadgeProps) {
  const getBadgeContent = () => {
    // Priority: Minted NFT > Verified Original > Match Status
    if (isMinted) {
      return {
        icon: Crown,
        text: 'Certified Original',
        variant: 'default' as const,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        tooltip: 'This content has been minted as an NFT certificate of ownership'
      };
    }

    if (isVerified || matchResult?.status === 'original') {
      return {
        icon: Shield,
        text: 'Verified Original',
        variant: 'secondary' as const,
        color: 'bg-green-100 text-green-800 border-green-200',
        tooltip: 'This content has been verified as original with no duplicates found'
      };
    }

    if (matchResult?.status === 'duplicate') {
      return {
        icon: Copy,
        text: 'Duplicate Detected',
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800 border-red-200',
        tooltip: `Exact or high-confidence duplicate found (${matchResult.matches[0]?.confidence}% match)`
      };
    }

    if (matchResult?.status === 'similar') {
      return {
        icon: AlertTriangle,
        text: 'Similar Content',
        variant: 'secondary' as const,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        tooltip: `Similar content detected (${matchResult.matches[0]?.confidence}% match)`
      };
    }

    return null;
  };

  const badgeContent = getBadgeContent();
  if (!badgeContent) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const BadgeComponent = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Badge 
        variant={badgeContent.variant}
        className={`${badgeContent.color} ${sizeClasses[size]} flex items-center gap-1.5 font-medium border`}
      >
        <badgeContent.icon className={iconSizes[size]} />
        {badgeContent.text}
      </Badge>
    </motion.div>
  );

  if (!showTooltip) {
    return BadgeComponent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeComponent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{badgeContent.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact inline verification status
interface VerificationStatusProps {
  matchResult?: CrossMatchResponse;
  isVerified?: boolean;
  isMinted?: boolean;
  showText?: boolean;
  className?: string;
}

export function VerificationStatus({ 
  matchResult, 
  isVerified = false,
  isMinted = false,
  showText = true,
  className = '' 
}: VerificationStatusProps) {
  const getStatusContent = () => {
    if (isMinted) {
      return {
        icon: Crown,
        text: 'Certified',
        color: 'text-purple-600'
      };
    }

    if (isVerified || matchResult?.status === 'original') {
      return {
        icon: CheckCircle,
        text: 'Original',
        color: 'text-green-600'
      };
    }

    if (matchResult?.status === 'duplicate') {
      return {
        icon: Copy,
        text: 'Duplicate',
        color: 'text-red-600'
      };
    }

    if (matchResult?.status === 'similar') {
      return {
        icon: AlertTriangle,
        text: 'Similar',
        color: 'text-yellow-600'
      };
    }

    return {
      icon: CheckCircle,
      text: 'Unverified',
      color: 'text-gray-400'
    };
  };

  const status = getStatusContent();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <status.icon className={`w-4 h-4 ${status.color}`} />
      {showText && (
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      )}
    </div>
  );
}

// Creator verification badge for profiles
interface CreatorBadgeProps {
  isVerifiedCreator?: boolean;
  originalContentCount?: number;
  mintedNFTCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CreatorBadge({ 
  isVerifiedCreator = false,
  originalContentCount = 0,
  mintedNFTCount = 0,
  size = 'md',
  className = '' 
}: CreatorBadgeProps) {
  if (!isVerifiedCreator && originalContentCount === 0 && mintedNFTCount === 0) {
    return null;
  }

  const getBadgeLevel = () => {
    if (mintedNFTCount >= 10) {
      return {
        icon: Crown,
        text: 'Elite Creator',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        tooltip: `Verified creator with ${mintedNFTCount} minted NFTs and ${originalContentCount} original works`
      };
    }

    if (mintedNFTCount >= 5) {
      return {
        icon: Verified,
        text: 'Pro Creator',
        color: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
        tooltip: `Verified creator with ${mintedNFTCount} minted NFTs and ${originalContentCount} original works`
      };
    }

    if (originalContentCount >= 5 || mintedNFTCount >= 1) {
      return {
        icon: Shield,
        text: 'Verified Creator',
        color: 'bg-gradient-to-r from-green-500 to-blue-500 text-white',
        tooltip: `Verified creator with ${originalContentCount} original works and ${mintedNFTCount} minted NFTs`
      };
    }

    return {
      icon: CheckCircle,
      text: 'Creator',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      tooltip: `Creator with ${originalContentCount} original works`
    };
  };

  const badge = getBadgeLevel();

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={className}
          >
            <Badge 
              className={`${badge.color} ${sizeClasses[size]} flex items-center gap-1.5 font-medium border-0`}
            >
              <badge.icon className={iconSizes[size]} />
              {badge.text}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{badge.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Animated verification process indicator
interface VerificationProcessProps {
  isChecking: boolean;
  result?: CrossMatchResponse;
  className?: string;
}

export function VerificationProcess({ 
  isChecking, 
  result, 
  className = '' 
}: VerificationProcessProps) {
  if (!isChecking && !result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 ${className}`}
    >
      {isChecking ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
          />
          <span className="text-sm text-gray-600">Verifying originality...</span>
        </>
      ) : result ? (
        <VerificationStatus matchResult={result} />
      ) : null}
    </motion.div>
  );
}
