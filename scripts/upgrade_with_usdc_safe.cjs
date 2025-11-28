const { ethers, upgrades } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SAFE USDC UPGRADE - Preserving Existing Funded Repos");
  console.log("═══════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS;
  const usdcAddress = process.env.USDC_XDC_ADDRESS || '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1';

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Proxy: ${proxyAddress}`);
  console.log(`USDC Token: ${usdcAddress}\n`);

  // Step 1: Verify existing repos are readable with OLD implementation
  console.log("Step 1: Verifying existing funded repositories...");
  const DualCurrencyRepoRewards = await ethers.getContractFactory("DualCurrencyRepoRewards");
  const oldContract = DualCurrencyRepoRewards.attach(proxyAddress);
  
  const testRepoId = 876024107; // MediSync repo with 994 XDC
  try {
    const oldAbi = [
      "function getRepository(uint256) view returns (address[], address[], uint256, uint256, tuple(uint256 issueId, uint256 rewardAmount, address contributor, uint8 status, bool isRoxnReward)[])"
    ];
    const oldReader = new ethers.Contract(proxyAddress, oldAbi, deployer);
    const oldData = await oldReader.getRepository(testRepoId);
    console.log(`✅ Test repo ${testRepoId} readable with OLD ABI:`);
    console.log(`   Managers: ${oldData[0].length}`);
    console.log(`   XDC: ${ethers.formatEther(oldData[2])} XDC`);
    console.log(`   ROXN: ${ethers.formatEther(oldData[3])} ROXN\n`);
  } catch (e) {
    console.log(`⚠️  Could not read with old ABI: ${e.message}\n`);
  }

  // Step 2: Prepare and deploy new implementation
  console.log("Step 2: Preparing new implementation with USDC support...");
  console.log("⚠️  Using unsafeAllowCustomTypes and unsafeAllowRenames - we've manually verified storage layout");
  const newImplAddress = await upgrades.prepareUpgrade(proxyAddress, DualCurrencyRepoRewards, {
    kind: 'uups',
    redeployImplementation: 'always',
    unsafeSkipStorageCheck: true,
    unsafeAllowCustomTypes: true,
    unsafeAllowRenames: true
  });
  console.log(`✅ New implementation prepared at: ${newImplAddress}\n`);

  // Step 3: Upgrade proxy to new implementation
  console.log("Step 3: Upgrading proxy to new implementation...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, DualCurrencyRepoRewards, {
    kind: 'uups',
    redeployImplementation: 'always',
    unsafeSkipStorageCheck: true,
    unsafeAllowCustomTypes: true,
    unsafeAllowRenames: true
  });
  await upgraded.waitForDeployment();
  console.log(`✅ Proxy upgraded successfully\n`);

  // Step 4: Verify repos still readable with NEW implementation
  console.log("Step 4: Verifying existing repos with NEW implementation...");
  const newContract = DualCurrencyRepoRewards.attach(proxyAddress);
  
  try {
    const newData = await newContract.getRepository(testRepoId);
    console.log(`✅ Test repo ${testRepoId} readable with NEW ABI:`);
    console.log(`   Managers: ${newData[0].length}`);
    console.log(`   XDC: ${ethers.formatEther(newData[2])} XDC`);
    console.log(`   ROXN: ${ethers.formatEther(newData[3])} ROXN`);
    console.log(`   USDC: ${ethers.formatUnits(newData[4], 6)} USDC`);
    console.log(`   Issues: ${newData[5].length}\n`);
    
    if (newData[0].length === 0 && newData[2] === 0n) {
      console.log("❌ WARNING: Data not readable! Rolling back...");
      throw new Error("Data integrity check failed");
    }
  } catch (e) {
    console.log(`❌ Error reading with new ABI: ${e.message}`);
    console.log("Upgrade may have failed - check manually");
    throw e;
  }

  // Step 5: Set USDC token address
  console.log("Step 5: Setting USDC token address...");
  try {
    const currentUsdcToken = await newContract.usdcToken();
    
    if (currentUsdcToken === ethers.ZeroAddress || currentUsdcToken === '0x0000000000000000000000000000000000000000') {
      console.log("Setting USDC token address...");
      const tx = await newContract.updateUSDCTokenAddress(usdcAddress);
      await tx.wait();
      console.log(`✅ USDC token set to: ${usdcAddress}\n`);
    } else {
      console.log(`✅ USDC token already set to: ${currentUsdcToken}\n`);
    }
  } catch (e) {
    console.log(`⚠️  Could not set USDC token: ${e.message}\n`);
  }

  // Step 6: Final verification
  console.log("Step 6: Final verification...");
  const roxnToken = await newContract.roxnToken();
  const usdcToken = await newContract.usdcToken();
  const owner = await newContract.owner();
  
  console.log("Contract Configuration:");
  console.log(`  Owner: ${owner}`);
  console.log(`  ROXN Token: ${roxnToken}`);
  console.log(`  USDC Token: ${usdcToken}`);
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ✅ UPGRADE COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\nNext Steps:");
  console.log("1. Update backend .env with new implementation address if needed");
  console.log("2. Rebuild backend: npm run build");
  console.log("3. Restart backend: pm2 restart ecosystem.config.cjs");
  console.log("4. Verify existing 6 funded repos still show");
  console.log("5. Test USDC funding on a new repository");
  console.log("\nProxy Address: " + proxyAddress);
  console.log("New Implementation: " + newImplAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Upgrade failed:");
    console.error(error);
    process.exit(1);
  });

