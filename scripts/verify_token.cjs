// Script to verify the ROXN token implementation on XDC Testnet
const { execSync } = require('child_process');
require('dotenv').config({ path: './server/.env' });

async function main() {
  console.log("Verifying ROXN Token on XDC Testnet...");
  
  const implAddress = process.env.ROXN_TOKEN_IMPL_ADDRESS;
  
  if (!implAddress) {
    console.error("ERROR: ROXN_TOKEN_IMPL_ADDRESS not set in .env file");
    console.error("Please set it to the implementation contract address before running this script");
    return;
  }
  
  console.log(`Implementation contract address: ${implAddress}`);
  console.log("Starting verification process...");
  console.log("This may take a few minutes...");
  
  try {
    // Run the verification command
    const command = `npx hardhat verify --network xdcTestnet ${implAddress}`;
    console.log(`\nExecuting: ${command}\n`);
    
    // Execute the command and capture output
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
    
    console.log("\n✅ Verification process completed!");
    console.log("\nNOTE: For the proxy contract, manual verification is typical:");
    console.log("1. Go to https://apothem.blocksscan.io/");
    console.log(`2. Search for your proxy address: ${process.env.ROXN_TOKEN_ADDRESS || "[Proxy Address]"}`);
    console.log("3. Go to the 'Contract' tab");
    console.log("4. Click 'Verify and Publish'");
    console.log("5. Select 'Proxy Contract'");
    console.log("6. Follow the steps in the verification wizard");
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error.message);
    console.error("\nPossible reasons for failure:");
    console.error("- Contract code doesn't match what's deployed");
    console.error("- Network issues with XDC Testnet");
    console.error("- Incorrect contract address");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 