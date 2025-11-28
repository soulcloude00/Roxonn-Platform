import { db } from '../server/db.ts'; // Assuming direct execution with tsx/ts-node
import { storage } from '../server/storage.ts';
import { users } from '../shared/schema.ts';
import { sql } from 'drizzle-orm';

async function bulkGrantPrompts() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Usage: npx tsx scripts/admin-bulk-grant-prompts.mjs <promptAmountToGrant>');
    console.error('Example: npx tsx scripts/admin-bulk-grant-prompts.mjs 10');
    process.exit(1);
  }

  const promptAmountToGrant = parseInt(args[0]);

  if (isNaN(promptAmountToGrant) || promptAmountToGrant <= 0) {
    console.error('Error: Invalid promptAmountToGrant. Must be a positive integer.');
    process.exit(1);
  }

  const notes = `Bulk grant of ${promptAmountToGrant} prompts to existing users`;
  console.log(`Attempting to grant ${promptAmountToGrant} prompts to ALL existing users. Notes: "${notes}"`);

  try {
    const allUserIds = await db.select({ id: users.id }).from(users);

    if (!allUserIds || allUserIds.length === 0) {
      console.log('No users found in the database. Exiting.');
      process.exit(0);
    }

    console.log(`Found ${allUserIds.length} users. Proceeding with grant...`);
    let successCount = 0;
    let failureCount = 0;

    for (const user of allUserIds) {
      try {
        // Using a separate transaction for each user to allow partial success if one fails
        await db.transaction(async (tx) => {
          const result = await storage.adjustUserPromptBalance(
            tx,
            user.id,
            promptAmountToGrant,
            'admin_adjustment',
            notes
          );

          if (result.success) {
            console.log(`  Successfully granted ${promptAmountToGrant} prompts to user ${user.id}. New balance: ${result.newBalance}`);
            successCount++;
          } else {
            console.error(`  Failed to grant prompts to user ${user.id}: ${result.error}`);
            failureCount++;
          }
        });
      } catch (userError) {
        console.error(`  Error processing user ${user.id}: ${userError instanceof Error ? userError.message : String(userError)}`);
        failureCount++;
      }
    }

    console.log('\nBulk grant operation summary:');
    console.log(`  Successfully granted prompts to: ${successCount} users.`);
    console.log(`  Failed to grant prompts to: ${failureCount} users.`);
    console.log('Operation completed.');

  } catch (error) {
    console.error('Error executing bulk grant prompts script:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    // Optional: await db.session().end(); if needed
  }
}

bulkGrantPrompts().catch(err => {
  console.error("Unhandled error in bulkGrantPrompts:", err);
  process.exit(1);
});
