// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleAirdrop is Ownable {
    IERC20 public immutable token;
    bytes32 public merkleRoot;

    // Tracks whether an address has claimed
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed claimant, uint256 amount);
    event MerkleRootUpdated(bytes32 newRoot);

    constructor(address _token, bytes32 _merkleRoot) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
    }

    /**
     * @notice Claim allocated tokens
     * @param amount Token amount allocated to msg.sender
     * @param merkleProof Proof showing msg.sender + amount is in the tree
     */
    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(amount > 0, "Invalid amount");

        // Create leaf node
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, amount))
            )
        );

        // Verify proof
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid proof"
        );

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        // Transfer tokens
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit Claimed(msg.sender, amount);
    }

    /**
     * @notice Update Merkle root (for phased drops)
     */
    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    /**
     * @notice Withdraw unclaimed tokens after airdrop
     */
    function withdrawUnclaimed(address to, uint256 amount) external onlyOwner {
        require(token.transfer(to, amount), "Withdraw failed");
    }
}
