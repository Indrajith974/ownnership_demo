from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, JSON
from datetime import datetime
from typing import Optional, Dict, List, Any
import os
import json
from web3 import Web3
from eth_account import Account
import hashlib

from database import get_db
from models import Base
from ipfs_service import ipfs_service
from user_profile_api import generate_user_id

# NFT Certificate Models
class NFTCertificate(Base):
    __tablename__ = "nft_certificates"
    
    id = Column(String, primary_key=True)
    fingerprint_id = Column(String, nullable=False, index=True)
    content_hash = Column(String, nullable=False, index=True)
    token_id = Column(Integer, nullable=True)  # Set after minting
    contract_address = Column(String, nullable=True)
    chain_id = Column(Integer, nullable=False)
    owner_address = Column(String, nullable=False, index=True)
    author_handle = Column(String, nullable=True)
    content_type = Column(String, nullable=False)
    content_preview = Column(Text, nullable=False)
    ipfs_metadata_uri = Column(String, nullable=True)
    transaction_hash = Column(String, nullable=True)
    mint_status = Column(String, default="pending")  # pending, minting, minted, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    minted_at = Column(DateTime, nullable=True)
    metadata = Column(JSON, default=dict)

# Pydantic Models
from pydantic import BaseModel

class NFTMintRequest(BaseModel):
    fingerprint_id: str
    content_hash: str
    content_type: str
    content_preview: str
    author_wallet: str
    author_handle: Optional[str] = None
    tags: List[str] = []
    chain_id: int = 137  # Polygon by default
    auto_mint: bool = True

class NFTCertificateResponse(BaseModel):
    id: str
    fingerprint_id: str
    content_hash: str
    token_id: Optional[int]
    contract_address: Optional[str]
    chain_id: int
    owner_address: str
    author_handle: Optional[str]
    content_type: str
    content_preview: str
    ipfs_metadata_uri: Optional[str]
    transaction_hash: Optional[str]
    mint_status: str
    created_at: datetime
    minted_at: Optional[datetime]
    opensea_url: Optional[str] = None
    blockchain_explorer_url: Optional[str] = None

class MintStatusResponse(BaseModel):
    certificate_id: str
    status: str
    transaction_hash: Optional[str]
    token_id: Optional[int]
    error_message: Optional[str] = None

# Router
router = APIRouter(prefix="/api/nft", tags=["nft"])

# Contract configurations
CONTRACTS = {
    137: {  # Polygon
        "address": os.getenv("POLYGON_CONTRACT_ADDRESS"),
        "rpc_url": os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com"),
        "explorer": "https://polygonscan.com",
        "opensea": "https://opensea.io/assets/matic"
    },
    80001: {  # Polygon Mumbai
        "address": os.getenv("POLYGON_MUMBAI_CONTRACT_ADDRESS"),
        "rpc_url": os.getenv("POLYGON_MUMBAI_RPC_URL", "https://rpc-mumbai.maticvigil.com"),
        "explorer": "https://mumbai.polygonscan.com",
        "opensea": "https://testnets.opensea.io/assets/mumbai"
    },
    8453: {  # Base
        "address": os.getenv("BASE_CONTRACT_ADDRESS"),
        "rpc_url": os.getenv("BASE_RPC_URL", "https://mainnet.base.org"),
        "explorer": "https://basescan.org",
        "opensea": "https://opensea.io/assets/base"
    },
    84532: {  # Base Sepolia
        "address": os.getenv("BASE_SEPOLIA_CONTRACT_ADDRESS"),
        "rpc_url": os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
        "explorer": "https://sepolia.basescan.org",
        "opensea": "https://testnets.opensea.io/assets/base-sepolia"
    }
}

# Contract ABI (simplified - in production, load from artifacts)
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "contentHash", "type": "string"},
            {"internalType": "string", "name": "simHash", "type": "string"},
            {"internalType": "string", "name": "contentType", "type": "string"},
            {"internalType": "string", "name": "contentPreview", "type": "string"},
            {"internalType": "string", "name": "authorHandle", "type": "string"},
            {"internalType": "string[]", "name": "tags", "type": "string[]"},
            {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
        "name": "mintCertificate",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "contentHash", "type": "string"}],
        "name": "isContentCertified",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def generate_certificate_id(content_hash: str, owner_address: str) -> str:
    """Generate unique certificate ID"""
    combined = f"{content_hash}:{owner_address}".lower()
    return hashlib.sha256(combined.encode()).hexdigest()[:16]

def get_web3_instance(chain_id: int) -> Web3:
    """Get Web3 instance for specific chain"""
    if chain_id not in CONTRACTS:
        raise ValueError(f"Unsupported chain ID: {chain_id}")
    
    rpc_url = CONTRACTS[chain_id]["rpc_url"]
    return Web3(Web3.HTTPProvider(rpc_url))

