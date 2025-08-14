"""
Creator ID System for The Ownership Layer
Universal creator identity and API system
"""

import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import uuid
import jwt
from sqlalchemy.orm import Session

from models import Creator, ContentFingerprint, Attribution, APIUsage
from database import get_redis

@dataclass
class CreatorProfile:
    """Complete creator profile with verification status"""
    creator_id: str
    username: str
    display_name: str
    email: str
    avatar_url: Optional[str]
    wallet_address: Optional[str]
    verification_status: str
    reputation_score: float
    total_creations: int
    total_views: int
    total_attributions: int
    total_earnings: float
    social_links: Dict[str, str]
    api_key: str
    created_at: datetime
    last_active: datetime

@dataclass
class APICredentials:
    """API credentials for creator integration"""
    api_key: str
    secret_key: str
    creator_id: str
    permissions: List[str]
    rate_limit: int
    expires_at: Optional[datetime]
    created_at: datetime

class CreatorIDSystem:
    """
    Universal Creator ID and API system
    Handles creator verification, API keys, and cross-platform integration
    """
    
    def __init__(self):
        self.redis = get_redis()
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        
    def create_creator_id(
        self, 
        email: str, 
        username: str, 
        display_name: str,
        wallet_address: Optional[str] = None,
        social_links: Optional[Dict[str, str]] = None,
        db: Session = None
    ) -> CreatorProfile:
        """
        Create a new Creator ID with API credentials
        """
        # Check if creator already exists
        existing_creator = db.query(Creator).filter(
            (Creator.email == email) | (Creator.username == username)
        ).first()
        
        if existing_creator:
            raise ValueError(f"Creator with email {email} or username {username} already exists")
        
        # Create new creator
        creator = Creator(
            email=email,
            username=username,
            display_name=display_name,
            wallet_address=wallet_address
        )
        
        db.add(creator)
        db.commit()
        db.refresh(creator)
        
        # Generate API credentials
        api_credentials = self.generate_api_credentials(
            creator_id=str(creator.id),
            permissions=["read", "write", "fingerprint", "match"]
        )
        
        # Create creator profile
        profile = CreatorProfile(
            creator_id=str(creator.id),
            username=username,
            display_name=display_name,
            email=email,
            avatar_url=creator.avatar_url,
            wallet_address=wallet_address,
            verification_status="unverified",
            reputation_score=0.0,
            total_creations=0,
            total_views=0,
            total_attributions=0,
            total_earnings=0.0,
            social_links=social_links or {},
            api_key=api_credentials.api_key,
            created_at=creator.created_at,
            last_active=creator.created_at
        )
        
        # Store profile in cache
        self._store_creator_profile(profile)
        
        return profile
    
    def get_creator_profile(self, creator_id: str, db: Session) -> Optional[CreatorProfile]:
        """
        Get complete creator profile with real-time stats
        """
        # Try cache first
        if self.redis:
            cached_profile = self.redis.get(f"creator_profile:{creator_id}")
            if cached_profile:
                profile_data = json.loads(cached_profile)
                # Update with real-time stats
                return self._update_profile_stats(profile_data, db)
        
        # Get from database
        creator = db.query(Creator).filter(Creator.id == creator_id).first()
        if not creator:
            return None
        
        # Get API credentials
        api_key = self._get_api_key_for_creator(creator_id)
        
        profile = CreatorProfile(
            creator_id=str(creator.id),
            username=creator.username,
            display_name=creator.display_name,
            email=creator.email,
            avatar_url=creator.avatar_url,
            wallet_address=creator.wallet_address,
            verification_status=self._get_verification_status(creator, db),
            reputation_score=self._calculate_reputation_score(creator, db),
            total_creations=creator.total_creations,
            total_views=creator.total_views,
            total_attributions=creator.total_attributions,
            total_earnings=creator.rewards_earned,
            social_links=self._get_social_links(creator_id),
            api_key=api_key,
            created_at=creator.created_at,
            last_active=creator.updated_at
        )
        
        # Cache profile
        self._store_creator_profile(profile)
        
        return profile
    
    def generate_api_credentials(
        self, 
        creator_id: str, 
        permissions: List[str],
        rate_limit: int = 1000,
        expires_days: Optional[int] = None
    ) -> APICredentials:
        """
        Generate API credentials for creator
        """
        api_key = f"owl_{secrets.token_urlsafe(32)}"
        secret_key = secrets.token_urlsafe(64)
        
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        credentials = APICredentials(
            api_key=api_key,
            secret_key=secret_key,
            creator_id=creator_id,
            permissions=permissions,
            rate_limit=rate_limit,
            expires_at=expires_at,
            created_at=datetime.utcnow()
        )
        
        # Store credentials
        self._store_api_credentials(credentials)
        
        return credentials
    
    def verify_api_key(self, api_key: str) -> Optional[APICredentials]:
        """
        Verify API key and return credentials
        """
        if not self.redis:
            return None
        
        creds_data = self.redis.get(f"api_creds:{api_key}")
        if not creds_data:
            return None
        
        creds = json.loads(creds_data)
        
        # Check expiration
        if creds.get("expires_at"):
            expires_at = datetime.fromisoformat(creds["expires_at"])
            if datetime.utcnow() > expires_at:
                return None
        
        return APICredentials(
            api_key=creds["api_key"],
            secret_key=creds["secret_key"],
            creator_id=creds["creator_id"],
            permissions=creds["permissions"],
            rate_limit=creds["rate_limit"],
            expires_at=datetime.fromisoformat(creds["expires_at"]) if creds.get("expires_at") else None,
            created_at=datetime.fromisoformat(creds["created_at"])
        )
    
    def generate_creator_jwt(self, creator_id: str, permissions: List[str]) -> str:
        """
        Generate JWT token for creator authentication
        """
        payload = {
            "creator_id": creator_id,
            "permissions": permissions,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")
    
    def verify_creator_jwt(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token and return payload
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def link_social_account(
        self, 
        creator_id: str, 
        platform: str, 
        account_id: str, 
        verification_token: str,
        db: Session
    ) -> bool:
        """
        Link and verify social media account
        """
        # Verify the social account (implementation depends on platform)
        if self._verify_social_account(platform, account_id, verification_token):
            # Store social link
            social_links = self._get_social_links(creator_id)
            social_links[platform] = account_id
            
            if self.redis:
                self.redis.setex(
                    f"social_links:{creator_id}",
                    86400 * 365,  # 1 year
                    json.dumps(social_links)
                )
            
            # Update verification status
            self._update_verification_status(creator_id, db)
            
            return True
        
        return False
    
    def get_creator_analytics(self, creator_id: str, days: int = 30, db: Session = None) -> Dict[str, Any]:
        """
        Get creator analytics and insights
        """
        # Get content performance
        fingerprints = db.query(ContentFingerprint).filter(
            ContentFingerprint.creator_id == creator_id,
            ContentFingerprint.created_at >= datetime.utcnow() - timedelta(days=days)
        ).all()
        
        # Get attributions
        attributions = db.query(Attribution).filter(
            Attribution.original_creator_id == creator_id,
            Attribution.detected_at >= datetime.utcnow() - timedelta(days=days)
        ).all()
        
        # Calculate metrics
        total_views = sum(fp.views for fp in fingerprints)
        total_matches = sum(fp.matches_found for fp in fingerprints)
        total_rewards = sum(attr.reward_amount for attr in attributions)
        
        # Content type breakdown
        content_types = {}
        for fp in fingerprints:
            content_types[fp.content_type] = content_types.get(fp.content_type, 0) + 1
        
        # Platform breakdown
        platforms = {}
        for attr in attributions:
            platform = attr.reuse_platform or "unknown"
            platforms[platform] = platforms.get(platform, 0) + 1
        
        return {
            "creator_id": creator_id,
            "period_days": days,
            "total_content": len(fingerprints),
            "total_views": total_views,
            "total_matches": total_matches,
            "total_rewards": total_rewards,
            "avg_views_per_content": total_views / max(len(fingerprints), 1),
            "match_rate": total_matches / max(len(fingerprints), 1),
            "content_type_breakdown": content_types,
            "platform_breakdown": platforms,
            "top_performing_content": [
                {
                    "fingerprint_id": fp.fingerprint_id,
                    "content_type": fp.content_type,
                    "views": fp.views,
                    "matches": fp.matches_found,
                    "created_at": fp.created_at.isoformat()
                }
                for fp in sorted(fingerprints, key=lambda x: x.views, reverse=True)[:5]
            ]
        }
    
    def _store_creator_profile(self, profile: CreatorProfile):
        """Store creator profile in cache"""
        if self.redis:
            profile_data = {
                "creator_id": profile.creator_id,
                "username": profile.username,
                "display_name": profile.display_name,
                "email": profile.email,
                "avatar_url": profile.avatar_url,
                "wallet_address": profile.wallet_address,
                "verification_status": profile.verification_status,
                "reputation_score": profile.reputation_score,
                "total_creations": profile.total_creations,
                "total_views": profile.total_views,
                "total_attributions": profile.total_attributions,
                "total_earnings": profile.total_earnings,
                "social_links": profile.social_links,
                "api_key": profile.api_key,
                "created_at": profile.created_at.isoformat(),
                "last_active": profile.last_active.isoformat()
            }
            
            self.redis.setex(
                f"creator_profile:{profile.creator_id}",
                3600,  # 1 hour cache
                json.dumps(profile_data, default=str)
            )
    
    def _store_api_credentials(self, credentials: APICredentials):
        """Store API credentials in cache"""
        if self.redis:
            creds_data = {
                "api_key": credentials.api_key,
                "secret_key": credentials.secret_key,
                "creator_id": credentials.creator_id,
                "permissions": credentials.permissions,
                "rate_limit": credentials.rate_limit,
                "expires_at": credentials.expires_at.isoformat() if credentials.expires_at else None,
                "created_at": credentials.created_at.isoformat()
            }
            
            # Store by API key
            self.redis.setex(
                f"api_creds:{credentials.api_key}",
                86400 * 365 if not credentials.expires_at else int((credentials.expires_at - datetime.utcnow()).total_seconds()),
                json.dumps(creds_data, default=str)
            )
            
            # Store by creator ID
            self.redis.setex(
                f"creator_api_key:{credentials.creator_id}",
                86400 * 365,
                credentials.api_key
            )
    
    def _get_api_key_for_creator(self, creator_id: str) -> Optional[str]:
        """Get API key for creator"""
        if self.redis:
            return self.redis.get(f"creator_api_key:{creator_id}")
        return None
    
    def _get_verification_status(self, creator: Creator, db: Session) -> str:
        """Calculate creator verification status"""
        # Check social links
        social_links = self._get_social_links(str(creator.id))
        has_social = len(social_links) > 0
        
        # Check wallet connection
        has_wallet = creator.wallet_address is not None
        
        # Check content history
        has_content = creator.total_creations > 0
        
        if has_social and has_wallet and has_content:
            return "verified"
        elif has_social or has_wallet:
            return "partial"
        else:
            return "unverified"
    
    def _calculate_reputation_score(self, creator: Creator, db: Session) -> float:
        """Calculate creator reputation score"""
        score = 0.0
        
        # Base score from content creation
        score += min(creator.total_creations * 0.1, 5.0)
        
        # Score from views
        score += min(creator.total_views * 0.001, 3.0)
        
        # Score from attributions (shows original content)
        score += min(creator.total_attributions * 0.2, 2.0)
        
        # Account age bonus
        account_age_days = (datetime.utcnow() - creator.created_at).days
        score += min(account_age_days * 0.01, 1.0)
        
        return min(score, 10.0)  # Max score of 10
    
    def _get_social_links(self, creator_id: str) -> Dict[str, str]:
        """Get social links for creator"""
        if self.redis:
            links_data = self.redis.get(f"social_links:{creator_id}")
            if links_data:
                return json.loads(links_data)
        return {}
    
    def _verify_social_account(self, platform: str, account_id: str, verification_token: str) -> bool:
        """Verify social media account (placeholder)"""
        # In production, this would verify with the actual platform APIs
        return True
    
    def _update_verification_status(self, creator_id: str, db: Session):
        """Update creator verification status"""
        creator = db.query(Creator).filter(Creator.id == creator_id).first()
        if creator:
            # Recalculate verification status
            verification_status = self._get_verification_status(creator, db)
            # Store in cache or update database as needed
    
    def _update_profile_stats(self, profile_data: Dict[str, Any], db: Session) -> CreatorProfile:
        """Update profile with real-time stats"""
        creator = db.query(Creator).filter(Creator.id == profile_data["creator_id"]).first()
        if creator:
            profile_data.update({
                "total_creations": creator.total_creations,
                "total_views": creator.total_views,
                "total_attributions": creator.total_attributions,
                "total_earnings": creator.rewards_earned,
                "reputation_score": self._calculate_reputation_score(creator, db)
            })
        
        return CreatorProfile(
            creator_id=profile_data["creator_id"],
            username=profile_data["username"],
            display_name=profile_data["display_name"],
            email=profile_data["email"],
            avatar_url=profile_data["avatar_url"],
            wallet_address=profile_data["wallet_address"],
            verification_status=profile_data["verification_status"],
            reputation_score=profile_data["reputation_score"],
            total_creations=profile_data["total_creations"],
            total_views=profile_data["total_views"],
            total_attributions=profile_data["total_attributions"],
            total_earnings=profile_data["total_earnings"],
            social_links=profile_data["social_links"],
            api_key=profile_data["api_key"],
            created_at=datetime.fromisoformat(profile_data["created_at"]),
            last_active=datetime.fromisoformat(profile_data["last_active"])
        )

# Global Creator ID system instance
creator_id_system = CreatorIDSystem()
