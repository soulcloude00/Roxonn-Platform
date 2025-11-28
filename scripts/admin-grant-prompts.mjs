import { db } from '../server/db.ts'; 
import { storage } from '../server/storage.ts'; 
import { users } from '../shared/schema.ts'; 
import { sql } from 'drizzle-orm';

async function grantPrompts() {
  const args = process.argv.slice(2); // Remove 'node' and script path

  if (args.length < 2 || args.length > 3) {
    console.error('Usage: node scripts/admin-grant-prompts.mjs <userId> <promptAmount> "[notes (optional)]"');
    console.error('Example: node scripts/admin-grant-prompts.mjs 1 50 "Reward for excellent community contribution"');
    process.exit(1);
  }

  const userId = parseInt(args[0]);
  const promptAmount = parseInt(args[1]);
  const notes = args[2] || 'Admin grant via script';

  if (isNaN(userId) || userId <= 0) {
    console.error('Error: Invalid userId. Must be a positive integer.');
    process.exit(1);
  }

  if (isNaN(promptAmount) || promptAmount === 0) {
    console.error('Error: Invalid promptAmount. Must be a non-zero integer (positive to grant, negative to deduct).');
    process.exit(1);
  }

  console.log(`Attempting to grant ${promptAmount} prompts to user ID: ${userId}. Notes: "${notes}"`);

  try {
    // Verify user exists
    const userExists = await db.select({ id: users.id }).from(users).where(sql`${users.id} = ${userId}`).limit(1);
    if (!userExists || userExists.length === 0) {
      console.error(`Error: User with ID ${userId} not found.`);
      process.exit(1);
    }

    await db.transaction(async (tx) => {
      const result = await storage.adjustUserPromptBalance(
        tx,
        userId,
        promptAmount,
        'admin_adjustment', // Using 'admin_adjustment' as the transaction type
        notes
      );

      if (result.success) {
        console.log(`Successfully adjusted ${promptAmount} prompts for user ${userId}.`);
        console.log(`New prompt balance: ${result.newBalance}`);
        console.log(`Ledger updated with notes: "${notes}"`);
      } else {
        console.error(`Failed to adjust prompts for user ${userId}: ${result.error}`);
        // Drizzle transaction will automatically roll back on error if an exception is thrown from here
        throw new Error(result.error || 'Prompt adjustment failed within transaction.');
      }
    });
    console.log('Operation completed.');
  } catch (error) {
    console.error('Error executing grant prompts script:', error instanceof Error ? error.message : String(error));
    process.exit(1); // Exit with error code if operation failed
  } finally {
    // If your db connection needs explicit closing and isn't handled globally:
    // await db.session().end(); // Or similar for your Drizzle pg driver
    // For many server setups, the script just exits and connection pool handles it.
  }
}

grantPrompts().catch(err => {
  console.error("Unhandled error in grantPrompts:", err);
  process.exit(1);
});
