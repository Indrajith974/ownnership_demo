const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { uploadToIPFS } = require('./upload-metadata');

async function main() {
  console.log('\n🚀 OWNERSHIP LAYER - TESTNET DEPLOYMENT');
  console.log('=====================================');
  
  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);
  console.log(`⛽ Gas Price: ${await hre.ethers.provider.getGasPrice()} wei`);
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);
  
  if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
    console.log('\n⚠️  WARNING: Low balance detected!');
    console.log('🚰 Get testnet ETH from faucets:');
    console.log('   Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    console.log('   Alternative: https://sepoliafaucet.com/');
    console.log('\n');
  }
  
  // Step 1: Upload metadata to IPFS
  console.log('\n📦 Step 1: Uploading metadata to IPFS...');
  let ipfsResults;
  try {
    ipfsResults = await uploadToIPFS();
    console.log('✅ IPFS upload successful!');
  } catch (error) {
    console.log('⚠️  IPFS upload failed, using fallback metadata...');
    ipfsResults = {
      metadataUrl: 'ipfs://QmYourFallbackMetadataHashHere/metadata.json',
      imageUrl: 'ipfs://QmYourFallbackImageHashHere/ownership-nft.svg'
    };
  }
  
  // Step 2: Deploy contract
  console.log('\n🏗️  Step 2: Deploying OwnershipCertificate contract...');
  
  const OwnershipCertificate = await hre.ethers.getContractFactory("OwnershipCertificate");
  
  // Constructor parameters
  const name = "Ownership Layer Certificate";
  const symbol = "OLC";
  const baseTokenURI = `ipfs://${ipfsResults.metadataCid}/`; // Base URI for metadata
  
  console.log(`📝 Contract Name: ${name}`);
  console.log(`🔤 Symbol: ${symbol}`);
  console.log(`🌐 Base Token URI: ${baseTokenURI}`);
  
  const contract = await OwnershipCertificate.deploy(name, symbol, baseTokenURI);
  
  console.log('\n⏳ Waiting for deployment...');
  await contract.deployed();
  
  console.log(`✅ Contract deployed to: ${contract.address}`);
  console.log(`📋 Transaction hash: ${contract.deployTransaction.hash}`);
  
  // Step 3: Verify deployment
  console.log('\n🔍 Step 3: Verifying deployment...');
  
  const contractName = await contract.name();
  const contractSymbol = await contract.symbol();
  const owner = await contract.owner();
  
  console.log(`   Name: ${contractName}`);
  console.log(`   Symbol: ${contractSymbol}`);
  console.log(`   Owner: ${owner}`);
  
  // Step 4: Save deployment info
  console.log('\n💾 Step 4: Saving deployment information...');
  
  const deploymentInfo = {
    network: network,
    contractAddress: contract.address,
    deployerAddress: deployer.address,
    transactionHash: contract.deployTransaction.hash,
    blockNumber: contract.deployTransaction.blockNumber,
    gasUsed: contract.deployTransaction.gasLimit?.toString(),
    timestamp: new Date().toISOString(),
    contractName: name,
    symbol: symbol,
    baseTokenURI: baseTokenURI,
    ipfs: ipfsResults,
    explorerUrl: getExplorerUrl(network, contract.address),
    faucetUrls: getFaucetUrls(network)
  };
  
  // Save to multiple locations
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  // Also save to web app env format
  const envContent = generateEnvContent(deploymentInfo);
  const envFile = path.join(__dirname, '../../apps/web/.env.deployment');
  fs.writeFileSync(envFile, envContent);
  
  console.log(`   📄 Deployment info: ${deploymentFile}`);
  console.log(`   🔧 Environment vars: ${envFile}`);
  
  // Step 5: Contract verification (if API key available)
  if (shouldVerifyContract(network)) {
    console.log('\n🔐 Step 5: Verifying contract on explorer...');
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [name, symbol, baseTokenURI],
      });
      console.log('✅ Contract verified successfully!');
    } catch (error) {
      console.log('⚠️  Contract verification failed:', error.message);
      console.log('   You can verify manually later using the deployment info.');
    }
  }
  
  // Step 6: Display summary
  console.log('\n🎉 DEPLOYMENT COMPLETE!');
  console.log('=======================');
  console.log(`📍 Network: ${network}`);
  console.log(`📄 Contract: ${contract.address}`);
  console.log(`🔗 Explorer: ${deploymentInfo.explorerUrl}`);
  console.log(`🖼️  NFT Image: ${ipfsResults.httpImageUrl || 'N/A'}`);
  console.log(`📋 Metadata: ${ipfsResults.httpMetadataUrl || 'N/A'}`);
  
  if (deploymentInfo.faucetUrls.length > 0) {
    console.log('\n🚰 Testnet Faucets:');
    deploymentInfo.faucetUrls.forEach(url => console.log(`   ${url}`));
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Copy the contract address to your .env.local file');
  console.log('2. Update your frontend to use the deployed contract');
  console.log('3. Test minting on the web interface');
  console.log('4. Share the explorer link to verify the contract');
  
  return deploymentInfo;
}

function getExplorerUrl(network, address) {
  const explorers = {
    baseSepolia: `https://sepolia.basescan.org/address/${address}`,
    base: `https://basescan.org/address/${address}`,
    polygonMumbai: `https://mumbai.polygonscan.com/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`,
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    mainnet: `https://etherscan.io/address/${address}`
  };
  return explorers[network] || `https://etherscan.io/address/${address}`;
}

function getFaucetUrls(network) {
  const faucets = {
    baseSepolia: [
      'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
      'https://sepoliafaucet.com/'
    ],
    sepolia: [
      'https://sepoliafaucet.com/',
      'https://faucet.sepolia.dev/'
    ],
    polygonMumbai: [
      'https://faucet.polygon.technology/',
      'https://mumbaifaucet.com/'
    ]
  };
  return faucets[network] || [];
}

function shouldVerifyContract(network) {
  const apiKeys = {
    baseSepolia: process.env.BASESCAN_API_KEY,
    base: process.env.BASESCAN_API_KEY,
    polygonMumbai: process.env.POLYGONSCAN_API_KEY,
    polygon: process.env.POLYGONSCAN_API_KEY,
    sepolia: process.env.ETHERSCAN_API_KEY
  };
  return !!apiKeys[network];
}

function generateEnvContent(deploymentInfo) {
  const networkUpper = deploymentInfo.network.toUpperCase();
  return `# Generated deployment configuration for ${deploymentInfo.network}
# Generated at: ${deploymentInfo.timestamp}

# Contract Address
NEXT_PUBLIC_${networkUpper}_CONTRACT_ADDRESS=${deploymentInfo.contractAddress}

# IPFS URLs
NEXT_PUBLIC_NFT_IMAGE_URL=${deploymentInfo.ipfs.httpImageUrl || ''}
NEXT_PUBLIC_NFT_METADATA_URL=${deploymentInfo.ipfs.httpMetadataUrl || ''}

# Explorer URL
NEXT_PUBLIC_${networkUpper}_EXPLORER_URL=${deploymentInfo.explorerUrl}

# Deployment Info
DEPLOYMENT_NETWORK=${deploymentInfo.network}
DEPLOYMENT_TIMESTAMP=${deploymentInfo.timestamp}
DEPLOYMENT_TX_HASH=${deploymentInfo.transactionHash}
`;
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
