import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { ethers } from 'ethers';

export interface NormalizedRecord {
  address: string;
  amount: string;
}

export function normalizeRow(address: string, amount: string): NormalizedRecord {
  const addr = ethers.getAddress(address.trim());
  const amtStr = String(amount).trim();

  // Accept decimal token amounts (e.g. 100.5) and convert to wei (18 decimals)
  if (!/^[0-9]+(\.[0-9]+)?$/.test(amtStr)) {
    throw new Error(`Invalid amount: ${amtStr}`);
  }

  // Convert all token amounts to wei (18 decimals)
  const amtBigInt = ethers.parseEther(amtStr);

  return { address: addr, amount: amtBigInt.toString() };
}

export function buildMerkleTree(records: NormalizedRecord[]) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  const leafBuffers = records.map(r => {
    // keccak256(bytes.concat(keccak256(abi.encode(address, uint256))))
    // Matches the smart contract's leaf generation
    const leaf = ethers.keccak256(abiCoder.encode(['address', 'uint256'], [r.address, r.amount]));
    const doubleLeaf = ethers.keccak256(leaf);
    return Buffer.from(doubleLeaf.slice(2), 'hex');
  });

  const tree = new MerkleTree(leafBuffers, keccak256, { sortPairs: true });
  const root = '0x' + tree.getRoot().toString('hex');

  const proofs: Record<string, { amount: string; proof: string[] }> = {};
  const entries = records.map((record, i) => {
    const leaf = leafBuffers[i];
    const proof = tree.getHexProof(leaf);
    const addr = record.address.toLowerCase();
    proofs[addr] = { amount: record.amount, proof };
    return {
      address: record.address,
      amount: record.amount,
      proof,
    };
  });

  const totalAllocated = records.reduce((s, r) => s + BigInt(r.amount), BigInt(0)).toString();

  return {
    root,
    totalAllocated,
    count: records.length,
    timestamp: Date.now(),
    entries,
    proofs,
  };
}
