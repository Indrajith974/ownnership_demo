from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional, Dict, List
import re
import hashlib
import secrets
from database import get_db
from models import Base

# User Profile Models
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(String, primary_key=True)
    address = Column(String, unique=True, nullable=False, index=True)
    handle = Column(String, unique=True, nullable=True, index=True)
    bio = Column(Text, default="")
    avatar = Column(String, default="")
    socials = Column(JSON, default=dict)
    content_types = Column(JSON, default=list)
    is_verified = Column(Boolean, default=False)
    reputation = Column(Integer, default=0)
    credits = Column(Integer, default=100)  # Starting credits
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuthNonce(Base):
    __tablename__ = "auth_nonces"
    
    id = Column(String, primary_key=True)
    nonce = Column(String, unique=True, nullable=False)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    used = Column(Boolean, default=False)

# Pydantic Models
from pydantic import BaseModel, validator

class UserProfileCreate(BaseModel):
    address: str
    handle: Optional[str] = None
    bio: str = ""
    avatar: str = ""
    socials: Dict[str, str] = {}
    content_types: List[str] = ["text"]
    
    @validator('handle')
    def validate_handle(cls, v):
        if v is not None:
            if not re.match(r'^[a-z0-9-]+$', v):
                raise ValueError('Handle must contain only lowercase letters, numbers, and hyphens')
            if len(v) < 3 or len(v) > 20:
                raise ValueError('Handle must be between 3 and 20 characters')
            reserved = ['admin', 'api', 'www', 'app', 'support', 'help', 'about']
            if v.lower() in reserved:
                raise ValueError('Handle is reserved')
        return v

class UserProfileUpdate(BaseModel):
    handle: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    socials: Optional[Dict[str, str]] = None
    content_types: Optional[List[str]] = None

class UserProfileResponse(BaseModel):
    id: str
    address: str
    handle: Optional[str]
    bio: str
    avatar: str
    socials: Dict[str, str]
    content_types: List[str]
    is_verified: bool
    reputation: int
    credits: int
    created_at: datetime
    updated_at: datetime

class SiweAuthRequest(BaseModel):
    message: str
    signature: str
    address: str

class NonceResponse(BaseModel):
    nonce: str

# Router
router = APIRouter(prefix="/api/users", tags=["users"])

# Helper Functions
def generate_user_id(address: str) -> str:
    """Generate a unique user ID from wallet address"""
    return hashlib.sha256(address.lower().encode()).hexdigest()[:16]

def generate_nonce() -> str:
    """Generate a cryptographically secure nonce"""
    return secrets.token_hex(16)

def is_handle_available(handle: str, current_user_id: str, db: Session) -> bool:
    """Check if a handle is available"""
    if not handle:
        return True
    
    existing = db.query(UserProfile).filter(
        UserProfile.handle == handle.lower(),
        UserProfile.id != current_user_id
    ).first()
    return existing is None

# API Endpoints

@router.get("/nonce", response_model=NonceResponse)
async def get_nonce(db: Session = Depends(get_db)):
    """Generate a nonce for SIWE authentication"""
    nonce = generate_nonce()
    
    # Store nonce in database
    db_nonce = AuthNonce(
        id=secrets.token_hex(8),
        nonce=nonce
    )
    db.add(db_nonce)
    db.commit()
    
    return NonceResponse(nonce=nonce)

