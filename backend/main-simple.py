"""
The Ownership Layer - Simplified Backend
Basic API server without heavy ML dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import hashlib
import json
from datetime import datetime
import uuid

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
    content_type: str
    timestamp: str
    metadata: Dict[str, Any]

# In-memory storage (replace with database in production)
fingerprints_db = {}

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "The Ownership Layer API",
        "version": "0.1.0",
        "status": "active",
        "note": "Simplified version - ML features require additional setup"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ownership-layer-api"}

# Simplified fingerprinting endpoint
@app.post("/api/fingerprint", response_model=FingerprintResponse)
async def create_fingerprint(content_input: ContentInput):
    """
    Generate a basic fingerprint for content
    Note: This is a simplified version without AI/ML features
    """
    try:
        # Generate basic hash-based fingerprint
        content_hash = hashlib.sha256(content_input.content.encode()).hexdigest()
        fingerprint_id = f"fp_{content_input.content_type}_{content_hash[:16]}"
        
        # Create fingerprint record
        fingerprint_data = {
            "fingerprint_id": fingerprint_id,
            "content_hash": content_hash,
            "content_type": content_input.content_type,
            "content": content_input.content[:200],  # Store preview
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": content_input.metadata or {}
        }
        
        # Store in memory (replace with database)
        fingerprints_db[fingerprint_id] = fingerprint_data
        
        return FingerprintResponse(
            fingerprint_id=fingerprint_id,
            content_hash=content_hash,
            content_type=content_input.content_type,
            timestamp=fingerprint_data["timestamp"],
            metadata=fingerprint_data["metadata"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating fingerprint: {str(e)}")

@app.get("/api/fingerprint/{fingerprint_id}")
async def get_fingerprint(fingerprint_id: str):
    """Get fingerprint by ID"""
    if fingerprint_id not in fingerprints_db:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    
    return fingerprints_db[fingerprint_id]

@app.get("/api/fingerprints")
async def list_fingerprints():
    """List all fingerprints"""
    return {
        "fingerprints": list(fingerprints_db.values()),
        "count": len(fingerprints_db)
    }

@app.post("/api/matches")
async def find_matches(content_input: ContentInput):
    """
    Find similar content matches
    Note: This is a simplified version using exact hash matching
    """
    content_hash = hashlib.sha256(content_input.content.encode()).hexdigest()
    
    matches = []
    for fp_id, fp_data in fingerprints_db.items():
        if fp_data["content_hash"] == content_hash:
            matches.append({
                "fingerprint_id": fp_id,
                "similarity_score": 1.0,  # Exact match
                "match_type": "exact"
            })
    
    return {
        "matches": matches,
        "query_hash": content_hash,
        "total_matches": len(matches)
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting The Ownership Layer API...")
    print("📝 Note: This is a simplified version without ML features")
    print("🔗 API Documentation: http://localhost:8000/docs")
    
    uvicorn.run(
        "main-simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
