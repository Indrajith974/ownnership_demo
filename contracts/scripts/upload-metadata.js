const { Web3Storage, File } = require('web3.storage');
const fs = require('fs');
const path = require('path');

// Create Web3.Storage client
function makeStorageClient() {
  const token = process.env.WEB3_STORAGE_TOKEN;
  if (!token) {
    throw new Error('WEB3_STORAGE_TOKEN environment variable is required');
  }
  return new Web3Storage({ token });
}

// Create NFT image (simple SVG for demo)
function createNFTImage() {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad1)" rx="20"/>
      <text x="200" y="150" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">
        Ownership Layer
      </text>
      <text x="200" y="200" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white" opacity="0.9">
        Certificate of Creation
      </text>
      <circle cx="200" cy="280" r="40" fill="white" opacity="0.2"/>
      <text x="200" y="290" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">
        🏆
      </text>
    </svg>
  `;
  return svg;
}

// Upload files to IPFS
async function uploadToIPFS() {
  try {
    console.log('🚀 Starting IPFS upload...');
    
    const client = makeStorageClient();
    
    // Create NFT image
    const imageContent = createNFTImage();
    const imageFile = new File([imageContent], 'ownership-nft.svg', { type: 'image/svg+xml' });
    
    // Upload image first
    console.log('📸 Uploading NFT image...');
    const imageCid = await client.put([imageFile], {
      name: 'ownership-nft-image',
      maxRetries: 3
    });
    console.log(`✅ Image uploaded! CID: ${imageCid}`);
    
    // Create metadata
    const metadata = {
      name: "Ownership Layer Certificate",
      description: "A blockchain-verified certificate of original content creation. This NFT represents proof of authorship and ownership in the decentralized creator economy.",
      image: `ipfs://${imageCid}/ownership-nft.svg`,
      external_url: "https://ownership-layer.com",
      attributes: [
        {
          trait_type: "Type",
          value: "Certificate"
        },
        {
          trait_type: "Version",
          value: "1.0"
        },
        {
          trait_type: "Network",
          value: "Base Sepolia"
        },
        {
          trait_type: "Created",
          value: new Date().toISOString()
        }
      ],
      properties: {
        category: "certificate",
        creator: "Ownership Layer Protocol",
        royalty: 250 // 2.5% royalty
      }
    };
    
    // Upload metadata
    console.log('📄 Uploading NFT metadata...');
    const metadataFile = new File([JSON.stringify(metadata, null, 2)], 'metadata.json', { type: 'application/json' });
    const metadataCid = await client.put([metadataFile], {
      name: 'ownership-nft-metadata',
      maxRetries: 3
    });
    console.log(`✅ Metadata uploaded! CID: ${metadataCid}`);
    
    // Save results
    const results = {
      imageCid,
      metadataCid,
      imageUrl: `ipfs://${imageCid}/ownership-nft.svg`,
      metadataUrl: `ipfs://${metadataCid}/metadata.json`,
      httpImageUrl: `https://${imageCid}.ipfs.w3s.link/ownership-nft.svg`,
      httpMetadataUrl: `https://${metadataCid}.ipfs.w3s.link/metadata.json`,
      timestamp: new Date().toISOString()
    };
    
    // Write to file for deployment script
    const outputPath = path.join(__dirname, 'ipfs-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
    
    console.log('\n🎉 IPFS Upload Complete!');
    console.log('📊 Results:');
    console.log(`   Image CID: ${imageCid}`);
    console.log(`   Metadata CID: ${metadataCid}`);
    console.log(`   Image URL: ${results.httpImageUrl}`);
    console.log(`   Metadata URL: ${results.httpMetadataUrl}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ IPFS upload failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  uploadToIPFS()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { uploadToIPFS };
