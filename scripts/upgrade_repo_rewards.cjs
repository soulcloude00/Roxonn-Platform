// Script to upgrade RepoRewards to a new implementation
const { ethers, upgrades } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("Upgrading RepoRewards implementation...");

  // Get the upgrader account
  const [upgrader] = await ethers.getSigners();
  console.log(`Upgrading with account: ${upgrader.address}`);

  // Address of the proxy contract from environment
  const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS || process.env.REPO_REWARDS_CONTRACT_ADDRESS;
  const currentImplementationAddress = process.env.DUAL_CURRENCY_REWARDS_IMPL_ADDRESS || process.env.REPO_REWARDS_IMPL_ADDRESS; // Get current implementation address
  
  if (!proxyAddress || !ethers.isAddress(proxyAddress)) {
    throw new Error("DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS or REPO_REWARDS_CONTRACT_ADDRESS not set or invalid in environment");
  }
  
  // Add check for current implementation address if needed for import
  // if (!currentImplementationAddress || !ethers.isAddress(currentImplementationAddress)) { 
  //   throw new Error("REPO_REWARDS_IMPL_ADDRESS not set or invalid in environment for import"); 
  // } 
  
  console.log(`Using RepoRewards proxy at: ${proxyAddress}`);
  // console.log(`Attempting to import existing implementation at: ${currentImplementationAddress}`);

  // Get Contract Factory for the NEW logic
  const DualCurrencyRepoRewards = await ethers.getContractFactory("DualCurrencyRepoRewards");
  
  // Import the existing deployment first. This makes the OZ Upgrades plugin aware of the proxy.
  // This only needs to be run once per network for a given proxy.
  try {
      console.log(`Importing existing proxy at ${proxyAddress} into OpenZeppelin manifest...`);
      // Use DualCurrencyRepoRewards factory here, as that's the type of contract the proxy is for.
      await upgrades.forceImport(proxyAddress, DualCurrencyRepoRewards, { kind: 'uups' });
      console.log("Proxy imported successfully or was already tracked.");
  } catch (importError) { 
      // It's okay if it's already tracked, the upgrade will still proceed.
      console.warn(`Could not import proxy (this might be okay if already tracked): ${importError.message}`);
  }

  // Attach to proxy using the NEW ABI to correctly check custom functions like 'upgraders'
  // Note: For standard Ownable functions, the old ABI might work, but it's safer to use the new one
  // if we are checking functions that might have changed or are specific to the new version.
  // However, for the upgrade itself, the plugin handles the existing proxy state.
  // Let's attach with the new factory for consistency in checks.
  const proxiedRepoRewards = await DualCurrencyRepoRewards.attach(proxyAddress);

  // Verify the upgrader has the necessary rights
  const isUpgrader = await proxiedRepoRewards.upgraders(upgrader.address);
  const isOwner = (await proxiedRepoRewards.owner()).toLowerCase() === upgrader.address.toLowerCase();
  
  if (!isUpgrader && !isOwner) {
    console.error("Error: Upgrader does not have permission to upgrade the contract");
    console.error("The account must either be an upgrader or the contract owner");
    return;
  }
  
  console.log(`Upgrade permission verified: ${isUpgrader ? "Is upgrader" : "Is owner"}`);

  // The upgrades.upgradeProxy function will deploy the new implementation of DualCurrencyRepoRewards
  // (using the latest compiled code) and then upgrade the proxy at proxyAddress to point to it.
  console.log(`Upgrading proxy (${proxyAddress}) to new DualCurrencyRepoRewards logic...`);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, DualCurrencyRepoRewards); // Use the new factory
  await upgraded.waitForDeployment(); // Wait for the upgrade transaction
  
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`RepoRewards proxy upgraded successfully. New implementation at: ${newImplementationAddress}`);

  // Remove manual upgradeTo call
  /*
  console.log(`Attempting to upgrade proxy (${proxyAddress}) to implementation (${newImplementationAddress})...`);
  const tx = await proxiedRepoRewards.upgradeTo(newImplementationAddress, {
    gasLimit: 3000000
  });
  await tx.wait();
  console.log(`RepoRewards successfully upgraded to: ${newImplementationAddress}`);
  */
  
  // Verification steps
  console.log("Verifying upgrade...");
  const finalInstance = DualCurrencyRepoRewards.attach(proxyAddress); // Attach with the new ABI
  try {
    const owner = await finalInstance.owner();
    const forwarderAddress = await finalInstance.forwarder();
    const tokenAddress = await finalInstance.roxnToken();
    const platformFee = await finalInstance.platformFeeRate();
    const contributorFee = await finalInstance.contributorFeeRate(); // Check new variable
    
    console.log("Upgrade verification:");
    console.log(`- Proxy Address: ${proxyAddress}`);
    console.log(`- Current Implementation (from plugin perspective): ${await upgrades.erc1967.getImplementationAddress(proxyAddress)}`);
    console.log(`- Owner: ${owner}`);
    console.log(`- Forwarder: ${forwarderAddress}`);
    console.log(`- ROXN Token: ${tokenAddress}`);
    console.log(`- Platform Fee Rate: ${platformFee.toString()}`);
    console.log(`- Contributor Fee Rate: ${contributorFee.toString()}`); // Verify fee
    
    // Check if USDC token is set (new feature)
    try {
      const usdcTokenAddress = await finalInstance.usdcToken();
      console.log(`- USDC Token: ${usdcTokenAddress}`);
      
      // If USDC is not set, set it now
      if (!usdcTokenAddress || usdcTokenAddress === ethers.ZeroAddress) {
        const usdcAddress = process.env.USDC_XDC_ADDRESS || '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1';
        console.log(`\n⚠️  USDC token not set. Setting to: ${usdcAddress}`);
        const setUsdcTx = await finalInstance.updateUSDCTokenAddress(usdcAddress);
        await setUsdcTx.wait();
        console.log(`✅ USDC token address updated successfully!`);
      }
    } catch (usdcError) {
      console.log(`⚠️  Note: USDC token check failed (might be expected for older versions): ${usdcError.message}`);
    }
    
    console.log("\n✅ Upgrade complete and verified!");
    console.log("\n📝 Next steps:");
    console.log("1. USDC support is now active!");
    console.log("2. Pool managers can fund repositories with XDC, ROXN, or USDC");
    console.log("3. Bounties can be allocated in any of the three currencies");
  } catch (error) {
    console.error("Error verifying the upgrade:", error.message);
    console.error("The upgrade might have failed or the new implementation is incompatible.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
