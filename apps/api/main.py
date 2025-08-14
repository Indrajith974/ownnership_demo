from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import sys
import hashlib
import json
from attribution_protocol import router as attribution_router
from blockchain_integration import router as blockchain_router
from creator_id_system import router as creator_id_router
from user_profile_api import router as user_profile_router
from nft_minting_api import router as nft_router
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add engine path to import GNAN
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'engine'))

# Local imports
from database import get_db, get_redis, create_tables
from models import Creator, ContentFingerprint, Attribution, MatchResult
from gnan import gnan

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="The Ownership Layer API",
    description="Protocol for original content attribution and creator rewards",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ContentInput(BaseModel):
    content: str
    content_type: str  # text, image, audio, code
    metadata: Optional[Dict[str, Any]] = None

class FingerprintResponse(BaseModel):
    fingerprint_id: str
    content_hash: str
    embedding: List[float]
    similarity_threshold: float
    metadata: Dict[str, Any]

class MatchRequest(BaseModel):
    content: str
    content_type: str
    threshold: float = 0.8

class MatchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    similarity_scores: List[float]
    original_creators: List[str]

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "The Ownership Layer API",
        "version": "0.1.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ownership-layer-api"}

# Fingerprinting endpoints
@app.post("/api/fingerprint", response_model=FingerprintResponse)
async def create_fingerprint(
    content_input: ContentInput, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate a unique fingerprint for content
    Supports: text, image, audio, code
    """
    try:
        # Generate fingerprint using GNAN engine
        fingerprint_data = gnan.generate_fingerprint(
            content=content_input.content,
            content_type=content_input.content_type,
            metadata=content_input.metadata or {}
        )
        
        # Get or create creator (for now, use a default creator)
        creator = db.query(Creator).filter(Creator.email == "demo@ownership-layer.com").first()
        if not creator:
            creator = Creator(
                email="demo@ownership-layer.com",
                username="demo_user",
                display_name="Demo Creator"
            )
            db.add(creator)
            db.commit()
            db.refresh(creator)
        
        # Create content fingerprint record
        content_fingerprint = ContentFingerprint(
            fingerprint_id=fingerprint_data["fingerprint_id"],
            content_type=fingerprint_data["content_type"],
            content_hash=fingerprint_data.get("content_hash", ""),
            creator_id=creator.id,
            openai_embedding=fingerprint_data.get("openai_embedding"),
            local_embedding=fingerprint_data.get("local_embedding"),
            perceptual_hashes=fingerprint_data.get("perceptual_hashes"),
            audio_features=fingerprint_data.get("audio_features"),
            code_features=fingerprint_data.get("code_features"),
            word_count=fingerprint_data.get("word_count"),
            char_count=fingerprint_data.get("char_count"),
            file_size=fingerprint_data.get("file_size"),
            duration=fingerprint_data.get("duration"),
            dimensions=fingerprint_data.get("dimensions"),
            metadata=fingerprint_data.get("metadata", {}),
            similarity_threshold=0.8
        )
        
        db.add(content_fingerprint)
        db.commit()
        db.refresh(content_fingerprint)
        
        # Update creator stats
        creator.total_creations += 1
        db.commit()
        
        # Background task: Check for similar content
        background_tasks.add_task(
            check_for_similar_content, 
            fingerprint_data, 
            content_fingerprint.id
        )
        
        return FingerprintResponse(
            fingerprint_id=fingerprint_data["fingerprint_id"],
            content_hash=fingerprint_data.get("content_hash", ""),
            embedding=fingerprint_data.get("openai_embedding", fingerprint_data.get("local_embedding", [])),
            similarity_threshold=0.8,
            metadata={
                "content_type": fingerprint_data["content_type"],
                "created_at": fingerprint_data["timestamp"],
                "creator_id": str(creator.id),
                "database_id": str(content_fingerprint.id)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fingerprinting failed: {str(e)}")

@app.post("/api/match", response_model=MatchResponse)
async def find_matches(match_request: MatchRequest, db: Session = Depends(get_db)):
    """
    Find similar content matches in the database
    Returns similarity scores and original creators
    """
    try:
        # Generate fingerprint for the query content
        query_fingerprint = gnan.generate_fingerprint(
            content=match_request.content,
            content_type=match_request.content_type,
            metadata={"query": True}
        )
        
        # Get all fingerprints of the same content type from database
        existing_fingerprints = db.query(ContentFingerprint).filter(
            ContentFingerprint.content_type == match_request.content_type,
            ContentFingerprint.is_active == True
        ).all()
        
        matches = []
        similarity_scores = []
        original_creators = []
        
        # Convert database records to format expected by GNAN
        database_fingerprints = []
        for fp in existing_fingerprints:
            db_fp = {
                "fingerprint_id": fp.fingerprint_id,
                "content_type": fp.content_type,
                "content_hash": fp.content_hash,
                "openai_embedding": fp.openai_embedding,
                "local_embedding": fp.local_embedding,
                "perceptual_hashes": fp.perceptual_hashes,
                "audio_features": fp.audio_features,
                "code_features": fp.code_features,
                "metadata": fp.metadata or {}
            }
            database_fingerprints.append(db_fp)
        
        # Find similar content using GNAN
        similar_content = gnan.find_similar_content(
            query_fingerprint, 
            database_fingerprints, 
            threshold=match_request.threshold
        )
        
        # Process results
        for db_content, similarity_score in similar_content:
            # Get the original database record
            original_fp = next(
                (fp for fp in existing_fingerprints if fp.fingerprint_id == db_content["fingerprint_id"]), 
                None
            )
            
            if original_fp:
                # Get creator info
                creator = db.query(Creator).filter(Creator.id == original_fp.creator_id).first()
                
                match_data = {
                    "fingerprint_id": original_fp.fingerprint_id,
                    "content_preview": f"{original_fp.content_type} content created on {original_fp.created_at}",
                    "creator_id": str(original_fp.creator_id),
                    "creator_name": creator.display_name if creator else "Unknown",
                    "created_at": original_fp.created_at.isoformat(),
                    "content_type": original_fp.content_type,
                    "views": original_fp.views,
                    "title": original_fp.title
                }
                
                matches.append(match_data)
                similarity_scores.append(similarity_score)
                original_creators.append(creator.display_name if creator else "Unknown")
        
        return MatchResponse(
            matches=matches,
            similarity_scores=similarity_scores,
            original_creators=original_creators
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")

# File upload endpoint for images/audio
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and process files (images, audio, documents)
    """
    try:
        # TODO: Implement file processing
        # Save file, extract content, generate fingerprint
        
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file.size,
            "status": "uploaded",
            "fingerprint_id": f"fp_file_{hash(file.filename)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Creator dashboard endpoints
@app.get("/api/creator/{creator_id}/stats")
async def get_creator_stats(creator_id: str):
    """
    Get creator statistics and dashboard data
    """
    try:
        # TODO: Implement actual stats from database
        return {
            "creator_id": creator_id,
            "total_creations": 127,
            "total_views": 45200,
            "attributions": 23,
            "rewards_earned": 1247.50,
            "recent_activity": [
                {
                    "type": "reuse_detected",
                    "content_id": "fp_123",
                    "platform": "twitter",
                    "timestamp": "2024-01-01T00:00:00Z"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats retrieval failed: {str(e)}")

@app.get("/api/creator/{creator_id}/creations")
async def get_creator_creations(creator_id: str, limit: int = 10, offset: int = 0):
    """
    Get creator's protected content list
    """
    try:
        # TODO: Implement actual database query
        creations = [
            {
                "fingerprint_id": "fp_123",
                "title": "AI Ethics Framework Blog Post",
                "content_type": "text",
                "views": 2300,
                "matches": 5,
                "created_at": "2024-01-01T00:00:00Z",
                "status": "protected"
            },
            {
                "fingerprint_id": "fp_124",
                "title": "Sunset Photography Collection",
                "content_type": "image",
                "views": 8700,
                "matches": 12,
                "created_at": "2024-01-02T00:00:00Z",
                "status": "protected"
            }
        ]
        
        return {
            "creations": creations,
            "total": len(creations),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Creations retrieval failed: {str(e)}")

# Background tasks
async def check_for_similar_content(fingerprint_data: Dict[str, Any], content_id: str):
    """
    Background task to check for similar content and create attributions
    """
    try:
        from database import SessionLocal
        db = SessionLocal()
        
        # Get all existing fingerprints of the same type
        existing_fingerprints = db.query(ContentFingerprint).filter(
            ContentFingerprint.content_type == fingerprint_data["content_type"],
            ContentFingerprint.id != content_id,
            ContentFingerprint.is_active == True
        ).all()
        
        # Convert to GNAN format
        database_fingerprints = []
        for fp in existing_fingerprints:
            db_fp = {
                "fingerprint_id": fp.fingerprint_id,
                "content_type": fp.content_type,
                "content_hash": fp.content_hash,
                "openai_embedding": fp.openai_embedding,
                "local_embedding": fp.local_embedding,
                "perceptual_hashes": fp.perceptual_hashes,
                "audio_features": fp.audio_features,
                "code_features": fp.code_features,
                "metadata": fp.metadata or {}
            }
            database_fingerprints.append(db_fp)
        
        # Find similar content
        similar_content = gnan.find_similar_content(
            fingerprint_data, 
            database_fingerprints, 
            threshold=0.7  # Lower threshold for detection
        )
        
        # Create attribution records for high similarity matches
        current_fp = db.query(ContentFingerprint).filter(ContentFingerprint.id == content_id).first()
        if not current_fp:
            return
            
        for similar_fp_data, similarity_score in similar_content:
            if similarity_score > 0.85:  # High similarity threshold
                # Find the original fingerprint
                original_fp = db.query(ContentFingerprint).filter(
                    ContentFingerprint.fingerprint_id == similar_fp_data["fingerprint_id"]
                ).first()
                
                if original_fp and original_fp.created_at < current_fp.created_at:
                    # Create attribution record
                    attribution = Attribution(
                        original_content_id=original_fp.id,
                        original_creator_id=original_fp.creator_id,
                        similarity_score=similarity_score,
                        match_type="high" if similarity_score > 0.95 else "medium",
                        detection_method="automatic_fingerprint",
                        status="detected"
                    )
                    
                    db.add(attribution)
                    
                    # Update stats
                    original_fp.matches_found += 1
                    original_creator = db.query(Creator).filter(Creator.id == original_fp.creator_id).first()
                    if original_creator:
                        original_creator.total_attributions += 1
        
        db.commit()
        db.close()
        
    except Exception as e:
        print(f"Background task error: {e}")

# Helper functions
def get_creator_by_id(creator_id: str, db: Session) -> Optional[Creator]:
    """Get creator by ID"""
    try:
        from uuid import UUID
        creator_uuid = UUID(creator_id)
        return db.query(Creator).filter(Creator.id == creator_uuid).first()
    except:
        return None

def update_content_views(fingerprint_id: str, db: Session):
    """Update view count for content"""
    content = db.query(ContentFingerprint).filter(
        ContentFingerprint.fingerprint_id == fingerprint_id
    ).first()
    if content:
        content.views += 1
        creator = db.query(Creator).filter(Creator.id == content.creator_id).first()
        if creator:
            creator.total_views += 1
        db.commit()

# Include routers
app.include_router(user_profile_router)
app.include_router(attribution_router)
app.include_router(blockchain_router)
app.include_router(creator_id_router)
app.include_router(nft_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
