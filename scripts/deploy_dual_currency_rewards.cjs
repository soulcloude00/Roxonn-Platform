// Deployment script for DualCurrencyRepoRewards with its own proxy
const { ethers } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("Deploying DualCurrencyRepoRewards with dedicated proxy on MAINNET...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} XDC`);

  // Load required addresses from environment
  const forwarderAddress = process.env.FORWARDER_CONTRACT_ADDRESS;
  const roxnTokenAddress = process.env.ROXN_TOKEN_ADDRESS;

  if (!forwarderAddress || !ethers.isAddress(forwarderAddress)) {
    throw new Error("FORWARDER_CONTRACT_ADDRESS not set or invalid in environment");
  }
  if (!roxnTokenAddress || !ethers.isAddress(roxnTokenAddress)) {
    throw new Error("ROXN_TOKEN_ADDRESS not set or invalid in environment");
  }

  console.log(`Using forwarder at: ${forwarderAddress}`);
  console.log(`Using ROXN token at: ${roxnTokenAddress}`);

  try {
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
    console.log(`Current gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // 1. Deploy the DualCurrencyRepoRewards implementation contract
    console.log("\nDeploying DualCurrencyRepoRewards implementation contract...");
    const DualCurrencyRepoRewardsFactory = await ethers.getContractFactory("DualCurrencyRepoRewards");
    
    // Deploy with higher gas limit for safety
    const implementationTx = await DualCurrencyRepoRewardsFactory.deploy({
      gasLimit: 5000000 // 5M gas
    });
    
    console.log(`Implementation deployment TX sent. Waiting for confirmation...`);
    await implementationTx.waitForDeployment();
    const implementationAddress = await implementationTx.getAddress();
    console.log(`✅ DualCurrencyRepoRewards implementation deployed to: ${implementationAddress}`);

    // Wait for network propagation
    console.log("\nWaiting 5 seconds for network propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 2. Prepare initialization data
    console.log("\nPreparing initialization data...");
    const initData = DualCurrencyRepoRewardsFactory.interface.encodeFunctionData('initialize', [
      forwarderAddress,
      roxnTokenAddress
    ]);

    // 3. Deploy the DualCurrencyRepoRewardsProxy contract
    console.log("\nDeploying DualCurrencyRepoRewardsProxy contract...");
    const DualCurrencyRepoRewardsProxyFactory = await ethers.getContractFactory("DualCurrencyRepoRewardsProxy");
    
    const proxyTx = await DualCurrencyRepoRewardsProxyFactory.deploy(
      implementationAddress,
      initData,
      {
        gasLimit: 2000000 // 2M gas
      }
    );
    
    console.log(`Proxy deployment TX sent. Waiting for confirmation...`);
    await proxyTx.waitForDeployment();
    const proxyAddress = await proxyTx.getAddress();
    console.log(`✅ DualCurrencyRepoRewardsProxy deployed to: ${proxyAddress}`);

    // 4. Wait a bit for the network to propagate
    console.log("\nWaiting 10 seconds for network propagation...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 5. Verify deployment and initialization
    console.log("\nVerifying deployment...");
    const proxiedContract = DualCurrencyRepoRewardsFactory.attach(proxyAddress);
    
    try {
      const owner = await proxiedContract.owner();
      const storedForwarder = await proxiedContract.forwarder();
      const storedToken = await proxiedContract.roxnToken();
      const platformFeeRate = await proxiedContract.platformFeeRate();
      const contributorFeeRate = await proxiedContract.contributorFeeRate();

      console.log("\n✅ Deployment Verification:");
      console.log(`- Proxy Address: ${proxyAddress}`);
      console.log(`- Implementation Address: ${implementationAddress}`);
      console.log(`- Owner: ${owner}`);
      console.log(`- Forwarder: ${storedForwarder}`);
      console.log(`- ROXN Token: ${storedToken}`);
      console.log(`- Platform Fee Rate: ${platformFeeRate.toString()}`);
      console.log(`- Contributor Fee Rate: ${contributorFeeRate.toString()}`);
      
      console.log("\n✅ Contract configuration verified!");
    } catch (verifyError) {
      console.log("\n⚠️  Warning: Could not verify all contract parameters.");
      console.log("The contracts may still be deployed correctly.");
      console.log("Error:", verifyError.message);
    }

    console.log("\n🎉 DualCurrencyRepoRewards deployment complete!");
    console.log("\n📝 IMPORTANT - Update your .env file:");
    console.log("```");
    console.log(`# Comment out old RepoRewards addresses (no longer used)`);
    console.log(`# REPO_REWARDS_CONTRACT_ADDRESS=<old_address>`);
    console.log(`# REPO_REWARDS_IMPL_ADDRESS=<old_address>`);
    console.log(``);
    console.log(`# New DualCurrencyRepoRewards addresses`);
    console.log(`DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS=${proxyAddress}`);
    console.log(`DUAL_CURRENCY_REWARDS_IMPL_ADDRESS=${implementationAddress}`);
    console.log("```");
    console.log("\n📌 Next steps:");
    console.log("1. Update .env file with the new addresses");
    console.log("2. Update blockchain.ts to use DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS");
    console.log("3. Restart backend server (pm2 restart all)");
    console.log("4. Fund the contract with ROXN tokens for rewards");
    console.log("5. Test both XDC and ROXN reward functionality");

  } catch (error) {
    console.error("\n❌ Error during deployment:");
    console.error(error);
    if (error.receipt) {
      console.log("\nTransaction receipt:");
      console.log(`  Status: ${error.receipt.status}`);
      console.log(`  Gas used: ${error.receipt.gasUsed.toString()}`);
      console.log(`  Transaction hash: ${error.receipt.hash}`);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 