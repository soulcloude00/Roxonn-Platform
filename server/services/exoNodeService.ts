import { db } from '../db';
import { exoNodes } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export async function handleHeartbeat(nodeId: string, walletAddress: string, ipAddress: string, port: number) {
  const now = new Date();
  await db.insert(exoNodes)
    .values({ id: nodeId, walletAddress: walletAddress, ipAddress: ipAddress, port: port, status: 'online', lastSeen: now })
    .onConflictDoUpdate({
      target: exoNodes.id,
      set: { ipAddress: ipAddress, port: port, status: 'online', lastSeen: now }
    });
}

export async function updateOfflineNodes() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await db.update(exoNodes)
    .set({ status: 'offline' })
    .where(and(eq(exoNodes.status, 'online'), lt(exoNodes.lastSeen, fiveMinutesAgo)));
}

export async function getNodeStatus(walletAddress: string): Promise<{ status: 'online' | 'offline' }> {
  const node = await db.query.exoNodes.findFirst({
    where: eq(exoNodes.walletAddress, walletAddress),
  });

  if (!node) {
    return { status: 'offline' };
  }

  // Consider node offline if last heartbeat was more than 2 minutes ago
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  if (node.lastSeen < twoMinutesAgo) {
    return { status: 'offline' };
  }

  return { status: node.status as 'online' | 'offline' };
}

export async function getAllNodeStatuses() {
  const nodes = await db.query.exoNodes.findMany();
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  return nodes.map(node => ({
    ...node,
    status: node.lastSeen < twoMinutesAgo ? 'offline' : 'online',
  }));
}
