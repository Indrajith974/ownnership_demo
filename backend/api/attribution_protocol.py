"""
Attribution Chain Protocol
Core protocol for content ownership, claims, and challenges
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import uuid
from sqlalchemy.orm import Session

from models import ContentFingerprint, Attribution, Creator
from database import get_db, get_redis

class ClaimStatus(Enum):
    PENDING = "pending"
    VERIFIED = "verified" 
    DISPUTED = "disputed"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class ChallengeType(Enum):
    PRIOR_ART = "prior_art"
    FALSE_CLAIM = "false_claim"
    OWNERSHIP_DISPUTE = "ownership_dispute"
    SIMILARITY_DISPUTE = "similarity_dispute"

@dataclass
class OwnershipClaim:
    """Represents a claim of ownership for content"""
    claim_id: str
    content_fingerprint_id: str
    claimant_id: str
    claim_type: str  # "original_creator", "derivative_work", "fair_use"
    evidence: Dict[str, Any]
    timestamp: datetime
    status: ClaimStatus
    confidence_score: float
    
class AttributionProtocol:
    """
    Core attribution protocol for The Ownership Layer
    Handles ownership claims, challenges, and resolution
    """
    
    def __init__(self):
        self.redis = get_redis()
        
    def create_ownership_claim(
        self, 
        fingerprint_id: str, 
        claimant_id: str, 
        claim_type: str,
        evidence: Dict[str, Any],
        db: Session
    ) -> OwnershipClaim:
        """
        Create a new ownership claim for content
        """
        claim_id = f"claim_{uuid.uuid4().hex[:16]}"
        
        # Validate the fingerprint exists
        fingerprint = db.query(ContentFingerprint).filter(
            ContentFingerprint.fingerprint_id == fingerprint_id
        ).first()
        
        if not fingerprint:
            raise ValueError(f"Fingerprint {fingerprint_id} not found")
        
        # Validate claimant exists
        claimant = db.query(Creator).filter(Creator.id == claimant_id).first()
        if not claimant:
            raise ValueError(f"Claimant {claimant_id} not found")
        
        # Calculate confidence score based on evidence
        confidence_score = self._calculate_claim_confidence(
            fingerprint, claimant, evidence, db
        )
        
        # Create claim record
        claim = OwnershipClaim(
            claim_id=claim_id,
            content_fingerprint_id=fingerprint_id,
            claimant_id=claimant_id,
            claim_type=claim_type,
            evidence=evidence,
            timestamp=datetime.utcnow(),
            status=ClaimStatus.PENDING,
            confidence_score=confidence_score
        )
        
        # Store in database and cache
        self._store_claim(claim, db)
        
        # Auto-verify high confidence claims
        if confidence_score > 0.95:
            self._auto_verify_claim(claim, db)
        
        return claim
    
    def challenge_ownership(
        self,
        claim_id: str,
        challenger_id: str,
        challenge_type: ChallengeType,
        evidence: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Challenge an existing ownership claim
        """
        # Get the original claim
        claim = self._get_claim(claim_id, db)
        if not claim:
            raise ValueError(f"Claim {claim_id} not found")
        
        if claim.status != ClaimStatus.PENDING and claim.status != ClaimStatus.VERIFIED:
            raise ValueError(f"Cannot challenge claim with status {claim.status}")
        
        challenge_id = f"challenge_{uuid.uuid4().hex[:16]}"
        
        challenge_record = {
            "challenge_id": challenge_id,
            "claim_id": claim_id,
            "challenger_id": challenger_id,
            "challenge_type": challenge_type.value,
            "evidence": evidence,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "pending"
        }
        
        # Store challenge
        if self.redis:
            self.redis.setex(
                f"challenge:{challenge_id}",
                timedelta(days=30).total_seconds(),
                json.dumps(challenge_record, default=str)
            )
        
        # Update claim status to disputed
        claim.status = ClaimStatus.DISPUTED
        self._store_claim(claim, db)
        
        # Initiate resolution process
        self._initiate_dispute_resolution(claim_id, challenge_id, db)
        
        return challenge_record
    
    def resolve_dispute(
        self,
        claim_id: str,
        resolution: str,
        resolver_id: str,
        evidence: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Resolve a disputed ownership claim
        """
        claim = self._get_claim(claim_id, db)
        if not claim:
            raise ValueError(f"Claim {claim_id} not found")
        
        if claim.status != ClaimStatus.DISPUTED:
            raise ValueError(f"Claim {claim_id} is not in disputed status")
        
        # Update claim status based on resolution
        if resolution == "uphold":
            claim.status = ClaimStatus.VERIFIED
        elif resolution == "reject":
            claim.status = ClaimStatus.REJECTED
        else:
            claim.status = ClaimStatus.RESOLVED
        
        # Store resolution
        resolution_record = {
            "resolution_id": f"resolution_{uuid.uuid4().hex[:16]}",
            "claim_id": claim_id,
            "resolver_id": resolver_id,
            "resolution": resolution,
            "evidence": evidence,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if self.redis:
            self.redis.setex(
                f"resolution:{claim_id}",
                timedelta(days=365).total_seconds(),
                json.dumps(resolution_record, default=str)
            )
        
        # Update claim
        self._store_claim(claim, db)
        
        # Process rewards if claim is verified
        if claim.status == ClaimStatus.VERIFIED:
            self._process_ownership_rewards(claim, db)
        
        return resolution_record
    
    def get_attribution_chain(self, fingerprint_id: str, db: Session) -> Dict[str, Any]:
        """
        Get the complete attribution chain for content
        """
        fingerprint = db.query(ContentFingerprint).filter(
            ContentFingerprint.fingerprint_id == fingerprint_id
        ).first()
        
        if not fingerprint:
            raise ValueError(f"Fingerprint {fingerprint_id} not found")
        
        # Get all attributions for this content
        attributions = db.query(Attribution).filter(
            Attribution.original_content_id == fingerprint.id
        ).all()
        
        # Get ownership claims
        claims = self._get_claims_for_content(fingerprint_id, db)
        
        # Build attribution chain
        chain = {
            "fingerprint_id": fingerprint_id,
            "original_creator": {
                "id": str(fingerprint.creator_id),
                "name": fingerprint.creator.display_name if fingerprint.creator else "Unknown"
            },
            "created_at": fingerprint.created_at.isoformat(),
            "content_type": fingerprint.content_type,
            "ownership_claims": [self._serialize_claim(claim) for claim in claims],
            "attributions": [
                {
                    "id": str(attr.id),
                    "reuse_url": attr.reuse_url,
                    "platform": attr.reuse_platform,
                    "similarity_score": attr.similarity_score,
                    "detected_at": attr.detected_at.isoformat(),
                    "status": attr.status,
                    "is_credited": attr.is_credited,
                    "reward_amount": attr.reward_amount
                }
                for attr in attributions
            ],
            "total_attributions": len(attributions),
            "total_rewards": sum(attr.reward_amount for attr in attributions),
            "verification_status": self._get_verification_status(fingerprint_id, db)
        }
        
        return chain
    
    def _calculate_claim_confidence(
        self, 
        fingerprint: ContentFingerprint, 
        claimant: Creator, 
        evidence: Dict[str, Any],
        db: Session
    ) -> float:
        """
        Calculate confidence score for an ownership claim
        """
        confidence = 0.0
        
        # Base confidence if claimant is the original creator in database
        if fingerprint.creator_id == claimant.id:
            confidence += 0.8
        
        # Evidence-based scoring
        if "timestamp_proof" in evidence:
            confidence += 0.1
        
        if "platform_verification" in evidence:
            confidence += 0.05
        
        if "digital_signature" in evidence:
            confidence += 0.05
        
        # Historical reputation
        creator_stats = db.query(Creator).filter(Creator.id == claimant.id).first()
        if creator_stats and creator_stats.total_creations > 10:
            reputation_score = min(creator_stats.total_creations / 100, 0.1)
            confidence += reputation_score
        
        return min(confidence, 1.0)
    
    def _store_claim(self, claim: OwnershipClaim, db: Session):
        """Store claim in database and cache"""
        # Store in Redis cache for fast access
        if self.redis:
            claim_data = {
                "claim_id": claim.claim_id,
                "content_fingerprint_id": claim.content_fingerprint_id,
                "claimant_id": claim.claimant_id,
                "claim_type": claim.claim_type,
                "evidence": claim.evidence,
                "timestamp": claim.timestamp.isoformat(),
                "status": claim.status.value,
                "confidence_score": claim.confidence_score
            }
            
            self.redis.setex(
                f"claim:{claim.claim_id}",
                timedelta(days=365).total_seconds(),
                json.dumps(claim_data, default=str)
            )
    
    def _get_claim(self, claim_id: str, db: Session) -> Optional[OwnershipClaim]:
        """Retrieve claim from cache or database"""
        if self.redis:
            claim_data = self.redis.get(f"claim:{claim_id}")
            if claim_data:
                data = json.loads(claim_data)
                return OwnershipClaim(
                    claim_id=data["claim_id"],
                    content_fingerprint_id=data["content_fingerprint_id"],
                    claimant_id=data["claimant_id"],
                    claim_type=data["claim_type"],
                    evidence=data["evidence"],
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    status=ClaimStatus(data["status"]),
                    confidence_score=data["confidence_score"]
                )
        
        return None
    
    def _auto_verify_claim(self, claim: OwnershipClaim, db: Session):
        """Auto-verify high confidence claims"""
        claim.status = ClaimStatus.VERIFIED
        self._store_claim(claim, db)
        
        # Process immediate rewards
        self._process_ownership_rewards(claim, db)
    
    def _initiate_dispute_resolution(self, claim_id: str, challenge_id: str, db: Session):
        """Initiate dispute resolution process"""
        # For now, this is a placeholder for future dispute resolution mechanisms
        # Could involve community voting, expert panels, or automated resolution
        pass
    
    def _process_ownership_rewards(self, claim: OwnershipClaim, db: Session):
        """Process rewards for verified ownership claims"""
        # This will be implemented with the token system
        pass
    
    def _get_claims_for_content(self, fingerprint_id: str, db: Session) -> List[OwnershipClaim]:
        """Get all claims for a piece of content"""
        claims = []
        if self.redis:
            # In a real implementation, we'd have an index of claims by content
            # For now, this is a placeholder
            pass
        return claims
    
    def _serialize_claim(self, claim: OwnershipClaim) -> Dict[str, Any]:
        """Serialize claim for API response"""
        return {
            "claim_id": claim.claim_id,
            "claimant_id": claim.claimant_id,
            "claim_type": claim.claim_type,
            "timestamp": claim.timestamp.isoformat(),
            "status": claim.status.value,
            "confidence_score": claim.confidence_score
        }
    
    def _get_verification_status(self, fingerprint_id: str, db: Session) -> str:
        """Get overall verification status for content"""
        # Check if there are verified ownership claims
        claims = self._get_claims_for_content(fingerprint_id, db)
        
        if any(claim.status == ClaimStatus.VERIFIED for claim in claims):
            return "verified"
        elif any(claim.status == ClaimStatus.DISPUTED for claim in claims):
            return "disputed"
        elif any(claim.status == ClaimStatus.PENDING for claim in claims):
            return "pending"
        else:
            return "unverified"

# Global protocol instance
attribution_protocol = AttributionProtocol()
