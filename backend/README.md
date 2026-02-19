# MerkleDropper Backend

High-performance Node.js backend for generating Merkle Trees and serving individual proofs for ERC20 airdrops.

## 🛠 Features

-   **CSV Processing**: Parses `address,amount` lists with automatic normalization.
-   **Merkle Generation**: Builds trees using `merkletreejs` and `keccak256`.
-   **Proof API**: serves individual cryptographic proofs for wallet addresses.
-   **Persistent Storage**: Saves tree data to `merkle.json` for consistent access.

## 🚦 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload CSV and generate a new Merkle Tree. |
| `GET` | `/root` | Retrieve the current Merkle Root and metadata. |
| `GET` | `/proof/:address` | Get the Merkle proof for a specific address. |
| `GET` | `/results` | Get all entries and proofs in JSON format. |
| `GET` | `/results/csv` | Download the results as a CSV with proofs included. |
| `GET` | `/template` | Download a sample CSV template. |

## 🧬 Leaf Hashing Logic

To ensure compatibility with professional smart contracts and prevent vulnerabilities, leaves are generated as follows:
`keccak256(keccak256(abi.encode(address, uint256)))`

This matches the OpenZeppelin **Standard Merkle Tree** implementation.

## 🏃 Run Locally

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the server**:
    ```bash
    npm start
    ```
    *Default port is 4000.*

## 📄 License
MIT
