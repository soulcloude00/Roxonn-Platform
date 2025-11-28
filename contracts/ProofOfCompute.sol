// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProofOfCompute is Ownable {
    struct Node {
        address owner;
        string nodeId; // The exo node's unique ID
        bool isRegistered;
    }

    mapping(address => uint256) public computeUnits;
    mapping(string => Node) public nodes; // Maps nodeId to Node struct
    mapping(address => bool) public registeredWallets; // Maps wallet address to registration status

    event NodeRegistered(address indexed owner, string nodeId);
    event ComputeRecorded(address indexed provider, uint256 totalUnits);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerNode(string calldata nodeId) public {
        require(!registeredWallets[msg.sender], "Wallet already has a registered node");
        nodes[nodeId] = Node({
            owner: msg.sender,
            nodeId: nodeId,
            isRegistered: true
        });
        registeredWallets[msg.sender] = true;
        emit NodeRegistered(msg.sender, nodeId);
    }

    function recordCompute(address provider) public onlyOwner {
        require(registeredWallets[provider], "Provider node is not registered");
        computeUnits[provider]++;
        emit ComputeRecorded(provider, computeUnits[provider]);
    }
}
