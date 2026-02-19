// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CSTToken is ERC20, ERC20Burnable, Ownable {
    /**
     * @param initialSupply Total supply (in smallest units, e.g. with 18 decimals)
     * @param owner Address that will receive the initial supply
     */
    constructor(
        uint256 initialSupply,
        address owner
    ) ERC20("Custom Token", "CST") {
        require(owner != address(0), "Invalid owner");

        _mint(owner, initialSupply);
        _transferOwnership(owner);
    }
}