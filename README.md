# ERC20 Merkle Airdrop Template

A professional, full-stack boilerplate for launching an ERC20 token airdrop using Merkle proofs for gas-efficient claiming.

## 🌲 Overview

This project provides a complete solution for token distributors to:
1.  **Mint a Custom Token**: A standard ERC20 token (CST) with minting capabilities.
2.  **Generate Merkle Proofs**: A Node.js backend that processes a CSV of recipient addresses and amounts, generating a Merkle Tree and individual proofs.
3.  **Deploy Airdrop Contract**: A secure Solidity contract that validates Merkle proofs before allowing users to claim their tokens.
4.  **Claim Interface**: A modern React-based dashboard for administrators to upload CSVs and for users to check eligibility and claim tokens.

## 🏗 Project Structure

-   `contracts/`: Solidity smart contracts (Hardhat/Foundry compatible).
    -   `CSTToken.sol`: The ERC20 token to be distributed.
    -   `MerkleAirdrop.sol`: The distribution contract logic.
-   `backend/`: Node.js/Express server for Merkle tree generation and proof serving.
-   `frontend/`: React + Vite application for the administrative and user interface.

## 🚀 Quick Start

### 1. Smart Contracts
Compile and deploy the contracts to your preferred network (Goerli, Sepolia, Mainnet, etc.).
Ensure you have the `token address` and the generated `merkle root` for the `MerkleAirdrop` constructor.

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```
-   The backend will run on `http://localhost:4000`.
-   Use the `/upload` endpoint or the Frontend UI to generate your Merkle root from a CSV.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run start
```
-   Configure your environment variables in `.env`:
    -   `VITE_BACKEND_URL`: URL of your backend.
    -   `VITE_AIRDROP_CONTRACT`: Address of the deployed `MerkleAirdrop` contract.

## 📊 CSV Format

Your distribution list should follow this format:
```csv
address,amount
0xAb5801a7D398351b8bE11C439e05C5B3259aeC7B,1000.0
0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB,500.5
```
*Note: Amounts are in token units (e.g., 100.5) and are automatically converted to 18-decimal wei by the backend.*

## 🛡 Security

-   Uses **OpenZeppelin** contracts for standard ERC20 and MerkleProof implementations.
-   Backend implements double-hashing for Merkle leaves to prevent second-preimage attacks.
-   Contract ownership controls for root updates and emergency withdrawals.

## 📄 License

MIT
