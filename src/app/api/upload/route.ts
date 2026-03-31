import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse';
import { normalizeRow, buildMerkleTree, NormalizedRecord } from '@/lib/merkle';
import { saveMerkleData } from '@/lib/data-store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const content = await file.text();
    const records: NormalizedRecord[] = [];
    const parser = parse(content, { trim: true, skip_empty_lines: true });

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
      } catch (e: any) {
        console.warn('Skipping invalid row:', row, '-', e.message);
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 });
    }

    const merkleResult = buildMerkleTree(records);
    saveMerkleData(merkleResult);

    return NextResponse.json({
      root: merkleResult.root,
      count: merkleResult.count,
      totalAllocated: merkleResult.totalAllocated
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
