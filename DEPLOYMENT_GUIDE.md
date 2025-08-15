# 🚀 PHASE 6: TESTNET DEPLOYMENT GUIDE

## Quick Start - Deploy to Base Sepolia in 5 Minutes

### Prerequisites ✅

1. **Install Node.js** (v18+): https://nodejs.org/
2. **Get Base Sepolia ETH**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
3. **Create Web3.Storage Account**: https://web3.storage/ (free)

### Step 1: Environment Setup 🔧

```bash
# Navigate to contracts directory
cd /Users/vinayanand/Documents/ownership-layer/contracts

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Step 2: Configure Environment Variables 📝

Edit `/Users/vinayanand/Documents/ownership-layer/contracts/.env`:

```env
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Web3.Storage API token (get from https://web3.storage/)
WEB3_STORAGE_TOKEN=your_web3_storage_token_here

# Optional: Block explorer API key for verification
BASESCAN_API_KEY=your_basescan_api_key_here
```

### Step 3: Deploy to Base Sepolia 🚀

```bash
# Run the deployment script
npm run deploy:testnet
```

This will:
- ✅ Upload NFT metadata to IPFS
- ✅ Deploy OwnershipCertificate contract
- ✅ Verify contract on BaseScan
- ✅ Save deployment info to files
- ✅ Generate environment variables for frontend

### Step 4: Update Frontend Configuration ⚙️

Copy the generated contract address to your web app:

```bash
# Navigate to web app
cd /Users/vinayanand/Documents/ownership-layer/apps/web

# Copy deployment environment
cp .env.deployment .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

### Step 5: Test Live Minting 🎯

1. Visit: http://localhost:3000/mint
2. Connect your wallet (same one used for deployment)
3. Switch to Base Sepolia network
4. Fill out the minting form
5. Click "Mint Certificate"
6. Confirm transaction in wallet
7. Watch for success modal with confetti! 🎉

---

## Detailed Deployment Process

### What Happens During Deployment

1. **IPFS Upload**:
   - Creates beautiful NFT image (SVG with gradient)
   - Uploads metadata.json with proper OpenSea format
   - Returns IPFS CIDs for image and metadata

2. **Contract Deployment**:
   - Deploys OwnershipCertificate.sol to Base Sepolia
   - Sets contract name: "Ownership Layer Certificate"
   - Sets symbol: "OLC"
   - Configures base token URI pointing to IPFS

3. **Verification**:
   - Automatically verifies contract on BaseScan
   - Makes contract source code public
   - Enables easy interaction through block explorer

4. **Configuration**:
   - Saves deployment info to `deployments/baseSepolia.json`
   - Generates `.env.deployment` for frontend
   - Provides explorer links and faucet URLs

### Expected Output

```
🚀 OWNERSHIP LAYER - TESTNET DEPLOYMENT
=====================================
📡 Network: baseSepolia
⛽ Gas Price: 1000000000 wei
👤 Deployer: 0x1234...5678
💰 Balance: 0.1 ETH

📦 Step 1: Uploading metadata to IPFS...
📸 Uploading NFT image...
✅ Image uploaded! CID: QmYourImageCID
📄 Uploading NFT metadata...
✅ Metadata uploaded! CID: QmYourMetadataCID
✅ IPFS upload successful!

🏗️  Step 2: Deploying OwnershipCertificate contract...
📝 Contract Name: Ownership Layer Certificate
🔤 Symbol: OLC
🌐 Base Token URI: ipfs://QmYourMetadataCID/

⏳ Waiting for deployment...
✅ Contract deployed to: 0xYourContractAddress
📋 Transaction hash: 0xYourTxHash

🔍 Step 3: Verifying deployment...
   Name: Ownership Layer Certificate
   Symbol: OLC
   Owner: 0x1234...5678

💾 Step 4: Saving deployment information...
   📄 Deployment info: deployments/baseSepolia.json
   🔧 Environment vars: ../../apps/web/.env.deployment

🔐 Step 5: Verifying contract on explorer...
✅ Contract verified successfully!

🎉 DEPLOYMENT COMPLETE!
=======================
📍 Network: baseSepolia
📄 Contract: 0xYourContractAddress
🔗 Explorer: https://sepolia.basescan.org/address/0xYourContractAddress
🖼️  NFT Image: https://QmYourImageCID.ipfs.w3s.link/ownership-nft.svg
📋 Metadata: https://QmYourMetadataCID.ipfs.w3s.link/metadata.json

🚰 Testnet Faucets:
   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   https://sepoliafaucet.com/

📝 Next Steps:
1. Copy the contract address to your .env.local file
2. Update your frontend to use the deployed contract
3. Test minting on the web interface
4. Share the explorer link to verify the contract
```

---

## Frontend Integration

### Environment Variables

Add to `/Users/vinayanand/Documents/ownership-layer/apps/web/.env.local`:

```env
# Contract address from deployment
NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# IPFS URLs from deployment
NEXT_PUBLIC_NFT_IMAGE_URL=https://QmYourImageCID.ipfs.w3s.link/ownership-nft.svg
NEXT_PUBLIC_NFT_METADATA_URL=https://QmYourMetadataCID.ipfs.w3s.link/metadata.json

# Explorer URL
NEXT_PUBLIC_BASE_SEPOLIA_EXPLORER_URL=https://sepolia.basescan.org/address/0xYourContractAddress

# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Testing Checklist

- [ ] Contract deployed to Base Sepolia
- [ ] Contract verified on BaseScan
- [ ] Frontend environment configured
- [ ] Wallet connected to Base Sepolia
- [ ] Sufficient testnet ETH for gas
- [ ] Minting form works
- [ ] Transaction succeeds
- [ ] Success modal appears
- [ ] NFT visible in wallet
- [ ] Explorer links work

---

## Troubleshooting

### Common Issues

1. **"Insufficient funds for gas"**
   - Get more Base Sepolia ETH from faucets
   - Check wallet is on correct network

2. **"Contract not found"**
   - Verify contract address in .env.local
   - Check network matches deployment

3. **"IPFS upload failed"**
   - Check Web3.Storage API token
   - Try alternative IPFS service (Pinata)

4. **"Transaction failed"**
   - Check gas price and limit
   - Verify contract function parameters

### Support Resources

- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **BaseScan Explorer**: https://sepolia.basescan.org/
- **Web3.Storage Docs**: https://web3.storage/docs/
- **Hardhat Docs**: https://hardhat.org/docs/

---

## 🎯 Ready to Deploy?

Run this command to start the deployment:

```bash
cd /Users/vinayanand/Documents/ownership-layer/contracts && npm run deploy:testnet
```

The entire process takes ~2-3 minutes and will give you a live, verified NFT contract on Base Sepolia! 🚀
