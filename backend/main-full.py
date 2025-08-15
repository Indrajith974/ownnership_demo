"""
The Ownership Layer - Full Featured Backend
Complete API server with authentication, data storage, and all features
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Optional, List, Dict, Any
import hashlib
import json
import uuid
import jwt
import bcrypt
from api.database import get_db
from api.models import Creator, ContentFingerprint, Attribution, MatchResult
from api.supabase_integration import (
    supabase_integration,
    sync_user_to_supabase,
    create_fingerprint_in_supabase,
    create_nft_in_supabase,
    track_event_in_supabase,
    update_user_wallet_in_supabase
)
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Database setup - Force SQLite for development
DATABASE_URL = "sqlite:///./ownership_layer.db"
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ContentFingerprint(Base):
    __tablename__ = "content_fingerprints"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fingerprint_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    content_hash = Column(String, nullable=False, index=True)
    content_preview = Column(Text, nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    content_metadata = Column(JSON, nullable=True)
    similarity_threshold = Column(Float, default=0.8)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class NFTCertificate(Base):
    __tablename__ = "nft_certificates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fingerprint_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    token_id = Column(Integer, nullable=True)
    contract_address = Column(String, nullable=True)
    transaction_hash = Column(String, nullable=True)
    mint_status = Column(String, default="pending")  # pending, minted, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    minted_at = Column(DateTime, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="The Ownership Layer API",
    description="Complete content fingerprinting and ownership verification platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str]
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ContentCreate(BaseModel):
    content: str
    content_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []

class FingerprintResponse(BaseModel):
    id: str
    fingerprint_id: str
    content_type: str
    content_hash: str
    content_preview: Optional[str]
    title: Optional[str]
    description: Optional[str]
    tags: List[str]
    is_public: bool
    created_at: datetime

class NFTMintRequest(BaseModel):
    fingerprint_id: str

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def generate_fingerprint(content: str, content_type: str) -> tuple[str, str]:
    """Generate content hash and fingerprint ID"""
    content_hash = hashlib.sha256(content.encode()).hexdigest()
    fingerprint_id = f"fp_{content_type}_{content_hash[:16]}"
    return content_hash, fingerprint_id

# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "The Ownership Layer API",
        "version": "1.0.0",
        "status": "active",
        "features": ["authentication", "content_fingerprinting", "nft_minting", "data_storage"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ownership-layer-api"}

# Authentication endpoints
@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Sync user to Supabase
    try:
        await sync_user_to_supabase({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'full_name': user.full_name
        })
        await track_event_in_supabase(user.id, 'user_registered', {
            'email': user.email,
            'username': user.username
        })
    except Exception as e:
        print(f"Supabase sync error during registration: {e}")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
    }

@app.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
    }

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

# Content fingerprinting endpoints
@app.post("/api/fingerprint", response_model=FingerprintResponse)
async def create_fingerprint(
    content_data: ContentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Generate fingerprint
    content_hash, fingerprint_id = generate_fingerprint(content_data.content, content_data.content_type)
    
    # Check if fingerprint already exists
    existing = db.query(ContentFingerprint).filter(ContentFingerprint.content_hash == content_hash).first()
    if existing:
        raise HTTPException(status_code=400, detail="Content already fingerprinted")
    
    # Create fingerprint record
    fingerprint = ContentFingerprint(
        fingerprint_id=fingerprint_id,
        user_id=current_user.id,
        content_type=content_data.content_type,
        content_hash=content_hash,
        content_preview=content_data.content[:200] if len(content_data.content) > 200 else content_data.content,
        title=content_data.title,
        description=content_data.description,
        tags=content_data.tags,
        metadata={"word_count": len(content_data.content.split()), "char_count": len(content_data.content)}
    )
    
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    # Sync fingerprint to Supabase
    try:
        await create_fingerprint_in_supabase({
            'user_id': current_user.id,
            'hash': content_hash,
            'title': content_data.title,
            'description': content_data.description,
            'content_type': content_data.content_type,
            'tags': content_data.tags,
            'content_metadata': {"word_count": len(content_data.content.split()), "char_count": len(content_data.content)}
        })
        await track_event_in_supabase(current_user.id, 'fingerprint_created', {
            'fingerprint_id': fingerprint_id,
            'content_type': content_data.content_type
        })
    except Exception as e:
        print(f"Supabase sync error during fingerprint creation: {e}")
    
    return FingerprintResponse(
        id=fingerprint.id,
        fingerprint_id=fingerprint.fingerprint_id,
        content_type=fingerprint.content_type,
        content_hash=fingerprint.content_hash,
        content_preview=fingerprint.content_preview,
        title=fingerprint.title,
        description=fingerprint.description,
        tags=fingerprint.tags or [],
        is_public=fingerprint.is_public,
        created_at=fingerprint.created_at
    )

@app.get("/api/fingerprints", response_model=List[FingerprintResponse])
async def get_user_fingerprints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    fingerprints = db.query(ContentFingerprint).filter(
        ContentFingerprint.user_id == current_user.id
    ).offset(offset).limit(limit).all()
    
    return [
        FingerprintResponse(
            id=fp.id,
            fingerprint_id=fp.fingerprint_id,
            content_type=fp.content_type,
            content_hash=fp.content_hash,
            content_preview=fp.content_preview,
            title=fp.title,
            description=fp.description,
            tags=fp.tags or [],
            is_public=fp.is_public,
            created_at=fp.created_at
        )
        for fp in fingerprints
    ]

@app.get("/api/fingerprint/{fingerprint_id}", response_model=FingerprintResponse)
async def get_fingerprint(
    fingerprint_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fingerprint = db.query(ContentFingerprint).filter(
        ContentFingerprint.fingerprint_id == fingerprint_id,
        ContentFingerprint.user_id == current_user.id
    ).first()
    
    if not fingerprint:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    
    return FingerprintResponse(
        id=fingerprint.id,
        fingerprint_id=fingerprint.fingerprint_id,
        content_type=fingerprint.content_type,
        content_hash=fingerprint.content_hash,
        content_preview=fingerprint.content_preview,
        title=fingerprint.title,
        description=fingerprint.description,
        tags=fingerprint.tags or [],
        is_public=fingerprint.is_public,
        created_at=fingerprint.created_at
    )

# NFT minting endpoints
@app.post("/api/mint")
async def mint_nft(
    mint_request: NFTMintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify fingerprint exists and belongs to user
    fingerprint = db.query(ContentFingerprint).filter(
        ContentFingerprint.fingerprint_id == mint_request.fingerprint_id,
        ContentFingerprint.user_id == current_user.id
    ).first()
    
    if not fingerprint:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    
    # Check if already minted
    existing_nft = db.query(NFTCertificate).filter(
        NFTCertificate.fingerprint_id == mint_request.fingerprint_id
    ).first()
    
    if existing_nft:
        raise HTTPException(status_code=400, detail="NFT already minted for this content")
    
    # Create NFT certificate record
    nft_certificate = NFTCertificate(
        fingerprint_id=mint_request.fingerprint_id,
        user_id=current_user.id,
        mint_status="minted",  # Simulated for demo
        token_id=hash(fingerprint.content_hash) % 10000,  # Mock token ID
        contract_address="0x1234567890123456789012345678901234567890",  # Mock contract
        transaction_hash="0x" + hashlib.sha256(f"{fingerprint.fingerprint_id}{current_user.id}".encode()).hexdigest(),
        minted_at=datetime.utcnow()
    )
    
    db.add(nft_certificate)
    db.commit()
    db.refresh(nft_certificate)
    
    return {
        "message": "NFT minted successfully",
        "certificate_id": nft_certificate.id,
        "token_id": nft_certificate.token_id,
        "transaction_hash": nft_certificate.transaction_hash,
        "contract_address": nft_certificate.contract_address
    }

@app.get("/api/nfts")
async def get_user_nfts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    nfts = db.query(NFTCertificate).filter(
        NFTCertificate.user_id == current_user.id
    ).all()
    
    return [
        {
            "id": nft.id,
            "fingerprint_id": nft.fingerprint_id,
            "token_id": nft.token_id,
            "contract_address": nft.contract_address,
            "transaction_hash": nft.transaction_hash,
            "mint_status": nft.mint_status,
            "created_at": nft.created_at,
            "minted_at": nft.minted_at
        }
        for nft in nfts
    ]

# File upload endpoint
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Read file content
    content = await file.read()
    
    # Determine content type
    content_type = "file"
    if file.content_type:
        if file.content_type.startswith("image/"):
            content_type = "image"
        elif file.content_type.startswith("audio/"):
            content_type = "audio"
        elif file.content_type.startswith("video/"):
            content_type = "video"
        elif file.content_type.startswith("text/"):
            content_type = "text"
    
    # Generate hash for file content
    content_hash = hashlib.sha256(content).hexdigest()
    
    return {
        "filename": file.filename,
        "content_type": content_type,
        "content_hash": content_hash,
        "size": len(content),
        "message": "File processed successfully"
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting The Ownership Layer API (Full Version)...")
    print("Features: Authentication, Data Storage, Content Fingerprinting, NFT Minting")
    print("API Documentation: http://localhost:8000/docs")
    print("Database: SQLite (development)")
    
    uvicorn.run(
        "main-full:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