@router.post("/auth/siwe")
async def authenticate_siwe(
    auth_request: SiweAuthRequest,
    db: Session = Depends(get_db)
):
    """Authenticate user with SIWE (Sign-In With Ethereum)"""
    try:
        from siwe import SiweMessage
        
        # Parse and verify the SIWE message
        siwe_message = SiweMessage.from_message(auth_request.message)
        
        # Verify the signature
        siwe_message.verify(auth_request.signature)
        
        # Check if nonce exists and is unused
        nonce_record = db.query(AuthNonce).filter(
            AuthNonce.nonce == siwe_message.nonce,
            AuthNonce.used == False
        ).first()
        
        if not nonce_record:
            raise HTTPException(status_code=400, detail="Invalid or used nonce")
        
        # Mark nonce as used
        nonce_record.used = True
        nonce_record.address = auth_request.address
        db.commit()
        
        # Get or create user profile
        user_id = generate_user_id(auth_request.address)
        user_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        
        if not user_profile:
            # Create new user profile
            user_profile = UserProfile(
                id=user_id,
                address=auth_request.address.lower(),
                socials={
                    "twitter": "",
                    "github": "",
                    "website": "",
                    "discord": ""
                },
                content_types=["text", "image", "audio", "code"]
            )
            db.add(user_profile)
            db.commit()
            db.refresh(user_profile)
        
        # Generate JWT token (simplified - in production use proper JWT library)
        import jwt
        import os
        
        token_payload = {
            "user_id": user_profile.id,
            "address": user_profile.address,
            "exp": datetime.utcnow().timestamp() + 86400  # 24 hours
        }
        
        jwt_secret = os.getenv("JWT_SECRET", "your-secret-key")
        token = jwt.encode(token_payload, jwt_secret, algorithm="HS256")
        
        return {
            "user": UserProfileResponse.from_orm(user_profile),
            "session": {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": 86400
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    address: str = Query(..., description="Wallet address"),
    db: Session = Depends(get_db)
):
    """Get user profile by wallet address"""
    user_id = generate_user_id(address)
    user_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return UserProfileResponse.from_orm(user_profile)

@router.post("/profile", response_model=UserProfileResponse)
async def create_user_profile(
    profile_data: UserProfileCreate,
    db: Session = Depends(get_db)
):
    """Create a new user profile"""
    user_id = generate_user_id(profile_data.address)
    
    # Check if user already exists
    existing_user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User profile already exists")
    
    # Check handle availability
    if profile_data.handle and not is_handle_available(profile_data.handle, user_id, db):
        raise HTTPException(status_code=400, detail="Handle is not available")
    
    # Create user profile
    user_profile = UserProfile(
        id=user_id,
        address=profile_data.address.lower(),
        handle=profile_data.handle.lower() if profile_data.handle else None,
        bio=profile_data.bio,
        avatar=profile_data.avatar,
        socials=profile_data.socials,
        content_types=profile_data.content_types
    )
    
    db.add(user_profile)
    db.commit()
    db.refresh(user_profile)
    
    return UserProfileResponse.from_orm(user_profile)

@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_updates: UserProfileUpdate,
    address: str = Query(..., description="Wallet address"),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    user_id = generate_user_id(address)
    user_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Check handle availability if updating handle
    if profile_updates.handle and not is_handle_available(profile_updates.handle, user_id, db):
        raise HTTPException(status_code=400, detail="Handle is not available")
    
    # Update fields
    update_data = profile_updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "handle" and value:
            value = value.lower()
        setattr(user_profile, field, value)
    
    user_profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user_profile)
    
    return UserProfileResponse.from_orm(user_profile)

@router.get("/handle-check")
async def check_handle_availability(
    handle: str = Query(..., description="Handle to check"),
    address: Optional[str] = Query(None, description="Current user address"),
    db: Session = Depends(get_db)
):
    """Check if a handle is available"""
    if not handle:
        return {"available": False, "reason": "Handle cannot be empty"}
    
    # Validate handle format
    if not re.match(r'^[a-z0-9-]+$', handle):
        return {"available": False, "reason": "Invalid handle format"}
    
    if len(handle) < 3 or len(handle) > 20:
        return {"available": False, "reason": "Handle must be between 3 and 20 characters"}
    
    reserved = ['admin', 'api', 'www', 'app', 'support', 'help', 'about']
    if handle.lower() in reserved:
        return {"available": False, "reason": "Handle is reserved"}
    
    # Check database availability
    current_user_id = generate_user_id(address) if address else ""
    available = is_handle_available(handle, current_user_id, db)
    
    return {"available": available}

@router.get("/by-handle/{handle}", response_model=UserProfileResponse)
async def get_user_by_handle(
    handle: str,
    db: Session = Depends(get_db)
):
    """Get user profile by handle"""
    user_profile = db.query(UserProfile).filter(UserProfile.handle == handle.lower()).first()
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse.from_orm(user_profile)

@router.post("/credits/add")
async def add_credits(
    address: str = Query(..., description="Wallet address"),
    amount: int = Query(..., description="Credits to add"),
    reason: str = Query("manual", description="Reason for credit addition"),
    db: Session = Depends(get_db)
):
    """Add credits to user account"""
    user_id = generate_user_id(address)
    user_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    user_profile.credits += amount
    user_profile.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "new_balance": user_profile.credits}

@router.post("/reputation/update")
async def update_reputation(
    address: str = Query(..., description="Wallet address"),
    change: int = Query(..., description="Reputation change (positive or negative)"),
    reason: str = Query("manual", description="Reason for reputation change"),
    db: Session = Depends(get_db)
):
    """Update user reputation"""
    user_id = generate_user_id(address)
    user_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    user_profile.reputation = max(0, user_profile.reputation + change)  # Prevent negative reputation
    user_profile.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "new_reputation": user_profile.reputation}
