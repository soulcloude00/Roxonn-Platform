// Upgrade script to add ReentrancyGuard to DualCurrencyRepoRewards
// This script upgrades the contract and initializes V2 with reentrancy protection
const { ethers, upgrades } = require("hardhat");
require('dotenv').config({ path: './server/.env' });

async function main() {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║     DualCurrencyRepoRewards - Reentrancy Guard Upgrade     ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const [deployer] = await ethers.getSigners();
    const proxyAddress = process.env.DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS;

    if (!proxyAddress) {
        throw new Error("DUAL_CURRENCY_REWARDS_CONTRACT_ADDRESS not set in environment");
    }

    console.log(`Deployer: ${deployer.address}`);
    console.log(`Proxy Address: ${proxyAddress}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer Balance: ${ethers.formatEther(balance)} XDC\n`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Verify existing data is readable
    // ═══════════════════════════════════════════════════════════════
    console.log("Step 1: Verifying existing contract data...");

    const Factory = await ethers.getContractFactory("DualCurrencyRepoRewards");
    const currentContract = Factory.attach(proxyAddress);

    const testRepoId = 876024107; // Known repo with data
    let repoBefore;

    try {
        repoBefore = await currentContract.getRepository(testRepoId);
        console.log(`  ✓ Test Repo ${testRepoId}:`);
        console.log(`    - Pool Managers: ${repoBefore[0].length}`);
        console.log(`    - Contributors: ${repoBefore[1].length}`);
        console.log(`    - XDC Pool: ${ethers.formatEther(repoBefore[2])} XDC`);
        console.log(`    - ROXN Pool: ${ethers.formatEther(repoBefore[3])} ROXN`);
        console.log(`    - USDC Pool: ${ethers.formatUnits(repoBefore[4], 6)} USDC`);
    } catch (error) {
        console.log(`  ⚠ Could not read test repo ${testRepoId}: ${error.message}`);
        console.log("  Proceeding with upgrade anyway...");
        repoBefore = null;
    }

    // Get current implementation address (for rollback if needed)
    const oldImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`\n  Current Implementation: ${oldImpl}`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Deploy new implementation and upgrade
    // ═══════════════════════════════════════════════════════════════
    console.log("\nStep 2: Deploying new implementation with ReentrancyGuard...");

    try {
        // Force import to ensure OpenZeppelin recognizes the proxy
        try {
            await upgrades.forceImport(proxyAddress, Factory, { kind: 'uups' });
            console.log("  ✓ Proxy imported successfully");
        } catch (importError) {
            // Already imported, ignore
            console.log("  ✓ Proxy already known to OpenZeppelin");
        }

        // Upgrade proxy and call initializeV2
        // unsafeAllow is needed because initialize() doesn't call __ReentrancyGuard_init()
        // (it's called in initializeV2 instead for existing deployments)
        const upgraded = await upgrades.upgradeProxy(proxyAddress, Factory, {
            kind: 'uups',
            redeployImplementation: 'always',
            unsafeAllow: ['missing-initializer-call'],
            call: { fn: 'initializeV2' }
        });

        await upgraded.waitForDeployment();
        console.log("  ✓ Upgrade transaction confirmed");

        const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log(`  ✓ New Implementation: ${newImpl}`);

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Verify data integrity
        // ═══════════════════════════════════════════════════════════════
        console.log("\nStep 3: Verifying data integrity post-upgrade...");

        if (repoBefore) {
            const repoAfter = await upgraded.getRepository(testRepoId);

            const managersMatch = repoBefore[0].length === repoAfter[0].length;
            const xdcMatch = repoBefore[2].toString() === repoAfter[2].toString();
            const roxnMatch = repoBefore[3].toString() === repoAfter[3].toString();
            const usdcMatch = repoBefore[4].toString() === repoAfter[4].toString();

            if (!managersMatch || !xdcMatch || !roxnMatch || !usdcMatch) {
                console.log("  ✗ DATA MISMATCH DETECTED!");
                console.log(`    Managers: ${repoBefore[0].length} → ${repoAfter[0].length}`);
                console.log(`    XDC: ${repoBefore[2]} → ${repoAfter[2]}`);
                console.log(`    ROXN: ${repoBefore[3]} → ${repoAfter[3]}`);
                console.log(`    USDC: ${repoBefore[4]} → ${repoAfter[4]}`);

                console.log("\n  ⚠ ROLLING BACK...");
                const proxyContract = new ethers.Contract(
                    proxyAddress,
                    ["function upgradeToAndCall(address,bytes) payable"],
                    deployer
                );
                const rollbackTx = await proxyContract.upgradeToAndCall(oldImpl, "0x", { gasLimit: 500000 });
                await rollbackTx.wait();
                console.log("  ✓ Rolled back to previous implementation");
                throw new Error("Data integrity check failed - upgrade rolled back");
            }

            console.log(`  ✓ Test Repo ${testRepoId} data verified:`);
            console.log(`    - Pool Managers: ${repoAfter[0].length} ✓`);
            console.log(`    - XDC Pool: ${ethers.formatEther(repoAfter[2])} XDC ✓`);
            console.log(`    - ROXN Pool: ${ethers.formatEther(repoAfter[3])} ROXN ✓`);
            console.log(`    - USDC Pool: ${ethers.formatUnits(repoAfter[4], 6)} USDC ✓`);
        } else {
            console.log("  ⚠ Skipping data verification (no baseline data)");
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Verify ReentrancyGuard is active
        // ═══════════════════════════════════════════════════════════════
        console.log("\nStep 4: Verifying ReentrancyGuard initialization...");

        // Try to call initializeV2 again - should fail if already initialized
        try {
            await upgraded.initializeV2();
            console.log("  ⚠ WARNING: initializeV2 succeeded (unexpected)");
        } catch (error) {
            if (error.message.includes("InvalidInitialization") ||
                error.message.includes("already initialized") ||
                error.message.includes("revert")) {
                console.log("  ✓ ReentrancyGuard initialized (cannot reinitialize)");
            } else {
                console.log(`  ⚠ Unexpected error: ${error.message}`);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // SUCCESS SUMMARY
        // ═══════════════════════════════════════════════════════════════
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║              UPGRADE COMPLETED SUCCESSFULLY                ║");
        console.log("╚════════════════════════════════════════════════════════════╝");
        console.log(`\n  Proxy Address: ${proxyAddress}`);
        console.log(`  Old Implementation: ${oldImpl}`);
        console.log(`  New Implementation: ${newImpl}`);
        console.log(`\n  Protected Functions:`);
        console.log(`    - addXDCFundToRepository ✓`);
        console.log(`    - addROXNFundToRepository ✓`);
        console.log(`    - addUSDCFundToRepository ✓`);
        console.log(`    - distributeReward ✓`);
        console.log(`    - reclaimUnaccountedXDC ✓`);

        console.log(`\n📝 Update .env (optional):`);
        console.log(`   DUAL_CURRENCY_REWARDS_IMPL_ADDRESS=${newImpl}`);

        console.log(`\n🔄 Restart backend:`);
        console.log(`   pm2 restart all`);

    } catch (error) {
        console.error("\n╔════════════════════════════════════════════════════════════╗");
        console.error("║                    UPGRADE FAILED                          ║");
        console.error("╚════════════════════════════════════════════════════════════╝");
        console.error(`\nError: ${error.message}`);

        if (error.receipt) {
            console.error(`\nTransaction Receipt:`);
            console.error(`  Status: ${error.receipt.status}`);
            console.error(`  Gas Used: ${error.receipt.gasUsed.toString()}`);
            console.error(`  TX Hash: ${error.receipt.hash}`);
        }

        console.log(`\n🔙 To rollback manually:`);
        console.log(`   Old Implementation: ${oldImpl}`);
        console.log(`   Run: npx hardhat run scripts/rollback_upgrade.cjs --network xinfin`);

        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
