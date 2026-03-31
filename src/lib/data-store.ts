import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MERKLE_FILE = path.join(DATA_DIR, 'merkle.json');

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

export function saveMerkleData(data: MerkleData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(MERKLE_FILE, JSON.stringify(data, null, 2));
}

export function loadMerkleData(): MerkleData | null {
  if (fs.existsSync(MERKLE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MERKLE_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error loading merkle data:', e);
      return null;
    }
  }
  return null;
}
