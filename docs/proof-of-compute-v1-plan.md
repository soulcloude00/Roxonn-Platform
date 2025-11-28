# V1 Implementation Plan: "Proof of Compute"

This document provides the definitive, end-to-end technical plan for the V1 "Proof of Compute" showcase. No code will be written until this plan is fully understood and approved.

## Objective
Create a demonstrable V1 showcase where a user can run an `exo` node, perform a compute task dispatched by the Roxonn platform, and see a verifiable "Proof of Compute" transaction recorded on the XDC blockchain.

## Core Narrative
"Start your engine. Join the Roxonn network and put your hardware to work. Every computation your node performs is a 'Proof of Compute' event, logged on-chain, building your reputation and securing your future earnings in the decentralized AI economy."

---

## Phase 1: `exo` Framework Modification
**Goal:** Make the `exo` node identifiable to the Roxonn network and enable it to respond to dispatched tasks.

*   **Step 1.1: Add CLI Argument**
    *   **File:** `../exo/exo/main.py`
    *   **Change:** Add a new command-line argument using `argparse`: `--roxonn-wallet-address <WALLET_ADDRESS>`. This will allow a user to associate their node with their XDC wallet.

*   **Step 1.2: Implement the Heartbeat Ping**
    *   **File:** `../exo/exo/main.py`
    *   **Change:** Implement a new asynchronous function that sends a periodic `POST` request (a "heartbeat") to a new `/api/node/heartbeat` endpoint on the Roxonn backend. This heartbeat will contain the node's unique ID and its Roxonn wallet address. This is a reliable mechanism that works over the internet between different servers.

*   **Step 1.3: Create a Task Listener Endpoint in `exo`**
    *   **File:** A new file, e.g., `../exo/exo/api/task_listener.py`, or integrated into an existing API file like `../exo/exo/api.py`.
    *   **Change:** Implement a simple, authenticated REST endpoint (e.g., `POST /compute-task`).
    *   **Logic:** This endpoint will receive a simulated "compute task" from the Roxonn backend, perform a placeholder calculation to simulate work, and return a "task complete" confirmation. For V1, this does not need to touch the core inference engine.

---

## Phase 2: Smart Contract Development
**Goal:** Create the immutable, on-chain ledger for recording "Proof of Compute."

*   **Step 2.1: Create the `ProofOfCompute.sol` Contract**
    *   **File:** `contracts/ProofOfCompute.sol` (in the `~/GitHubIdentity` project).
    *   **Content:**
        ```solidity
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.20;

        import "@openzeppelin/contracts/access/Ownable.sol";

        contract ProofOfCompute is Ownable {
            mapping(address => uint256) public computeUnits;

            event ComputeRecorded(address indexed provider, uint256 totalUnits);

            constructor(address initialOwner) Ownable(initialOwner) {}

            function recordCompute(address provider) public onlyOwner {
                computeUnits[provider]++;
                emit ComputeRecorded(provider, computeUnits[provider]);
            }
        }
        ```

*   **Step 2.2: Compile and Deploy**
    *   **Action:**
        1.  Compile the contract using `npx hardhat compile`.
        2.  Create a deployment script `scripts/deploy_proof_of_compute.cjs`.
        3.  Deploy the contract to the XDC Apothem testnet.
        4.  **Crucially, save the deployed contract address.** This address will be added to the Roxonn backend's `.env` file.

---

## Phase 3: Roxonn Platform Implementation (Backend & Frontend)
**Goal:** Build the central orchestrator ("Dispatcher") and the user-facing dashboard.

*   **Step 3.1: Backend - Database Schema**
    *   **File:** `shared/schema.ts`
    *   **Change:** Add a new table definition for `exo_nodes` to track the `wallet_address`, `status` (online/offline), and `last_seen` timestamp of active nodes. Run the database migration.

*   **Step 3.2: Backend - Heartbeat and Task Dispatcher Service**
    *   **Files:** A new service, `server/services/exoNodeService.ts`, and modifications to `server/services/proofOfComputeService.ts`.
    *   **Change:**
        1.  **Heartbeat Handler:** Implement the logic for the `/api/node/heartbeat` endpoint. This function will receive pings from `exo` nodes and update their `status` and `last_seen` timestamp in the `exo_nodes` database table.
        2.  **Task Dispatcher:** The `dispatchTask` function will now query the `exo_nodes` table for a node with an "online" status to send the task to.
        3.  **Offline Job (Future):** A scheduled job will periodically run to mark nodes as "offline" if their `last_seen` timestamp is too old.

*   **Step 3.3: Backend - API Endpoints**
    *   **File:** `server/routes.ts`
    *   **Change:** Add the new routes (`/api/node/dispatch-task`, `/api/node/status`) and connect them to the `proofOfComputeService`.

*   **Step 3.4: Frontend - "Provider Hub" Page**
    *   **File:** `client/src/pages/provider-hub-page.tsx`.
    *   **Content:** Create the UI for the dashboard.
    *   **Functionality:**
        *   Display the logged-in user's wallet address and the `exo run` command.
        *   Include a "Request Compute Task" button that calls the `/api/node/dispatch-task` endpoint.
        *   Display "My Compute Units" by using `ethers.js` to make a direct, read-only call to the `computeUnits` mapping on the deployed `ProofOfCompute.sol` contract.
        *   Provide a link to the XDC block explorer that shows the user's address, so they can see their `recordCompute` transactions.
