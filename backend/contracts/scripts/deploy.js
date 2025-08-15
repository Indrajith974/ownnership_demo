const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying The Ownership Layer Certificate NFT Contract...");

  // Get the contract factory
  const OwnershipCertificate = await hre.ethers.getContractFactory("OwnershipCertificate");

  // Deploy the contract
  console.log("📦 Deploying contract...");
  const ownershipCertificate = await OwnershipCertificate.deploy();

  await ownershipCertificate.deployed();

  console.log("✅ OwnershipCertificate deployed to:", ownershipCertificate.address);
  console.log("🔗 Network:", hre.network.name);
  console.log("⛽ Gas used for deployment:", (await ownershipCertificate.deployTransaction.wait()).gasUsed.toString());

  // Verify contract on Etherscan if not on localhost
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await ownershipCertificate.deployTransaction.wait(6);
    
    console.log("🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: ownershipCertificate.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: ownershipCertificate.address,
    deployerAddress: (await hre.ethers.getSigners())[0].address,
    blockNumber: ownershipCertificate.deployTransaction.blockNumber,
    transactionHash: ownershipCertificate.deployTransaction.hash,
    gasUsed: (await ownershipCertificate.deployTransaction.wait()).gasUsed.toString(),
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("Contract Address:", deploymentInfo.contractAddress);
  console.log("Deployer Address:", deploymentInfo.deployerAddress);
  console.log("Transaction Hash:", deploymentInfo.transactionHash);

  // Write deployment info to file
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentFile);

  return ownershipCertificate;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
