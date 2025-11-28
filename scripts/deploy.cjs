const hre = require("hardhat");

async function main() {
  console.log("Deploying RepoRewards contract...");

  const RepoRewards = await hre.ethers.getContractFactory("RepoRewards");
  const repoRewards = await RepoRewards.deploy();

  console.log("Waiting for deployment transaction...");
  await repoRewards.waitForDeployment();

  const address = await repoRewards.getAddress();
  console.log(`RepoRewards deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
