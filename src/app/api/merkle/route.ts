import { NextResponse } from 'next/server';
import { loadMerkleData } from '@/lib/data-store';

export async function GET() {
  const merkleData = loadMerkleData();
  if (!merkleData) {
    return NextResponse.json({ error: 'No merkle tree generated yet' }, { status: 404 });
  }

  return NextResponse.json({
    root: merkleData.root,
    totalAllocated: merkleData.totalAllocated,
    count: merkleData.count,
    timestamp: merkleData.timestamp,
  });
}
