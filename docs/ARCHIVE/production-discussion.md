ROXONN Platform: XDC Trading Functionality Implementation Plan
Executive Summary
This document outlines the development plan for implementing XDC trading functionality on the ROXONN platform, enabling users to purchase tokens, place project bounties, contribute to tasks, earn rewards, and withdraw funds. Based on a thorough codebase analysis, we've identified the existing components, gaps, and required modifications to enable these features while maintaining security and compliance standards.

Current State Assessment
Existing Components
Wallet Management Infrastructure
Complete wallet generation via walletService.ts using Tatum SDK
Private key management with AWS KMS encryption
Address generation and balance checking for both XDC and ROXN tokens
Transaction Infrastructure
transactionService.ts provides secure transaction signing
Proper gas management and fee data retrieval
Transaction broadcast functionality
Smart Contracts
Complete ROXNToken.sol with standard ERC-20 functionality
RepoRewards.sol with bounty distribution capabilities
Repository and reward management functions
GitHub Integration
Webhook handlers for issue events and pull requests
Automated reward distribution upon PR merges
Missing Components
Transaction Database Schema
No tables for tracking XDC purchases, sales, or fees
No financial transaction history for users
Fee Mechanisms
RepoRewards.sol lacks fee collection functionality
No service for tracking platform revenue
Payment Gateway Integration
No webhooks or API endpoints for payment callbacks
No integration with external buy/sell services (Transak)
Transaction Controls
No limits, monitoring, or flagging for suspicious activity
No verification integrations with GitHub for repository validation
Implementation Plan
Phase 1: Transaction Schema & Tracking (1 week)
Extend Database Schema
typescript
CopyInsert
// Add to shared/schema.ts
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'deposit', 'withdrawal', 'bounty', 'reward'
  amount: text('amount').notNull(),
  fee: text('fee'),
  status: text('status').notNull(), // 'pending', 'completed', 'failed'
  txHash: text('tx_hash'),
  externalReference: text('external_reference'), // Payment provider reference
  timestamp: timestamp('timestamp').defaultNow()
});

export const revenue = pgTable('revenue', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  amount: text('amount').notNull(),
  source: text('source').notNull(), // 'trading_fee', 'withdrawal_fee'
  timestamp: timestamp('timestamp').defaultNow()
});
Transaction Service Enhancement
typescript
CopyInsert
// Add to server/transactionService.ts
async recordTransaction(userId: number, type: string, amount: string, fee: string) {
  // Store transaction in database
  return await db.insert(transactions).values({
    userId,
    type,
    amount,
    fee,
    status: 'completed'
  }).returning();
}

async enforceTransactionLimits(userId: number, amount: string) {
  const DAILY_LIMIT = ethers.parseEther("1000"); // $1000 daily limit
  
  // Get user's daily transaction total
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const userTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.type, 'deposit'),
      eq(transactions.status, 'completed'),
      gte(transactions.timestamp, today)
    )
  });
  
  // Calculate total
  const dailyTotal = userTransactions.reduce((sum, tx) => {
    return sum + BigInt(tx.amount);
  }, BigInt(0));
  
  // Check if new transaction would exceed limit
  return (dailyTotal + ethers.parseEther(amount)) <= DAILY_LIMIT;
}
Phase 2: Smart Contract Fee Implementation (1 week)
Update RepoRewards Contract
solidity
CopyInsert
// Add to RepoRewards.sol
address public feeCollector;
uint256 public platformFeeRate = 300; // 3% default

function updateFeeParameters(address _feeCollector, uint256 _feeRate) external onlyOwner {
    feeCollector = _feeCollector;
    platformFeeRate = _feeRate;
}