def get_contract_instance(chain_id: int, web3: Web3):
    """Get contract instance"""
    contract_address = CONTRACTS[chain_id]["address"]
    if not contract_address:
        raise ValueError(f"Contract not deployed on chain {chain_id}")
    
    return web3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=CONTRACT_ABI
    )

@router.post("/mint-certificate", response_model=NFTCertificateResponse)
async def mint_certificate(
    mint_request: NFTMintRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create and optionally mint an NFT certificate for content"""
    
    try:
        # Check if certificate already exists
        certificate_id = generate_certificate_id(mint_request.content_hash, mint_request.author_wallet)
        existing_cert = db.query(NFTCertificate).filter(NFTCertificate.id == certificate_id).first()
        
        if existing_cert:
            return NFTCertificateResponse.from_orm(existing_cert)
        
        # Check if content is already certified on-chain
        if mint_request.auto_mint:
            try:
                web3 = get_web3_instance(mint_request.chain_id)
                contract = get_contract_instance(mint_request.chain_id, web3)
                is_certified = contract.functions.isContentCertified(mint_request.content_hash).call()
                
                if is_certified:
                    raise HTTPException(
                        status_code=400, 
                        detail="Content is already certified on-chain"
                    )
            except Exception as e:
                print(f"On-chain check failed: {e}")
        
        # Create certificate record
        certificate = NFTCertificate(
            id=certificate_id,
            fingerprint_id=mint_request.fingerprint_id,
            content_hash=mint_request.content_hash,
            chain_id=mint_request.chain_id,
            owner_address=mint_request.author_wallet.lower(),
            author_handle=mint_request.author_handle,
            content_type=mint_request.content_type,
            content_preview=mint_request.content_preview[:500],  # Truncate if too long
            mint_status="pending" if mint_request.auto_mint else "created",
            metadata={
                "tags": mint_request.tags,
                "auto_mint": mint_request.auto_mint
            }
        )
        
        db.add(certificate)
        db.commit()
        db.refresh(certificate)
        
        # Start minting process in background if requested
        if mint_request.auto_mint:
            background_tasks.add_task(
                mint_nft_background,
                certificate_id,
                mint_request.dict()
            )
        
        return NFTCertificateResponse.from_orm(certificate)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certificate creation failed: {str(e)}")

@router.get("/certificate/{certificate_id}", response_model=NFTCertificateResponse)
async def get_certificate(certificate_id: str, db: Session = Depends(get_db)):
    """Get certificate by ID"""
    certificate = db.query(NFTCertificate).filter(NFTCertificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    response = NFTCertificateResponse.from_orm(certificate)
    
    # Add URLs if minted
    if certificate.token_id and certificate.contract_address:
        chain_config = CONTRACTS.get(certificate.chain_id, {})
        response.opensea_url = f"{chain_config.get('opensea', '')}/{certificate.contract_address}/{certificate.token_id}"
        response.blockchain_explorer_url = f"{chain_config.get('explorer', '')}/token/{certificate.contract_address}?a={certificate.token_id}"
    
    return response

@router.get("/certificates/by-owner/{owner_address}")
async def get_certificates_by_owner(
    owner_address: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all certificates owned by an address"""
    certificates = db.query(NFTCertificate).filter(
        NFTCertificate.owner_address == owner_address.lower()
    ).offset(offset).limit(limit).all()
    
    return [NFTCertificateResponse.from_orm(cert) for cert in certificates]

@router.get("/certificates/by-handle/{handle}")
async def get_certificates_by_handle(
    handle: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all certificates by author handle"""
    certificates = db.query(NFTCertificate).filter(
        NFTCertificate.author_handle == handle.lower()
    ).offset(offset).limit(limit).all()
    
    return [NFTCertificateResponse.from_orm(cert) for cert in certificates]

@router.get("/mint-status/{certificate_id}", response_model=MintStatusResponse)
async def get_mint_status(certificate_id: str, db: Session = Depends(get_db)):
    """Get minting status of a certificate"""
    certificate = db.query(NFTCertificate).filter(NFTCertificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    return MintStatusResponse(
        certificate_id=certificate_id,
        status=certificate.mint_status,
        transaction_hash=certificate.transaction_hash,
        token_id=certificate.token_id
    )

@router.post("/retry-mint/{certificate_id}")
async def retry_mint(
    certificate_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Retry minting a failed certificate"""
    certificate = db.query(NFTCertificate).filter(NFTCertificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if certificate.mint_status == "minted":
        raise HTTPException(status_code=400, detail="Certificate already minted")
    
    # Reset status and retry
    certificate.mint_status = "pending"
    db.commit()
    
    mint_request_data = {
        "fingerprint_id": certificate.fingerprint_id,
        "content_hash": certificate.content_hash,
        "content_type": certificate.content_type,
        "content_preview": certificate.content_preview,
        "author_wallet": certificate.owner_address,
        "author_handle": certificate.author_handle,
        "tags": certificate.metadata.get("tags", []),
        "chain_id": certificate.chain_id,
        "auto_mint": True
    }
    
    background_tasks.add_task(mint_nft_background, certificate_id, mint_request_data)
    
    return {"message": "Minting retry initiated"}

# Background task for minting
async def mint_nft_background(certificate_id: str, mint_data: Dict[str, Any]):
    """Background task to mint NFT"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        certificate = db.query(NFTCertificate).filter(NFTCertificate.id == certificate_id).first()
        if not certificate:
            return
        
        # Update status to minting
        certificate.mint_status = "minting"
        db.commit()
        
        # Get fingerprint data for metadata
        from models import ContentFingerprint
        fingerprint = db.query(ContentFingerprint).filter(
            ContentFingerprint.id == certificate.fingerprint_id
        ).first()
        
        if not fingerprint:
            certificate.mint_status = "failed"
            db.commit()
            return
        
        # Create metadata
        metadata = ipfs_service.create_nft_metadata(
            content_hash=mint_data["content_hash"],
            sim_hash=fingerprint.similarity_hash or "",
            content_type=mint_data["content_type"],
            content_preview=mint_data["content_preview"],
            author_handle=mint_data.get("author_handle", ""),
            author_wallet=mint_data["author_wallet"],
            tags=mint_data.get("tags", []),
            fingerprint_data=fingerprint.fingerprint_data or {}
        )
        
        # Upload metadata to IPFS
        ipfs_uri = ipfs_service.upload_metadata_to_ipfs(metadata)
        if not ipfs_uri:
            certificate.mint_status = "failed"
            db.commit()
            return
        
        certificate.ipfs_metadata_uri = ipfs_uri
        db.commit()
        
        # Mint NFT on blockchain
        success, result = await mint_on_blockchain(certificate, mint_data, ipfs_uri, db)
        
        if success:
            certificate.mint_status = "minted"
            certificate.token_id = result.get("token_id")
            certificate.transaction_hash = result.get("transaction_hash")
            certificate.contract_address = result.get("contract_address")
            certificate.minted_at = datetime.utcnow()
        else:
            certificate.mint_status = "failed"
            certificate.metadata["error"] = result.get("error", "Unknown error")
        
        db.commit()
        
    except Exception as e:
        print(f"Minting background task error: {e}")
        certificate.mint_status = "failed"
        certificate.metadata["error"] = str(e)
        db.commit()
    finally:
        db.close()

async def mint_on_blockchain(certificate: NFTCertificate, mint_data: Dict[str, Any], ipfs_uri: str, db: Session) -> tuple:
    """Mint NFT on blockchain"""
    try:
        # Get Web3 and contract instances
        web3 = get_web3_instance(certificate.chain_id)
        contract = get_contract_instance(certificate.chain_id, web3)
        
        # Get private key for minting (in production, use secure key management)
        private_key = os.getenv("MINTING_PRIVATE_KEY")
        if not private_key:
            return False, {"error": "Minting private key not configured"}
        
        account = Account.from_key(private_key)
        
        # Build transaction
        function_call = contract.functions.mintCertificate(
            Web3.to_checksum_address(mint_data["author_wallet"]),
            mint_data["content_hash"],
            certificate.metadata.get("sim_hash", ""),
            mint_data["content_type"],
            mint_data["content_preview"][:100],  # Limit preview length
            mint_data.get("author_handle", ""),
            mint_data.get("tags", [])[:5],  # Limit tags
            ipfs_uri
        )
        
        # Estimate gas
        gas_estimate = function_call.estimate_gas({"from": account.address})
        
        # Build transaction
        transaction = function_call.build_transaction({
            "from": account.address,
            "gas": int(gas_estimate * 1.2),  # Add 20% buffer
            "gasPrice": web3.eth.gas_price,
            "nonce": web3.eth.get_transaction_count(account.address),
        })
        
        # Sign and send transaction
        signed_txn = web3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for confirmation
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        if receipt.status == 1:  # Success
            # Extract token ID from logs (simplified)
            token_id = None
            for log in receipt.logs:
                try:
                    decoded = contract.events.CertificateMinted().process_log(log)
                    token_id = decoded.args.tokenId
                    break
                except:
                    continue
            
            return True, {
                "transaction_hash": receipt.transactionHash.hex(),
                "token_id": token_id,
                "contract_address": contract.address,
                "block_number": receipt.blockNumber
            }
        else:
            return False, {"error": "Transaction failed"}
        
    except Exception as e:
        return False, {"error": str(e)}
