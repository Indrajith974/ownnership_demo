"""
Supabase Integration for Backend API
Provides real-time data synchronization, user management, and analytics tracking.
"""

import os
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import logging
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from fastapi import HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseIntegration:
    """
    Handles all Supabase operations for real-time data sync and user management.
    """
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Service role key for backend
        self.supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        self.client: Optional[Client] = None
        self.is_enabled = False
        
        if self.supabase_url and self.supabase_key:
            try:
                # Use service role key for backend operations
                self.client = create_client(
                    self.supabase_url, 
                    self.supabase_key,
                    options=ClientOptions(
                        auto_refresh_token=True,
                        persist_session=True
                    )
                )
                self.is_enabled = True
                logger.info("✅ Supabase integration enabled")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase client: {e}")
                self.is_enabled = False
        else:
            logger.warning("⚠️ Supabase credentials not found. Integration disabled.")
    
    async def sync_user_profile(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Sync user profile data to Supabase profiles table.
        """
        if not self.is_enabled:
            return None
            
        try:
            profile_data = {
                'id': user_data.get('id'),
                'email': user_data.get('email'),
                'username': user_data.get('username'),
                'full_name': user_data.get('full_name'),
                'wallet_address': user_data.get('wallet_address'),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Remove None values
            profile_data = {k: v for k, v in profile_data.items() if v is not None}
            
            # Upsert profile
            result = self.client.table('profiles').upsert(profile_data).execute()
            
            if result.data:
                logger.info(f"✅ Profile synced for user {user_data.get('email')}")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to sync profile: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error syncing user profile: {e}")
            return None
    
    async def create_fingerprint(self, fingerprint_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new content fingerprint in Supabase.
        """
        if not self.is_enabled:
            return None
            
        try:
            # Prepare fingerprint data for Supabase
            supabase_data = {
                'user_id': fingerprint_data.get('user_id'),
                'hash': fingerprint_data.get('hash'),
                'title': fingerprint_data.get('title'),
                'description': fingerprint_data.get('description'),
                'content_type': fingerprint_data.get('content_type'),
                'tags': fingerprint_data.get('tags', []),
                'content_metadata': fingerprint_data.get('content_metadata', {}),
                'source_url': fingerprint_data.get('source_url'),
                'platform': fingerprint_data.get('platform'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Remove None values
            supabase_data = {k: v for k, v in supabase_data.items() if v is not None}
            
            result = self.client.table('fingerprints').insert(supabase_data).execute()
            
            if result.data:
                logger.info(f"✅ Fingerprint created: {fingerprint_data.get('hash')[:8]}...")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to create fingerprint: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating fingerprint: {e}")
            return None
    
    async def create_nft_mint(self, mint_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new NFT mint record in Supabase.
        """
        if not self.is_enabled:
            return None
            
        try:
            supabase_data = {
                'user_id': mint_data.get('user_id'),
                'fingerprint_id': mint_data.get('fingerprint_id'),
                'token_id': mint_data.get('token_id'),
                'contract_address': mint_data.get('contract_address'),
                'chain_id': mint_data.get('chain_id'),
                'transaction_hash': mint_data.get('transaction_hash'),
                'mint_status': mint_data.get('mint_status', 'pending'),
                'metadata_uri': mint_data.get('metadata_uri'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Remove None values
            supabase_data = {k: v for k, v in supabase_data.items() if v is not None}
            
            result = self.client.table('nft_mints').insert(supabase_data).execute()
            
            if result.data:
                logger.info(f"✅ NFT mint record created: {mint_data.get('token_id')}")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to create NFT mint: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating NFT mint: {e}")
            return None
    
    async def track_analytics_event(self, user_id: str, event_type: str, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Track an analytics event in Supabase.
        """
        if not self.is_enabled:
            return None
            
        try:
            analytics_data = {
                'user_id': user_id,
                'event_type': event_type,
                'event_data': event_data,
                'created_at': datetime.utcnow().isoformat()
            }
            
            result = self.client.table('analytics_events').insert(analytics_data).execute()
            
            if result.data:
                logger.info(f"✅ Analytics event tracked: {event_type} for user {user_id}")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to track analytics: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error tracking analytics: {e}")
            return None
    
    async def get_user_fingerprints(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all fingerprints for a user from Supabase.
        """
        if not self.is_enabled:
            return []
            
        try:
            result = self.client.table('fingerprints')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"❌ Error getting user fingerprints: {e}")
            return []
    
    async def get_user_nfts(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all NFT mints for a user from Supabase.
        """
        if not self.is_enabled:
            return []
            
        try:
            result = self.client.table('nft_mints')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"❌ Error getting user NFTs: {e}")
            return []
    
    async def get_user_analytics(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get analytics events for a user from Supabase.
        """
        if not self.is_enabled:
            return []
            
        try:
            result = self.client.table('analytics_events')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"❌ Error getting user analytics: {e}")
            return []
    
    async def update_wallet_address(self, user_id: str, wallet_address: str) -> Optional[Dict[str, Any]]:
        """
        Update user's wallet address in Supabase profile.
        """
        if not self.is_enabled:
            return None
            
        try:
            result = self.client.table('profiles')\
                .update({'wallet_address': wallet_address, 'updated_at': datetime.utcnow().isoformat()})\
                .eq('id', user_id)\
                .execute()
            
            if result.data:
                logger.info(f"✅ Wallet address updated for user {user_id}")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to update wallet address: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error updating wallet address: {e}")
            return None
    
    async def search_content_matches(self, content_hash: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Search for content matches across all fingerprints.
        """
        if not self.is_enabled:
            return []
            
        try:
            # Search for exact hash matches
            result = self.client.table('fingerprints')\
                .select('*')\
                .eq('hash', content_hash)\
                .neq('user_id', user_id)\
                .execute()
            
            matches = result.data or []
            
            # Track the search event
            await self.track_analytics_event(
                user_id, 
                'content_search', 
                {'content_hash': content_hash, 'matches_found': len(matches)}
            )
            
            return matches
            
        except Exception as e:
            logger.error(f"❌ Error searching content matches: {e}")
            return []
    
    async def create_cross_match(self, user_id: str, fingerprint_id: str, matched_fingerprint_id: str) -> Optional[Dict[str, Any]]:
        """
        Create a cross-match record when content matches are found.
        """
        if not self.is_enabled:
            return None
            
        try:
            match_data = {
                'user_id': user_id,
                'fingerprint_id': fingerprint_id,
                'matched_fingerprint_id': matched_fingerprint_id,
                'match_type': 'exact_hash',
                'confidence_score': 1.0,
                'created_at': datetime.utcnow().isoformat()
            }
            
            result = self.client.table('cross_matches').insert(match_data).execute()
            
            if result.data:
                logger.info(f"✅ Cross-match created between {fingerprint_id} and {matched_fingerprint_id}")
                return result.data[0]
            else:
                logger.error(f"❌ Failed to create cross-match: {result}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating cross-match: {e}")
            return None

# Global instance
supabase_integration = SupabaseIntegration()

# Helper functions for easy access
async def sync_user_to_supabase(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Sync user profile to Supabase."""
    return await supabase_integration.sync_user_profile(user_data)

async def create_fingerprint_in_supabase(fingerprint_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create fingerprint in Supabase."""
    return await supabase_integration.create_fingerprint(fingerprint_data)

async def create_nft_in_supabase(mint_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create NFT mint record in Supabase."""
    return await supabase_integration.create_nft_mint(mint_data)

async def track_event_in_supabase(user_id: str, event_type: str, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Track analytics event in Supabase."""
    return await supabase_integration.track_analytics_event(user_id, event_type, event_data)

async def update_user_wallet_in_supabase(user_id: str, wallet_address: str) -> Optional[Dict[str, Any]]:
    """Update user wallet address in Supabase."""
    return await supabase_integration.update_wallet_address(user_id, wallet_address)