// Modify addFundToRepository to include fee collection
function addFundToRepository(uint256 repoId, uint256 amount) external payable {
    // Calculate fee
    uint256 fee = amount * platformFeeRate / 10000;
    uint256 netAmount = amount - fee;
    
    // Transfer tokens
    roxnToken.safeTransferFrom(_msgSender(), address(this), netAmount);
    roxnToken.safeTransferFrom(_msgSender(), feeCollector, fee);
    
    // Update repository
    repositories[repoId].poolRewards += netAmount;
}
Phase 3: Payment Gateway Integration (2 weeks)
Create Payment Webhook Handler
typescript
CopyInsert
// Add to routes.ts
app.post('/api/payment/webhook', express.json(), async (req, res) => {
  try {
    // 1. Verify webhook signature from Transak
    const isValid = verifyWebhookSignature(req);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 2. Process the payment notification
    const { status, userId, amount, orderId } = req.body;
    
    if (status === 'COMPLETED') {
      // 3. Record the transaction
      await transactionService.recordTransaction(userId, 'deposit', amount, '0');
      
      // 4. Update user's XDC balance in database
      await storage.updateUserXdcBalance(userId, amount);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Failed to process payment webhook' });
  }
});
Generate Buy Widget URL
typescript
CopyInsert
// Add to routes.ts
app.get('/api/payment/buy', requireAuth, async (req, res) => {
  try {
    const { amount } = req.query;
    const user = req.user;
    
    // Generate Transak widget URL with user's wallet address
    const transakUrl = `[https://global.transak.com/?apiKey=${config.transakApiKey}&walletAddress=${user.xdcWalletAddress}&defaultCryptoCurrency=XDC&fiatAmount=${amount}`;](https://global.transak.com/?apiKey=${config.transakApiKey}&walletAddress=${user.xdcWalletAddress}&defaultCryptoCurrency=XDC&fiatAmount=${amount}`;)
    
    res.json({ url: transakUrl });
  } catch (error) {
    console.error('Error generating buy widget:', error);
    res.status(500).json({ error: 'Failed to generate buy widget' });
  }
});
Phase 4: Security & Verification (1 week)
Implement GitHub Repository Verification
typescript
CopyInsert
// Add to github.ts
async function verifyRepoExists(repoId: number): Promise<boolean> {
  try {
    // Convert numeric ID to owner/repo format using API
    const repo = await storage.getRepositoryById(repoId);
    if (!repo) {
      return false;
    }
    
    // Verify repository existence through GitHub API
    const response = await fetch(`[https://api.github.com/repos/${repo.owner}/${repo.name}`,](https://api.github.com/repos/${repo.owner}/${repo.name}`,) {
      headers: {
        Authorization: `token ${config.githubAppToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Error verifying repository:', error);
    return false;
  }
}
Add Transaction Monitoring
typescript
CopyInsert
// New file: server/monitoring.ts
export async function detectSuspiciousActivity(userId: number, amount: string, type: string): Promise<boolean> {
  // Implement basic pattern detection
  const recentTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.timestamp)],
    limit: 10
  });
  
  // Check for suspicious patterns
  // 1. Multiple large transactions in short time
  // 2. Unusual transaction sequence
  
  return false; // Return true if suspicious
}
Revenue Model & Fee Structure
Trading Fees: 3% on all XDC purchases via payment gateway
Withdrawal Fees: 1% on all withdrawals
Bounty Creation Fee: 2% on funds added to repositories
Security Considerations
Critical Security Controls
Transaction Limits:
Daily deposit limit of $1,000 per user
Withdrawal limits based on user verification level
Activity Logging:
Comprehensive transaction tracking
Audit trail for all financial actions
GitHub Verification:
Repository validation before allowing bounties
Contributor verification for reward distribution
Security Risks & Mitigations
| Risk | Mitigation | |------|------------| | Fake repository funding | GitHub API verification | | Reward distribution without verification | GitHub PR validation | | Money laundering | Transaction limits & monitoring | | Private key compromise | AWS KMS encryption |

Launch Strategy
Phase 1: Closed Beta (2 weeks)
Invite-only repositories from verified GitHub projects
Limited funding amounts ($5,000 max per repository)
Manual approval of first pool managers
Phase 2: Public Beta (4 weeks)
Open to all GitHub repositories with >100 stars
Implement transaction limits
Daily review of all transactions above $500
Phase 3: Full Launch
Open platform access
Automated monitoring system
Incremental increase of transaction limits
External Dependencies
Transak Integration:
API keys and webhook configuration
Testing environment setup
Smart Contract Updates:
Security audit
Deployment to mainnet
Development Timeline & Resources
Phase 1: Transaction Schema (1 week, 1 Backend Developer)
Phase 2: Fee Implementation (1 week, 1 Smart Contract Developer)
Phase 3: Payment Gateway (2 weeks, 1 Backend + 1 Frontend Developer)
Phase 4: Security (1 week, 1 Security Engineer)
Total: 5 weeks
Success Metrics
Revenue Generation:
Target: $10,000 in monthly platform fees within 3 months of launch
User Adoption:
500+ XDC transactions in first month
100+ funded repositories
Security:
Zero major security incidents
100% uptime for payment functionality
Risk Assessment & Contingency Plan
| Risk | Probability | Impact | Contingency | |------|------------|--------|-------------| | Payment provider issues | Medium | High | Maintain backup provider integration | | Regulatory changes | Low | High | Retain legal counsel for compliance | | Smart contract vulnerabilities | Low | Critical | Bug bounty program, insurance |

Next Steps
Obtain Transak API keys and integration documentation
Implement database schema changes
Develop and test fee collection mechanisms
Create transaction monitoring system
Implement payment provider webhooks


Backend Transaction Queue (Recommended, Most Robust):
Concept: Instead of directly calling blockchain.distributeReward from the webhook handler, add the distribution task (repoId, issueId, contributorAddress, pmId) to a persistent queue (like Redis, RabbitMQ, or even a simple database table queue) keyed by the pmId.
Worker: Have a separate background worker process (or use a library like bullmq) that picks up one task at a time per Pool Manager.
Nonce Management: The worker fetches the current nonce before processing a task for a PM, sends the transaction, waits for confirmation, and then proceeds to the next task for that PM, ensuring transactions are sent sequentially with correct nonces.
Pros: Reliable, handles failures/retries well, standard pattern for blockchain interactions.
Cons: Adds infrastructure complexity (queue system).


