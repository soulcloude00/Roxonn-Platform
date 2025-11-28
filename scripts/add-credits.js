// Script to add AI credits to user 1
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function addCredits() {
  try {
    console.log('Updating AI credits for user ID 1...');
    
    // First get current credits
    const userBefore = await db.query.users.findFirst({
      where: eq(users.id, 1),
      columns: {
        id: true,
        username: true,
        aiCredits: true
      }
    });
    
    console.log(`Current credits for ${userBefore?.username || 'User 1'}: ${userBefore?.aiCredits || 0}`);
    
    // Update credits to 1000
    const result = await db.update(users)
      .set({ aiCredits: 1000 })
      .where(eq(users.id, 1))
      .returning({ 
        id: users.id, 
        username: users.username, 
        aiCredits: users.aiCredits 
      });
    
    if (result.length === 0) {
      console.error('Error: User not found');
      process.exit(1);
    }
    
    console.log(`Updated AI credits for ${result[0].username} (ID: ${result[0].id}) to ${result[0].aiCredits}`);
  } catch (error) {
    console.error('Error updating credits:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the function
addCredits();
