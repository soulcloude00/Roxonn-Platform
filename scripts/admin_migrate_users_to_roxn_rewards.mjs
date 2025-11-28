import { db } from '../server/db.ts'; 
import { users } from '../shared/schema.ts'; 
import { blockchain } from '../server/blockchain.ts'; 
import { config, initializeConfig, validateConfig } from '../server/config.ts'; 
import { log } from '../server/utils.ts'; 
import { eq, and, or, isNotNull, ne } from 'drizzle-orm'; // Added ne to imports

async function migrateUsers() {
    log('Starting migration of existing users to the New ROXN Rewards System...', 'migration');

    try {
        // Initialize configurations and services
        await initializeConfig(); // Loads .env into config
        validateConfig();       // Validates essential config variables
        
        // Blockchain service is a singleton and initializes its provider automatically.
        // We might need to ensure it's fully ready if it does async init.
        // For now, assuming blockchain.initializeProvider() if it were async would be awaited or handled.
        // The current blockchain service constructor calls initializeProvider synchronously.

        log('Fetching users from database...', 'migration');
        const existingUsers = await db.select({
            id: users.id,
            username: users.username,
            xdcWalletAddress: users.xdcWalletAddress,
            role: users.role,
        }).from(users).where(
            and(
                isNotNull(users.xdcWalletAddress), // Must have a wallet
                ne(users.xdcWalletAddress, ''),    // Wallet address must not be empty - Corrected usage of ne()
                or(                               // Role must be poolmanager or contributor
                    eq(users.role, 'poolmanager'),
                    eq(users.role, 'contributor')
                )
            )
        );

        if (!existingUsers || existingUsers.length === 0) {
            log('No existing users found with roles and wallet addresses to migrate.', 'migration');
            return;
        }

        log(`Found ${existingUsers.length} users to potentially migrate.`, 'migration');
        let successCount = 0;
        let failureCount = 0;

        for (const user of existingUsers) {
            if (!user.xdcWalletAddress || !user.role) {
                log(`Skipping user ID ${user.id} (${user.username}) due to missing wallet address or role.`, 'migration-WARN');
                continue;
            }

            log(`Attempting to register user ID ${user.id} (${user.username}), Address: ${user.xdcWalletAddress}, Role: ${user.role} in New ROXN System...`, 'migration');
            
            try {
                // Call the unified registration function.
                // registerUserOnChain expects (userAddress, username, role)
                // The smart contract's registerUser function uses the username.
                log(`Calling blockchain.registerUserOnChain for Address: ${user.xdcWalletAddress}, Username: ${user.username}, Role: ${user.role}`, 'migration-DEBUG');
                const tx = await blockchain.registerUserOnChain(user.xdcWalletAddress, user.username, user.role);
                if (tx && tx.hash) {
                    log(` -> SUCCESS: User ID ${user.id} (${user.username}) registered on unified contract. TX: ${tx.hash}`, 'migration');
                    successCount++;
                } else {
                    log(` -> FAILED: User ID ${user.id} (${user.username}) registration call completed but no transaction hash returned.`, 'migration-ERROR');
                    failureCount++;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log(` -> FAILED to register user ID ${user.id} (${user.username}): ${errorMessage}`, 'migration-ERROR');
                failureCount++;
            }
            // Add a small delay to avoid overwhelming the RPC endpoint or hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
        }

        log('-----------------------------------------', 'migration');
        log('User Migration to New ROXN Rewards System Complete.', 'migration');
        log(`Successfully migrated: ${successCount} users.`, 'migration');
        log(`Failed to migrate: ${failureCount} users.`, 'migration');
        log('-----------------------------------------', 'migration');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Critical error during migration script: ${errorMessage}`, 'migration-CRITICAL');
        console.error("Migration script failed:", error);
    }
}

migrateUsers().then(() => {
    log('Migration script finished execution.', 'migration');
    process.exit(0);
}).catch((error) => {
    console.error("Unhandled error in migration script:", error);
    process.exit(1);
});
