# MerkleDropper UI

Modern React + Vite frontend for managing airdrop distributions and claiming tokens.

## ✨ Features

-   **Admin Dashboard**: Drag-and-drop CSV upload for Merkle root generation.
-   **Root Management**: One-click copy for smart contract deployment.
-   **Proof Verification**: Visual table showing all eligible addresses and their proofs.
-   **Interactive UI**: Sleek, glassmorphic design with real-time feedback (toasts).

## ⚙️ Configuration

Create a `.env` file in the `frontend` directory:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_AIRDROP_CONTRACT=0xYourContractAddressHere
```

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run in development mode**:
    ```bash
    npm run start
    ```
3.  **Build for production**:
    ```bash
    npm run build
    ```

## 📄 License
MIT
