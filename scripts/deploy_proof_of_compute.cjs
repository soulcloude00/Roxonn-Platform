const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ProofOfCompute contract with the account:", deployer.address);

  const ProofOfCompute = await ethers.getContractFactory("ProofOfCompute");
  const proofOfCompute = await ProofOfCompute.deploy(deployer.address);

  await proofOfCompute.waitForDeployment();

  console.log("ProofOfCompute deployed to:", await proofOfCompute.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
