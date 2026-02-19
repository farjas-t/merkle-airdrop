const express = require('express');
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');
const path = require('path');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { ethers } = require('ethers');
const cors = require('cors');
const bodyParser = require('body-parser');

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(cors());
app.use(bodyParser.json());

const MERKLE_FILE = path.join(__dirname, 'merkle.json');

let merkleData = null;

function saveMerkle(data) {
  fs.writeFileSync(MERKLE_FILE, JSON.stringify(data, null, 2));
  merkleData = data;
}

function loadMerkle() {
  if (fs.existsSync(MERKLE_FILE)) {
    try {
      merkleData = JSON.parse(fs.readFileSync(MERKLE_FILE));
    } catch (e) {
      merkleData = null;
    }
  }
}

loadMerkle();

// helper: normalize address and amount
function normalizeRow(address, amount) {
  const addr = ethers.getAddress(address.trim());
  const amtStr = String(amount).trim();
  // Accept decimal token amounts (e.g. 100.5) and convert to wei (18 decimals)
  if (!/^[0-9]+(\.[0-9]+)?$/.test(amtStr)) {
    throw new Error(`Invalid amount: ${amtStr}`);
  }
  // If it has decimals, parse as ether (18 dec); if already integer treat as raw wei
  const amtBigInt = amtStr.includes('.')
    ? ethers.parseEther(amtStr)
    : BigInt(amtStr);
  return { address: addr, amount: amtBigInt.toString() };
}

// ─── GET /template ─────────────────────────────────────────────────────────
// Streams a sample CSV template for the user to download and fill
app.get('/template', (req, res) => {
  const rows = [
    'address,amount',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC7B,1000.0',
    '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB,500.5',
    '0x583031D1113aD414F02576BD6afaBfb302140225,250.25',
    '0xdD870fA1b7C4700F2BD7f44238821C26f739700 ,750.0',
    '0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C,100.0',
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="merkledropper_template.csv"');
  res.send(rows.join('\n'));
});

// ─── POST /upload ───────────────────────────────────────────────────────────
// Accepts a CSV (address,amount), builds the Merkle tree, returns root + count
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    let content;
    try {
      content = fs.readFileSync(filePath);
    } finally {
      try { fs.unlinkSync(filePath); } catch (_) { }
    }

    const records = [];
    const parser = csv.parse(content, { trim: true, skip_empty_lines: true });

    let isHeader = true;
    for await (const row of parser) {
      // Skip header row if present
      if (isHeader && row[0].toLowerCase() === 'address') {
        isHeader = false;
        continue;
      }
      isHeader = false;

      if (row.length < 2) continue;
      try {
        const n = normalizeRow(row[0], row[1]);
        records.push(n);
      } catch (e) {
        console.warn('Skipping invalid row:', row, '-', e.message);
      }
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid rows found in CSV' });
    }

    // Build leaves: keccak256(bytes.concat(keccak256(abi.encode(address, uint256))))
    // This matches the smart contract's leaf generation and OpenZeppelin's Standard Merkle Tree
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const leafBuffers = records.map(r => {
      const leaf = ethers.keccak256(abiCoder.encode(['address', 'uint256'], [r.address, r.amount]));
      const doubleLeaf = ethers.keccak256(leaf);
      return Buffer.from(doubleLeaf.slice(2), 'hex');
    });

    const tree = new MerkleTree(leafBuffers, keccak256, { sortPairs: true });
    const root = '0x' + tree.getRoot().toString('hex');

    const proofs = {};
    const entries = [];
    for (let i = 0; i < records.length; i++) {
      const leaf = leafBuffers[i];
      const proof = tree.getHexProof(leaf);
      const addr = records[i].address.toLowerCase();
      proofs[addr] = { amount: records[i].amount, proof };
      entries.push({
        address: records[i].address,
        amount: records[i].amount,
        proof,
      });
    }

    const totalAllocated = records.reduce((s, r) => s + BigInt(r.amount), 0n).toString();

    const merkle = {
      root,
      totalAllocated,
      count: records.length,
      timestamp: Date.now(),
      entries,
      proofs,
    };

    saveMerkle(merkle);

    return res.json({ root, count: records.length, totalAllocated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /root ──────────────────────────────────────────────────────────────
app.get('/root', (req, res) => {
  if (!merkleData) return res.status(404).json({ error: 'No merkle tree generated yet' });
  return res.json({
    root: merkleData.root,
    totalAllocated: merkleData.totalAllocated,
    count: merkleData.count,
    timestamp: merkleData.timestamp,
  });
});

// ─── GET /results ───────────────────────────────────────────────────────────
// Returns full entries list (for frontend table)
app.get('/results', (req, res) => {
  if (!merkleData) return res.status(404).json({ error: 'No merkle tree generated yet' });
  return res.json({
    root: merkleData.root,
    totalAllocated: merkleData.totalAllocated,
    count: merkleData.count,
    timestamp: merkleData.timestamp,
    entries: merkleData.entries,
  });
});

// ─── GET /results/csv ───────────────────────────────────────────────────────
// Streams results as a downloadable CSV: merkle_root,address,amount,proof
app.get('/results/csv', (req, res) => {
  if (!merkleData) return res.status(404).json({ error: 'No merkle tree generated yet' });

  const lines = ['merkle_root,address,amount,proof'];
  for (const entry of merkleData.entries) {
    const proofStr = entry.proof.join('|');
    // Escape double quotes in fields
    const row = [
      merkleData.root,
      entry.address,
      entry.amount,
      `"${proofStr}"`,
    ].join(',');
    lines.push(row);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="merkledropper_results.csv"');
  res.send(lines.join('\n'));
});

// ─── GET /proof/:address ────────────────────────────────────────────────────
app.get('/proof/:address', (req, res) => {
  if (!merkleData) return res.status(404).json({ error: 'No merkle tree generated yet' });
  const addr = req.params.address.toLowerCase();
  const p = merkleData.proofs[addr];
  if (!p) return res.status(404).json({ error: 'Address not found in tree' });
  return res.json({ ...p, root: merkleData.root });
});

// ─── GET /merkle.json ───────────────────────────────────────────────────────
app.get('/merkle.json', (req, res) => {
  if (!merkleData) return res.status(404).json({ error: 'No merkle tree generated yet' });
  res.sendFile(MERKLE_FILE);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MerkleDropper backend listening on port ${PORT}`));
