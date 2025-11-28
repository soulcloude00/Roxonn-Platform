// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DualCurrencyRepoRewardsProxy
 * @dev Proxy contract for DualCurrencyRepoRewards using UUPS pattern
 * This proxy is specifically for the dual currency (XDC + ROXN) rewards system
 */
contract DualCurrencyRepoRewardsProxy is ERC1967Proxy {
    /**
     * @dev Initializes the proxy with the implementation contract and initialization data
     * @param _logic Address of the DualCurrencyRepoRewards implementation contract
     * @param _data Encoded function call to initialize the implementation
     */
    constructor(address _logic, bytes memory _data) ERC1967Proxy(_logic, _data) {}
} 