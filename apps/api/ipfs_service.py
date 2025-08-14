import os
import json
import hashlib
import requests
from typing import Dict, Any, Optional
from datetime import datetime
import base64
from io import BytesIO

class IPFSService:
    """Service for uploading NFT metadata to IPFS"""
    
    def __init__(self):
        self.web3_storage_token = os.getenv("WEB3_STORAGE_TOKEN")
        self.pinata_api_key = os.getenv("PINATA_API_KEY")
        self.pinata_secret_key = os.getenv("PINATA_SECRET_KEY")
        
        # Prefer Web3.Storage, fallback to Pinata
        self.use_web3_storage = bool(self.web3_storage_token)
        self.use_pinata = bool(self.pinata_api_key and self.pinata_secret_key)
        
        if not (self.use_web3_storage or self.use_pinata):
            print("Warning: No IPFS service configured. Using local fallback.")
    
    def create_nft_metadata(
        self,
        content_hash: str,
        sim_hash: str,
        content_type: str,
        content_preview: str,
        author_handle: str,
        author_wallet: str,
        tags: list,
        fingerprint_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create NFT metadata following OpenSea standard"""
        
        metadata = {
            "name": f"Ownership Certificate - {content_preview[:50]}{'...' if len(content_preview) > 50 else ''}",
            "description": f"Cryptographic proof of creation for {content_type} content by {author_handle or 'Anonymous'}. This NFT certifies original authorship and provides immutable attribution.",
            "image": self._generate_certificate_image_url(content_type, author_handle),
            "external_url": f"https://ownership-layer.com/proof/{content_hash}",
            "attributes": [
                {
                    "trait_type": "Content Type",
                    "value": content_type.title()
                },
                {
                    "trait_type": "Author Handle",
                    "value": author_handle or "Anonymous"
                },
                {
                    "trait_type": "Author Wallet",
                    "value": author_wallet
                },
                {
                    "trait_type": "Creation Date",
                    "display_type": "date",
                    "value": int(datetime.utcnow().timestamp())
                },
                {
                    "trait_type": "Content Hash",
                    "value": content_hash
                },
                {
                    "trait_type": "Similarity Hash",
                    "value": sim_hash
                },
                {
                    "trait_type": "Verified",
                    "value": "Pending"
                }
            ],
            "properties": {
                "content_hash": content_hash,
                "sim_hash": sim_hash,
                "content_type": content_type,
                "content_preview": content_preview,
                "author_handle": author_handle,
                "author_wallet": author_wallet,
                "tags": tags,
                "fingerprint_data": fingerprint_data,
                "created_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
        }
        
        # Add content-specific attributes
        if content_type == "text":
            metadata["attributes"].extend([
                {
                    "trait_type": "Word Count",
                    "display_type": "number",
                    "value": len(content_preview.split())
                },
                {
                    "trait_type": "Character Count",
                    "display_type": "number",
                    "value": len(content_preview)
                }
            ])
        elif content_type == "image":
            if "dimensions" in fingerprint_data:
                metadata["attributes"].append({
                    "trait_type": "Dimensions",
                    "value": f"{fingerprint_data['dimensions']['width']}x{fingerprint_data['dimensions']['height']}"
                })
        elif content_type == "audio":
            if "duration" in fingerprint_data:
                metadata["attributes"].append({
                    "trait_type": "Duration",
                    "display_type": "number",
                    "value": fingerprint_data["duration"]
                })
        elif content_type == "code":
            if "language" in fingerprint_data:
                metadata["attributes"].append({
                    "trait_type": "Programming Language",
                    "value": fingerprint_data["language"]
                })
        
        # Add tags as attributes
        for tag in tags[:5]:  # Limit to 5 tags
            metadata["attributes"].append({
                "trait_type": "Tag",
                "value": tag
            })
        
        return metadata
    
    def upload_metadata_to_ipfs(self, metadata: Dict[str, Any]) -> Optional[str]:
        """Upload metadata to IPFS and return the IPFS hash"""
        
        if self.use_web3_storage:
            return self._upload_to_web3_storage(metadata)
        elif self.use_pinata:
            return self._upload_to_pinata(metadata)
        else:
            return self._local_fallback(metadata)
    
    def _upload_to_web3_storage(self, metadata: Dict[str, Any]) -> Optional[str]:
        """Upload to Web3.Storage"""
        try:
            url = "https://api.web3.storage/upload"
            headers = {
                "Authorization": f"Bearer {self.web3_storage_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                url,
                headers=headers,
                data=json.dumps(metadata)
            )
            
            if response.status_code == 200:
                result = response.json()
                return f"ipfs://{result['cid']}"
            else:
                print(f"Web3.Storage upload failed: {response.text}")
                return None
                
        except Exception as e:
            print(f"Web3.Storage upload error: {e}")
            return None
    
    def _upload_to_pinata(self, metadata: Dict[str, Any]) -> Optional[str]:
        """Upload to Pinata"""
        try:
            url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
            headers = {
                "pinata_api_key": self.pinata_api_key,
                "pinata_secret_api_key": self.pinata_secret_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "pinataContent": metadata,
                "pinataMetadata": {
                    "name": f"ownership-certificate-{metadata['properties']['content_hash'][:8]}.json"
                }
            }
            
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                return f"ipfs://{result['IpfsHash']}"
            else:
                print(f"Pinata upload failed: {response.text}")
                return None
                
        except Exception as e:
            print(f"Pinata upload error: {e}")
            return None
    
    def _local_fallback(self, metadata: Dict[str, Any]) -> str:
        """Local fallback - generate a mock IPFS hash"""
        content_str = json.dumps(metadata, sort_keys=True)
        mock_hash = hashlib.sha256(content_str.encode()).hexdigest()
        return f"ipfs://Qm{mock_hash[:44]}"  # Mock IPFS hash format
    
    def _generate_certificate_image_url(self, content_type: str, author_handle: str) -> str:
        """Generate a certificate image URL (placeholder for now)"""
        # In production, this would generate a dynamic certificate image
        base_url = "https://ownership-layer.com/api/certificate-image"
        return f"{base_url}?type={content_type}&handle={author_handle or 'anonymous'}"
    
    def get_metadata_from_ipfs(self, ipfs_uri: str) -> Optional[Dict[str, Any]]:
        """Retrieve metadata from IPFS"""
        try:
            if ipfs_uri.startswith("ipfs://"):
                ipfs_hash = ipfs_uri[7:]  # Remove ipfs:// prefix
            else:
                ipfs_hash = ipfs_uri
            
            # Try multiple IPFS gateways
            gateways = [
                f"https://ipfs.io/ipfs/{ipfs_hash}",
                f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}",
                f"https://cloudflare-ipfs.com/ipfs/{ipfs_hash}"
            ]
            
            for gateway_url in gateways:
                try:
                    response = requests.get(gateway_url, timeout=10)
                    if response.status_code == 200:
                        return response.json()
                except:
                    continue
            
            return None
            
        except Exception as e:
            print(f"IPFS retrieval error: {e}")
            return None

# Global IPFS service instance
ipfs_service = IPFSService()
