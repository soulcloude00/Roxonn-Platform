const { ethers } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("Setting USDC token address...");

  const [owner] = await ethers.getSigners();
  console.log(`Setting with account: ${owner.address}`);

  const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS || process.env.REPO_REWARDS_CONTRACT_ADDRESS;
  const usdcAddress = process.env.USDC_XDC_ADDRESS || '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1';

  console.log(`Proxy Address: ${proxyAddress}`);
  console.log(`USDC Address: ${usdcAddress}`);

  const DualCurrencyRepoRewards = await ethers.getContractFactory("DualCurrencyRepoRewards");
  const contract = DualCurrencyRepoRewards.attach(proxyAddress);

  // Check current USDC token address
  try {
    const currentUsdc = await contract.usdcToken();
    console.log(`Current USDC token: ${currentUsdc}`);
    
    if (currentUsdc === ethers.ZeroAddress || currentUsdc === '0x0000000000000000000000000000000000000000') {
      console.log("\nSetting USDC token address...");
      const tx = await contract.updateUSDCTokenAddress(usdcAddress);
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log("✅ USDC token address set successfully!");
      
      const newUsdc = await contract.usdcToken();
      console.log(`New USDC token: ${newUsdc}`);
    } else {
      console.log("✅ USDC token already set!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
