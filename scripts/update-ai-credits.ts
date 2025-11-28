// Script to update AI credits for a user
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { log } from '../server/utils';

async function updateAICredits() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Usage: npm run ts-node scripts/update-ai-credits.ts <userId> <credits>');
      console.error('Example: npm run ts-node scripts/update-ai-credits.ts 1 1000');
      process.exit(1);
    }
    
    const userId = parseInt(args[0], 10);
    const credits = parseInt(args[1], 10);
    
    if (isNaN(userId) || isNaN(credits)) {
      console.error('Error: userId and credits must be valid numbers');
      process.exit(1);
    }
    
    // Update the user's AI credits
    const result = await db.update(users)
      .set({ aiCredits: credits })
      .where(eq(users.id, userId))
      .returning({ id: users.id, username: users.username, aiCredits: users.aiCredits });
    
    if (result.length === 0) {
      console.error(`Error: No user found with ID ${userId}`);
      process.exit(1);
    }
    
    console.log(`Updated AI credits for user ${result[0].username} (ID: ${result[0].id}) to ${result[0].aiCredits}`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating AI credits:', error);
    process.exit(1);
  }
}

// Run the function
updateAICredits();
