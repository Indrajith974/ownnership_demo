"""
Database models for The Ownership Layer
SQLAlchemy models for content fingerprints, creators, and attributions
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid

Base = declarative_base()

class Creator(Base):
    """Creator/User model"""
    __tablename__ = "creators"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Authentication
    supabase_id = Column(String(255), unique=True, nullable=True)
    wallet_address = Column(String(255), unique=True, nullable=True)
    
    # Stats
    total_creations = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    total_attributions = Column(Integer, default=0)
    rewards_earned = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    fingerprints = relationship("ContentFingerprint", back_populates="creator")
    attributions = relationship("Attribution", back_populates="original_creator")

class ContentFingerprint(Base):
    """Content fingerprint model"""
    __tablename__ = "content_fingerprints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fingerprint_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Content info
    content_type = Column(String(50), nullable=False)  # text, image, audio, code
    content_hash = Column(String(255), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    # Creator info
    creator_id = Column(UUID(as_uuid=True), ForeignKey("creators.id"), nullable=False)
    
    # Fingerprint data
    openai_embedding = Column(ARRAY(Float), nullable=True)  # OpenAI embedding vector
    local_embedding = Column(ARRAY(Float), nullable=True)   # Local embedding vector
    perceptual_hashes = Column(JSON, nullable=True)         # Image hashes
    audio_features = Column(JSON, nullable=True)            # Audio MFCC, etc.
    code_features = Column(JSON, nullable=True)             # AST, tokens, etc.
    
    # Content metrics
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)  # For audio/video
    dimensions = Column(JSON, nullable=True)  # For images
    
    # Similarity settings
    similarity_threshold = Column(Float, default=0.8)
    
    # Status and visibility
    status = Column(String(50), default="protected")  # protected, public, private
    is_active = Column(Boolean, default=True)
    
    # Usage stats
    views = Column(Integer, default=0)
    matches_found = Column(Integer, default=0)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    source_url = Column(String(1000), nullable=True)
    platform = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("Creator", back_populates="fingerprints")
    attributions = relationship("Attribution", back_populates="original_content")

class Attribution(Base):
    """Attribution/reuse tracking model"""
    __tablename__ = "attributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Original content
    original_content_id = Column(UUID(as_uuid=True), ForeignKey("content_fingerprints.id"), nullable=False)
    original_creator_id = Column(UUID(as_uuid=True), ForeignKey("creators.id"), nullable=False)
    
    # Reuse details
    reuse_url = Column(String(1000), nullable=True)
    reuse_platform = Column(String(100), nullable=True)
    reuse_context = Column(Text, nullable=True)
    
    # Similarity metrics
    similarity_score = Column(Float, nullable=False)
    match_type = Column(String(50), nullable=False)  # exact, high, medium, low
    
    # Detection info
    detected_by = Column(String(100), default="system")  # system, user_report, api
    detection_method = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(50), default="detected")  # detected, verified, disputed, resolved
    is_credited = Column(Boolean, default=False)
    is_rewarded = Column(Boolean, default=False)
    
    # Reward info
    reward_amount = Column(Float, default=0.0)
    reward_currency = Column(String(10), default="USD")
    
    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    original_content = relationship("ContentFingerprint", back_populates="attributions")
    original_creator = relationship("Creator", back_populates="attributions")

class MatchResult(Base):
    """Similarity match results for caching"""
    __tablename__ = "match_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Query info
    query_hash = Column(String(255), nullable=False, index=True)
    query_type = Column(String(50), nullable=False)
    
    # Match results
    matched_fingerprint_id = Column(UUID(as_uuid=True), ForeignKey("content_fingerprints.id"))
    similarity_score = Column(Float, nullable=False)
    
    # Cache info
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class APIUsage(Base):
    """API usage tracking"""
    __tablename__ = "api_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Usage info
    creator_id = Column(UUID(as_uuid=True), ForeignKey("creators.id"), nullable=True)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    
    # Request details
    request_size = Column(Integer, nullable=True)
    response_size = Column(Integer, nullable=True)
    processing_time = Column(Float, nullable=True)
    
    # Status
    status_code = Column(Integer, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Metadata
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
