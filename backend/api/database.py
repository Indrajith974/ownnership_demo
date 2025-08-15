"""
Database configuration and connection management
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from api.models import Base
from typing import Generator
import redis

# Database configuration - Force SQLite for development
DATABASE_URL = "sqlite:///./ownership_layer.db"

# Create SQLite engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True  # Set to False in production
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    print("SUCCESS: Redis connected successfully")
except Exception as e:
    print(f"WARNING: Redis connection failed: {e}")
    redis_client = None

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("SUCCESS: Database tables created")

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_redis():
    """Get Redis client"""
    return redis_client

# Initialize database on import
create_tables()
