# API Keys & Environment Setup Guide

This guide helps you obtain all required API keys and tokens for The Ownership Layer project.

## 🔑 Required API Keys

### 1. Blockchain Explorer APIs

#### PolygonScan API Key
- **Website**: https://polygonscan.com/
- **Steps**:
  1. Register account
  2. Go to "API-KEYs" in dashboard
  3. Click "Add" → Name: "Ownership Layer"
  4. Copy the generated key
- **Usage**: Verify NFT transactions on Polygon network
- **Rate Limit**: 5 calls/second (free tier)

#### BaseScan API Key  
- **Website**: https://basescan.org/
- **Steps**:
  1. Register account
  2. Go to "API-KEYs" in dashboard
  3. Click "Add" → Name: "Ownership Layer"
  4. Copy the generated key
- **Usage**: Verify NFT transactions on Base network
- **Rate Limit**: 5 calls/second (free tier)

### 2. IPFS Storage Solutions

#### Web3.Storage Token (Recommended)
- **Website**: https://web3.storage/
- **Steps**:
  1. Sign up with email or GitHub
  2. Go to "Account" → "Create an API token"
  3. Name: "Ownership Layer"
  4. Copy the token
- **Usage**: Store NFT metadata and images
- **Free Tier**: 1TB storage, unlimited bandwidth

#### Pinata API Keys (Alternative)
- **Website**: https://www.pinata.cloud/
- **Steps**:
  1. Create account
  2. Go to "API Keys" → "New Key"
  3. Select permissions: `pinFileToIPFS`, `pinJSONToIPFS`, `unpin`
  4. Name: "Ownership Layer"
  5. Copy API Key and Secret Key
- **Usage**: Alternative IPFS pinning service
- **Free Tier**: 1GB storage, 100MB file limit

### 3. WalletConnect Integration

#### WalletConnect Project ID
- **Website**: https://cloud.walletconnect.com/
- **Steps**:
  1. Create account
  2. Click "Create Project"
  3. Project details:
     - Name: "The Ownership Layer"
     - Description: "Web3 content fingerprinting and NFT minting"
     - URL: Your domain or `http://localhost:3000`
  4. Copy the Project ID
- **Usage**: Enable wallet connections (MetaMask, WalletConnect, etc.)
- **Free Tier**: Unlimited requests

## 📝 Environment Configuration

### Create `.env.local` file:

```bash
# Copy from .env.example and fill in your values

# Blockchain APIs
POLYGONSCAN_API_KEY=YourPolygonScanAPIKey
BASESCAN_API_KEY=YourBaseScanAPIKey

# IPFS Storage (choose one or both)
WEB3_STORAGE_TOKEN=YourWeb3StorageToken
PINATA_API_KEY=YourPinataAPIKey
PINATA_SECRET_KEY=YourPinataSecretKey

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YourWalletConnectProjectID

# Optional: Additional services
OPENAI_API_KEY=YourOpenAIKey  # For AI features
SUPABASE_URL=YourSupabaseURL
SUPABASE_ANON_KEY=YourSupabaseKey
```

### Security Notes:

⚠️ **Important Security Practices:**

1. **Never commit `.env.local`** to version control
2. **Use different keys** for development and production
3. **Rotate keys regularly** (every 3-6 months)
4. **Monitor usage** to detect unauthorized access
5. **Use environment-specific keys** for staging/production

### Testing Your Setup:

```bash
# Test environment variables are loaded
npm run dev

# Check console for any missing environment variable warnings
# Verify wallet connection works
# Test IPFS upload functionality
```

## 🚀 Quick Start Checklist

- [ ] PolygonScan API key obtained
- [ ] BaseScan API key obtained  
- [ ] Web3.Storage token obtained
- [ ] WalletConnect Project ID obtained
- [ ] `.env.local` file created with all keys
- [ ] Application starts without environment errors
- [ ] Wallet connection works
- [ ] IPFS upload functionality tested

## 🆘 Troubleshooting

### Common Issues:

**"Invalid API Key" errors:**
- Double-check key is copied correctly (no extra spaces)
- Verify key is active in the respective dashboard
- Check rate limits haven't been exceeded

**IPFS upload failures:**
- Verify Web3.Storage token is valid
- Check file size limits (100MB for Pinata free tier)
- Ensure proper permissions are set for Pinata keys

**Wallet connection issues:**
- Verify WalletConnect Project ID is correct
- Check if domain is added to allowed origins
- Ensure HTTPS is used in production

### Support Resources:

- **PolygonScan**: https://polygonscan.com/contactus
- **BaseScan**: https://basescan.org/contactus  
- **Web3.Storage**: https://web3.storage/docs/
- **Pinata**: https://docs.pinata.cloud/
- **WalletConnect**: https://docs.walletconnect.com/

## 💡 Pro Tips

1. **Use Web3.Storage** for primary IPFS storage (better free tier)
2. **Keep Pinata as backup** for redundancy
3. **Monitor API usage** to avoid hitting rate limits
4. **Set up alerts** for unusual API key activity
5. **Document your keys** in a secure password manager

---

**Need Help?** 
- Check the troubleshooting section above
- Review the official documentation for each service
- Ensure all environment variables are properly set before running the application
