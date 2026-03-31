export interface MerkleEntry {
  address: string;
  amount: string;
  proof: string[];
}

export interface MerkleData {
  root: string;
  totalAllocated: string;
  count: number;
  timestamp: number;
  entries: MerkleEntry[];
  proofs: Record<string, { amount: string; proof: string[] }>;
}

// Data store is now NO-OP to support stateless/serverless environments (fixes EROFS issues)
export function saveMerkleData(data: MerkleData) {
  // Persistence is disabled
  return;
}

export function loadMerkleData(): MerkleData | null {
  // Persistence is disabled
  return null;
}
