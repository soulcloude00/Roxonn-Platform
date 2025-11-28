const hre = require("hardhat");

async function main() {
  const forwarderAddress = process.env.FORWARDER_CONTRACT_ADDRESS;
  if (!forwarderAddress) {
    throw new Error("FORWARDER_CONTRACT_ADDRESS not set in environment");
  }

  console.log("Deploying RepoRewards...");
  console.log("Using forwarder at:", forwarderAddress);

  const RepoRewards = await hre.ethers.getContractFactory("RepoRewards");
  const repoRewards = await RepoRewards.deploy(forwarderAddress);
  await repoRewards.waitForDeployment();

  const repoRewardsAddress = await repoRewards.getAddress();
  console.log("RepoRewards deployed to:", repoRewardsAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
