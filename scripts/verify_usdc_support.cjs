const { ethers } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("Verifying USDC support in deployed contract...\n");

  const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS || process.env.REPO_REWARDS_CONTRACT_ADDRESS;
  console.log(`Checking proxy at: ${proxyAddress}\n`);

  const DualCurrencyRepoRewards = await ethers.getContractFactory("DualCurrencyRepoRewards");
  const contract = DualCurrencyRepoRewards.attach(proxyAddress);

  console.log("Testing contract methods:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Test basic methods
  try {
    const owner = await contract.owner();
    console.log("✅ owner():", owner.substring(0, 10) + "...");
  } catch (e) {
    console.log("❌ owner() failed:", e.message);
  }

  try {
    const roxnToken = await contract.roxnToken();
    console.log("✅ roxnToken():", roxnToken.substring(0, 10) + "...");
  } catch (e) {
    console.log("❌ roxnToken() failed:", e.message);
  }

  // Test USDC method
  try {
    const usdcToken = await contract.usdcToken();
    console.log("✅ usdcToken():", usdcToken);
    
    if (usdcToken === ethers.ZeroAddress) {
      console.log("⚠️  USDC token not set yet (expected if just upgraded)");
    }
  } catch (e) {
    console.log("❌ usdcToken() failed:", e.message);
    console.log("   This means USDC support is NOT in the deployed contract yet");
  }

  // Check if addUSDCFundToRepository exists
  try {
    // Try to encode the function call - if it exists, this will succeed
    const encoded = contract.interface.encodeFunctionData('addUSDCFundToRepository', [1, 1000]);
    console.log("✅ addUSDCFundToRepository() method exists in ABI");
  } catch (e) {
    console.log("❌ addUSDCFundToRepository() not found in ABI");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
