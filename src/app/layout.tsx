import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MerkleDropper | EVM Airdrop Merkle Tree Generator',
  description: 'Upload a wallet list, generate proofs instantly for your EVM airdrop smart contract.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
