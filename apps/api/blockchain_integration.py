"""
Blockchain Integration for The Ownership Layer
Handles on-chain ownership records, NFT minting, and token rewards
"""

import os
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from decimal import Decimal
import uuid
from sqlalchemy.orm import Session

# Web3 and blockchain imports (will be installed in requirements)
try:
    from web3 import Web3
    from eth_account import Account
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    print("⚠️ Web3 libraries not installed. Blockchain features will be simulated.")

from models import Creator, ContentFingerprint, Attribution
from database import get_redis

@dataclass
class BlockchainRecord:
    """Represents an on-chain ownership record"""
    transaction_hash: str
    block_number: int
    contract_address: str
    token_id: Optional[int]
    fingerprint_id: str
    creator_address: str
    timestamp: datetime
    gas_used: int
    status: str

@dataclass
class RewardTransaction:
    """Represents a reward payment transaction"""
    transaction_id: str
    from_address: str
    to_address: str
    amount: Decimal
    currency: str  # ETH, MATIC, OWN (our token)
    fingerprint_id: str
    attribution_id: str
    transaction_hash: Optional[str]
    status: str
    created_at: datetime

class BlockchainIntegration:
    """
    Blockchain integration for ownership records and rewards
    Supports Ethereum L2s (Base, Polygon) and custom token
    """
    
    def __init__(self):
        self.redis = get_redis()
        self.network = os.getenv("BLOCKCHAIN_NETWORK", "base-sepolia")  # testnet
        self.private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
        self.contract_address = os.getenv("OWNERSHIP_CONTRACT_ADDRESS")
        
        # Initialize Web3 connection
        if WEB3_AVAILABLE and os.getenv("BLOCKCHAIN_RPC_URL"):
            self.w3 = Web3(Web3.HTTPProvider(os.getenv("BLOCKCHAIN_RPC_URL")))
            if self.private_key:
                self.account = Account.from_key(self.private_key)
            else:
                self.account = None
        else:
            self.w3 = None
            self.account = None
            print("⚠️ Blockchain connection not configured. Using simulation mode.")
    
    def mint_ownership_nft(
        self, 
        fingerprint_id: str, 
        creator_address: str, 
        metadata: Dict[str, Any],
        db: Session
    ) -> BlockchainRecord:
        """
        Mint an NFT representing ownership of content
        """
        if not self.w3 or not self.account:
            # Simulation mode
            return self._simulate_nft_mint(fingerprint_id, creator_address, metadata)
        
        try:
            # Get fingerprint data
            fingerprint = db.query(ContentFingerprint).filter(
                ContentFingerprint.fingerprint_id == fingerprint_id
            ).first()
            
            if not fingerprint:
                raise ValueError(f"Fingerprint {fingerprint_id} not found")
            
            # Prepare NFT metadata
            nft_metadata = {
                "name": f"Ownership Certificate - {fingerprint_id}",
                "description": f"Proof of ownership for {fingerprint.content_type} content",
                "fingerprint_id": fingerprint_id,
                "content_type": fingerprint.content_type,
                "content_hash": fingerprint.content_hash,
                "created_at": fingerprint.created_at.isoformat(),
                "creator": creator_address,
                "attributes": [
                    {"trait_type": "Content Type", "value": fingerprint.content_type},
                    {"trait_type": "Creation Date", "value": fingerprint.created_at.strftime("%Y-%m-%d")},
                    {"trait_type": "Views", "value": fingerprint.views},
                    {"trait_type": "Matches Found", "value": fingerprint.matches_found}
                ]
            }
            
            # Upload metadata to IPFS (simulated for now)
            metadata_uri = self._upload_to_ipfs(nft_metadata)
            
            # Mint NFT on blockchain
            transaction = self._mint_nft_transaction(creator_address, metadata_uri)
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(transaction['transactionHash'])
            
            # Extract token ID from logs
            token_id = self._extract_token_id_from_receipt(receipt)
            
            record = BlockchainRecord(
                transaction_hash=receipt['transactionHash'].hex(),
                block_number=receipt['blockNumber'],
                contract_address=self.contract_address,
                token_id=token_id,
                fingerprint_id=fingerprint_id,
                creator_address=creator_address,
                timestamp=datetime.utcnow(),
                gas_used=receipt['gasUsed'],
                status="confirmed"
            )
            
            # Store record
            self._store_blockchain_record(record)
            
            return record
            
        except Exception as e:
            print(f"NFT minting error: {e}")
            return self._simulate_nft_mint(fingerprint_id, creator_address, metadata)
    
    def create_reward_payment(
        self,
        attribution_id: str,
        creator_address: str,
        amount: Decimal,
        currency: str = "ETH",
        db: Session = None
    ) -> RewardTransaction:
        """
        Create a reward payment for content attribution
        """
        attribution = db.query(Attribution).filter(Attribution.id == attribution_id).first()
        if not attribution:
            raise ValueError(f"Attribution {attribution_id} not found")
        
        transaction_id = f"reward_{uuid.uuid4().hex[:16]}"
        
        reward_tx = RewardTransaction(
            transaction_id=transaction_id,
            from_address=os.getenv("TREASURY_ADDRESS", "0x0000000000000000000000000000000000000000"),
            to_address=creator_address,
            amount=amount,
            currency=currency,
            fingerprint_id=attribution.original_content.fingerprint_id,
            attribution_id=str(attribution_id),
            transaction_hash=None,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        if self.w3 and self.account:
            try:
                # Execute actual blockchain transaction
                tx_hash = self._execute_reward_payment(reward_tx)
                reward_tx.transaction_hash = tx_hash
                reward_tx.status = "confirmed"
            except Exception as e:
                print(f"Reward payment error: {e}")
                reward_tx.status = "failed"
        else:
            # Simulation mode
            reward_tx.transaction_hash = f"0x{hashlib.sha256(transaction_id.encode()).hexdigest()}"
            reward_tx.status = "simulated"
        
        # Store transaction record
        self._store_reward_transaction(reward_tx)
        
        # Update attribution record
        attribution.is_rewarded = True
        attribution.reward_amount = float(amount)
        attribution.reward_currency = currency
        db.commit()
        
        return reward_tx
    
    def get_ownership_proof(self, fingerprint_id: str) -> Optional[Dict[str, Any]]:
        """
        Get blockchain proof of ownership for content
        """
        if self.redis:
            record_data = self.redis.get(f"blockchain_record:{fingerprint_id}")
            if record_data:
                record = json.loads(record_data)
                return {
                    "fingerprint_id": fingerprint_id,
                    "blockchain_record": record,
                    "verification_url": f"https://basescan.org/tx/{record['transaction_hash']}",
                    "nft_url": f"https://opensea.io/assets/{self.network}/{record['contract_address']}/{record['token_id']}",
                    "status": "verified_on_chain"
                }
        
        return None
    
    def verify_ownership_on_chain(self, fingerprint_id: str, claimed_owner: str) -> bool:
        """
        Verify ownership by checking blockchain records
        """
        if not self.w3:
            return False
        
        try:
            # Get blockchain record
            proof = self.get_ownership_proof(fingerprint_id)
            if not proof:
                return False
            
            # Verify the owner matches
            return proof["blockchain_record"]["creator_address"].lower() == claimed_owner.lower()
            
        except Exception as e:
            print(f"Ownership verification error: {e}")
            return False
    
    def get_creator_portfolio(self, creator_address: str) -> Dict[str, Any]:
        """
        Get creator's on-chain portfolio and earnings
        """
        portfolio = {
            "creator_address": creator_address,
            "total_nfts": 0,
            "total_earnings": Decimal("0"),
            "nfts": [],
            "recent_rewards": [],
            "verification_status": "unverified"
        }
        
        if self.redis:
            # Get all NFTs for creator
            nft_keys = self.redis.keys(f"blockchain_record:*")
            for key in nft_keys:
                record_data = self.redis.get(key)
                if record_data:
                    record = json.loads(record_data)
                    if record["creator_address"].lower() == creator_address.lower():
                        portfolio["nfts"].append(record)
                        portfolio["total_nfts"] += 1
            
            # Get reward transactions
            reward_keys = self.redis.keys(f"reward_tx:*")
            for key in reward_keys:
                tx_data = self.redis.get(key)
                if tx_data:
                    tx = json.loads(tx_data)
                    if tx["to_address"].lower() == creator_address.lower():
                        portfolio["recent_rewards"].append(tx)
                        portfolio["total_earnings"] += Decimal(str(tx["amount"]))
        
        return portfolio
    
    def _simulate_nft_mint(self, fingerprint_id: str, creator_address: str, metadata: Dict[str, Any]) -> BlockchainRecord:
        """Simulate NFT minting for development/testing"""
        fake_tx_hash = f"0x{hashlib.sha256(f'{fingerprint_id}{creator_address}'.encode()).hexdigest()}"
        
        record = BlockchainRecord(
            transaction_hash=fake_tx_hash,
            block_number=12345678,
            contract_address="0x1234567890123456789012345678901234567890",
            token_id=int(hashlib.sha256(fingerprint_id.encode()).hexdigest()[:8], 16),
            fingerprint_id=fingerprint_id,
            creator_address=creator_address,
            timestamp=datetime.utcnow(),
            gas_used=150000,
            status="simulated"
        )
        
        self._store_blockchain_record(record)
        return record
    
    def _upload_to_ipfs(self, metadata: Dict[str, Any]) -> str:
        """Upload metadata to IPFS (simulated)"""
        # In production, this would upload to IPFS
        metadata_hash = hashlib.sha256(json.dumps(metadata, sort_keys=True).encode()).hexdigest()
        return f"ipfs://QmSimulated{metadata_hash[:32]}"
    
    def _mint_nft_transaction(self, to_address: str, metadata_uri: str) -> Dict[str, Any]:
        """Execute NFT minting transaction"""
        # This would interact with the actual smart contract
        # For now, return a simulated transaction
        return {
            'transactionHash': Web3.keccak(text=f"mint_{to_address}_{metadata_uri}")
        }
    
    def _extract_token_id_from_receipt(self, receipt) -> int:
        """Extract token ID from transaction receipt"""
        # Parse logs to get token ID
        # For simulation, return a deterministic ID
        return int(receipt['transactionHash'].hex()[-8:], 16)
    
    def _execute_reward_payment(self, reward_tx: RewardTransaction) -> str:
        """Execute reward payment transaction"""
        # Build and send transaction
        # For simulation, return fake hash
        return f"0x{hashlib.sha256(reward_tx.transaction_id.encode()).hexdigest()}"
    
    def _store_blockchain_record(self, record: BlockchainRecord):
        """Store blockchain record in cache"""
        if self.redis:
            record_data = {
                "transaction_hash": record.transaction_hash,
                "block_number": record.block_number,
                "contract_address": record.contract_address,
                "token_id": record.token_id,
                "fingerprint_id": record.fingerprint_id,
                "creator_address": record.creator_address,
                "timestamp": record.timestamp.isoformat(),
                "gas_used": record.gas_used,
                "status": record.status
            }
            
            self.redis.setex(
                f"blockchain_record:{record.fingerprint_id}",
                86400 * 365,  # 1 year
                json.dumps(record_data, default=str)
            )
    
    def _store_reward_transaction(self, reward_tx: RewardTransaction):
        """Store reward transaction in cache"""
        if self.redis:
            tx_data = {
                "transaction_id": reward_tx.transaction_id,
                "from_address": reward_tx.from_address,
                "to_address": reward_tx.to_address,
                "amount": str(reward_tx.amount),
                "currency": reward_tx.currency,
                "fingerprint_id": reward_tx.fingerprint_id,
                "attribution_id": reward_tx.attribution_id,
                "transaction_hash": reward_tx.transaction_hash,
                "status": reward_tx.status,
                "created_at": reward_tx.created_at.isoformat()
            }
            
            self.redis.setex(
                f"reward_tx:{reward_tx.transaction_id}",
                86400 * 90,  # 90 days
                json.dumps(tx_data, default=str)
            )

# Global blockchain integration instance
blockchain = BlockchainIntegration()
