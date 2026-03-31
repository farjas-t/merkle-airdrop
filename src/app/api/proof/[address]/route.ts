import { NextRequest, NextResponse } from 'next/server';
import { loadMerkleData } from '@/lib/data-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const merkleData = loadMerkleData();
  if (!merkleData) {
    return NextResponse.json({ error: 'No merkle tree generated yet' }, { status: 404 });
  }

  const { address } = await params;
  const addr = address.toLowerCase();
  const p = merkleData.proofs[addr];

  if (!p) {
    return NextResponse.json({ error: 'Address not found in tree' }, { status: 404 });
  }

  return NextResponse.json({ ...p, root: merkleData.root });
}
