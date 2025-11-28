const { ethers } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
  const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS || process.env.REPO_REWARDS_CONTRACT_ADDRESS;
  const feeCollectorAddress = process.env.FEE_COLLECTOR_ADDRESS;
  const platformFeeRate = parseInt(process.env.PLATFORM_FEE_RATE || "0"); // Default to 0 if not set
  const contributorFeeRate = parseInt(process.env.CONTRIBUTOR_FEE_RATE || "0"); // Default to 0 if not set

  if (!proxyAddress || !ethers.isAddress(proxyAddress)) {
    throw new Error("DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS (proxy address) not set or invalid in environment");
  }
  if (!feeCollectorAddress || !ethers.isAddress(feeCollectorAddress)) {
    throw new Error("FEE_COLLECTOR_ADDRESS not set or invalid in environment");
  }
  if (isNaN(platformFeeRate) || isNaN(contributorFeeRate)) {
    throw new Error("PLATFORM_FEE_RATE or CONTRIBUTOR_FEE_RATE is not a valid number in environment");
  }

  console.log(`Setting fee parameters on proxy: ${proxyAddress}`);
  console.log(` - Fee Collector: ${feeCollectorAddress}`);
  console.log(` - Platform Fee Rate (basis points): ${platformFeeRate}`);
  console.log(` - Contributor Fee Rate (basis points): ${contributorFeeRate}`);

  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);

  const ContractFactory = await ethers.getContractFactory("DualCurrencyRepoRewards");
  const contract = ContractFactory.attach(proxyAddress);

  try {
    const currentPlatformFee = await contract.platformFeeRate();
    const currentContributorFee = await contract.contributorFeeRate();
    const currentCollector = await contract.feeCollector();

    if (
        currentCollector.toLowerCase() === feeCollectorAddress.toLowerCase() &&
        currentPlatformFee.toString() === platformFeeRate.toString() &&
        currentContributorFee.toString() === contributorFeeRate.toString()
    ) {
        console.log("Fee parameters are already set correctly. No action needed.");
        return;
    }

    console.log("Current on-chain fee parameters differ. Attempting to update...");
    console.log(`  Current Collector: ${currentCollector}`);
    console.log(`  Current Platform Fee: ${currentPlatformFee.toString()}`);
    console.log(`  Current Contributor Fee: ${currentContributorFee.toString()}`);


    const tx = await contract.connect(signer).updateFeeParameters(
      feeCollectorAddress,
      platformFeeRate,
      contributorFeeRate
    );
    console.log(`updateFeeParameters transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Fee parameters updated successfully!");

    // Verify
    const newPlatformFee = await contract.platformFeeRate();
    const newContributorFee = await contract.contributorFeeRate();
    const newCollector = await contract.feeCollector();
    console.log("Verification after update:");
    console.log(`  New Collector: ${newCollector}`);
    console.log(`  New Platform Fee: ${newPlatformFee.toString()}`);
    console.log(`  New Contributor Fee: ${newContributorFee.toString()}`);

  } catch (error) {
    console.error("Error setting fee parameters:", error);
    if (error.data) {
        console.error("Error data:", error.data);
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
