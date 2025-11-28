import { db } from '../db';
import { exoNodes } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { config } from '../config';
import ProofOfCompute_ABI from '../../contracts/artifacts/contracts/ProofOfCompute.sol/ProofOfCompute.json';
import axios from 'axios';

if (!config.xdcRpcUrl || !config.proofOfComputeContractAddress || !config.relayerPrivateKey) {
  throw new Error("Missing required configuration for Proof of Compute service.");
}

const provider = new ethers.JsonRpcProvider(config.xdcRpcUrl);
const contract = new ethers.Contract(config.proofOfComputeContractAddress, ProofOfCompute_ABI.abi, provider);

async function getAvailableNodes() {
  const nodes = await db.select().from(exoNodes).where(eq(exoNodes.status, 'online'));
  // Shuffle the array to randomize node selection for fairness
  for (let i = nodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
  }
  return nodes;
}

async function recordContribution(walletAddress: string) {
  try {
    const ethAddress = walletAddress.replace('xdc', '0x');
    const signer = new ethers.Wallet(config.relayerPrivateKey, provider);
    const contractWithSigner = contract.connect(signer) as ethers.Contract;
    // For V1, we'll record a standard 1 unit of compute per task.
    const tx = await contractWithSigner.recordCompute(ethAddress);
    await tx.wait();
    console.log(`Successfully recorded compute unit for provider ${walletAddress} with tx: ${tx.hash}`);
  } catch (error) {
    console.error(`Failed to record contribution for provider ${walletAddress}:`, error);
  }
}

export async function dispatchTask(prompt: string): Promise<any> {
  const availableNodes = await getAvailableNodes();
  if (availableNodes.length === 0) {
    throw new Error("No available exo nodes to process the request.");
  }

  for (const node of availableNodes) {
    try {
      const workerUrl = `http://${node.ipAddress}:${node.port}/execute-task`;
      const response = await axios.post(workerUrl, { prompt });

      if (response.data.status === "task complete") {
        await recordContribution(node.walletAddress);
        return {
          message: response.data.response,
          nodeId: node.id,
          walletAddress: node.walletAddress
        };
      }
    } catch (error) {
      console.error(`Failed to dispatch task to node ${node.id}:`, error);
      // In a more robust system, we would mark the node as unhealthy here.
      // For V1, we simply try the next available node.
    }
  }

  throw new Error("Task processing failed: All available nodes failed to respond.");
}
