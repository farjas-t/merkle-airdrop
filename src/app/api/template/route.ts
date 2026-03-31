import { NextResponse } from 'next/server';

export async function GET() {
  const rows = [
    'address,amount',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC7B,1000.0',
    '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB,500.5',
    '0x583031D1113aD414F02576BD6afaBfb302140225,250.25',
    '0xdD870fA1b7C4700F2BD7f44238821C26f739700 ,750.0',
    '0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C,100.0',
  ];
  
  const csv = rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="merkledropper_template.csv"',
    },
  });
}
