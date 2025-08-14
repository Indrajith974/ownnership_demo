# NFT Minting System Setup Guide

## Overview
This guide will help you set up and test the complete NFT minting system for the Ownership Layer project. The system includes a React hook for minting, a comprehensive UI component, and a dedicated mint page.

## Prerequisites

### 1. Install Node.js and npm
```bash
# Install Node.js (version 18 or higher recommended)
# Visit https://nodejs.org/ or use a package manager:

# Using Homebrew (macOS)
brew install node

# Using nvm (recommended for version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Install Dependencies
```bash
# Navigate to the web app directory
cd /Users/vinayanand/Documents/ownership-layer/apps/web

# Install all dependencies
npm install

# If you encounter any issues, try:
npm install --legacy-peer-deps
```

## Environment Setup

### 1. Create Environment Variables
Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

### 2. Required Environment Variables
Update your `.env.local` file with the following:

```env
# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Contract Addresses (update with your deployed contracts)
NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_POLYGON_MUMBAI_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# RPC URLs (optional - uses public RPCs by default)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.base.org

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# IPFS Storage
WEB3_STORAGE_TOKEN=your_web3_storage_token
PINATA_JWT=your_pinata_jwt_token

# Blockchain
MINTING_PRIVATE_KEY=your_private_key_for_minting

# Block Explorers
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

## Smart Contract Deployment

### 1. Deploy Contracts
```bash
# Navigate to contracts directory
cd /Users/vinayanand/Documents/ownership-layer/contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to testnet (Mumbai)
npm run deploy:mumbai

# Deploy to mainnet (Polygon)
npm run deploy:polygon
```

### 2. Update Contract Addresses
After deployment, update the contract addresses in your `.env.local` file with the deployed addresses.

## Running the Application

### 1. Start the Backend API
```bash
# Navigate to API directory
cd /Users/vinayanand/Documents/ownership-layer/apps/api

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

### 2. Start the Web Application
```bash
# Navigate to web app directory
cd /Users/vinayanand/Documents/ownership-layer/apps/web

# Start the development server
npm run dev
```

### 3. Access the Application
Open your browser and navigate to:
- Main app: http://localhost:3000
- Mint page: http://localhost:3000/mint
- Certificates: http://localhost:3000/certificates

## Testing the Minting System

### 1. Connect Your Wallet
1. Visit http://localhost:3000/mint
2. Click "Connect Wallet" in the navigation
3. Select your preferred wallet (MetaMask, WalletConnect, etc.)
4. Sign the SIWE message to authenticate

### 2. Test Minting Flow
1. Fill out the content form:
   - Select content type (Text, Image, Audio, Code)
   - Enter content preview (up to 500 characters)
   - Add optional tags
   - Wait for automatic hash generation

2. Click the "Mint Certificate" button
3. Confirm the transaction in your wallet
4. Watch for:
   - Loading state with spinner
   - Success state with confetti animation
   - Transaction hash and blockchain explorer link
   - Toast notifications for feedback

### 3. Verify Minting
1. Check your wallet for the new NFT
2. Visit the Certificates page to see your minted NFTs
3. Click on blockchain explorer links to verify on-chain data

## Key Components Created

### 1. Minting Hook (`useMintOwnershipNFT`)
- **Location**: `/hooks/use-mint-ownership-nft.ts`
- **Features**:
  - Dynamic contract address loading per chain
  - Transaction status tracking
  - Error handling with toast notifications
  - Token ID extraction from transaction logs

### 2. MintButton Component
- **Location**: `/components/nft/mint-button.tsx`
- **Features**:
  - Loading, success, and error states
  - Confetti animation on success
  - Blockchain explorer integration
  - Responsive design with Tailwind CSS

### 3. ClaimNFTSection Component
- **Location**: `/components/nft/claim-nft-section.tsx`
- **Features**:
  - Content type selection
  - Automatic hash generation
  - Tag management
  - Form validation
  - Responsive layout

### 4. Mint Page
- **Location**: `/app/mint/page.tsx`
- **Features**:
  - Wallet connection checks
  - Authentication requirements
  - Clean, focused UI for minting

### 5. Navigation Component
- **Location**: `/components/navigation.tsx`
- **Features**:
  - Responsive navigation with mobile support
  - Wallet connection integration
  - Theme toggle
  - Mint page link

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Install dependencies first with `npm install`
2. **Wallet Connection Issues**: Ensure WalletConnect project ID is set
3. **Contract Errors**: Verify contract addresses and network configuration
4. **IPFS Upload Failures**: Check Web3.Storage and Pinata API keys
5. **Transaction Failures**: Ensure sufficient gas and correct network

### Development Tips

1. **Use Testnets**: Start with Mumbai or Base Sepolia for testing
2. **Check Console**: Browser console shows detailed error messages
3. **Network Switching**: Ensure wallet is on the correct network
4. **Gas Estimation**: Monitor gas prices for successful transactions

## Next Steps

1. **Deploy Contracts**: Deploy to your preferred networks
2. **Configure Environment**: Update all environment variables
3. **Test Thoroughly**: Test minting on testnets before mainnet
4. **Add Monitoring**: Implement transaction monitoring and error tracking
5. **Enhance UI**: Add more animations and user feedback
6. **Integrate Backend**: Connect with fingerprinting and metadata APIs

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify environment variable configuration
3. Ensure all dependencies are installed
4. Test on testnets first before mainnet deployment

The minting system is now complete and ready for testing and deployment!
