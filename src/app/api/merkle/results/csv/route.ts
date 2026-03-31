import { NextResponse } from 'next/server';
import { loadMerkleData } from '@/lib/data-store';

export async function GET() {
  const merkleData = loadMerkleData();
  if (!merkleData) {
    return NextResponse.json({ error: 'No merkle tree generated yet' }, { status: 404 });
  }

  const lines = ['merkle_root,address,amount,proof'];
  for (const entry of merkleData.entries) {
    const proofStr = entry.proof.join('|');
    const row = [
      merkleData.root,
      entry.address,
      entry.amount,
      `"${proofStr}"`,
    ].join(',');
    lines.push(row);
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="merkledropper_results.csv"',
    },
  });
}
