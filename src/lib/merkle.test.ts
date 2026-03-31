import { describe, it, expect } from 'vitest';
import { normalizeRow, buildMerkleTree } from './merkle';
import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

describe('merkle.ts', () => {
  describe('normalizeRow', () => {
    it('should normalize a valid address and integer amount', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const amount = '1000000000000000000';
      const result = normalizeRow(address, amount);
      expect(result.address).toBe(ethers.getAddress(address));
      expect(result.amount).toBe(ethers.parseEther(amount).toString());
    });

    it('should normalize a valid address and decimal amount', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const amount = '1.5';
      const result = normalizeRow(address, amount);
      expect(result.address).toBe(ethers.getAddress(address));
      expect(result.amount).toBe(ethers.parseEther('1.5').toString());
    });

    it('should throw on invalid address', () => {
      expect(() => normalizeRow('0xinvalid', '100')).toThrow();
    });

    it('should throw on invalid amount format', () => {
      expect(() => normalizeRow('0x1234567890123456789012345678901234567890', '100abc')).toThrow(/Invalid amount/);
    });

    it('should handle whitespace in address and amount', () => {
      const result = normalizeRow('  0x1234567890123456789012345678901234567890  ', '  500  ');
      expect(result.address).toBe('0x1234567890123456789012345678901234567890');
      expect(result.amount).toBe(ethers.parseEther('500').toString());
    });
  });

  describe('buildMerkleTree', () => {
    const records = [
      { address: '0x1234567890123456789012345678901234567890', amount: '1000' },
      { address: '0x2345678901234567890123456789012345678901', amount: '2000' },
      { address: '0x3456789012345678901234567890123456789012', amount: '3000' },
    ];

    it('should build a tree with a valid root', () => {
      const result = buildMerkleTree(records);
      expect(result.root).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.count).toBe(3);
      expect(result.totalAllocated).toBe('6000');
    });

    it('should generate valid proofs for all entries', () => {
      const result = buildMerkleTree(records);
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();

      result.entries.forEach((entry) => {
        // Re-calculate leaf as the contract would
        const leaf = ethers.keccak256(abiCoder.encode(['address', 'uint256'], [entry.address, entry.amount]));
        const doubleLeaf = ethers.keccak256(leaf);
        const doubleLeafBuffer = Buffer.from(doubleLeaf.slice(2), 'hex');

        const tree = new MerkleTree(
          records.map(r => {
             const l = ethers.keccak256(abiCoder.encode(['address', 'uint256'], [r.address, r.amount]));
             const dl = ethers.keccak256(l);
             return Buffer.from(dl.slice(2), 'hex');
          }),
          keccak256,
          { sortPairs: true }
        );

        const isValid = tree.verify(entry.proof, doubleLeafBuffer, result.root);
        expect(isValid).toBe(true);
      });
    });

    it('should handle a single entry tree', () => {
      const singleRecord = [{ address: '0x1234567890123456789012345678901234567890', amount: '100' }];
      const result = buildMerkleTree(singleRecord);
      expect(result.count).toBe(1);
      
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const leaf = ethers.keccak256(abiCoder.encode(['address', 'uint256'], [singleRecord[0].address, singleRecord[0].amount]));
      const doubleLeaf = ethers.keccak256(leaf);
      
      expect(result.root).toBe(doubleLeaf);
      expect(result.entries[0].proof).toEqual([]);
    });

    it('should correctly calculate total allocated for large numbers', () => {
      const largeRecords = [
        { address: '0x1234567890123456789012345678901234567890', amount: ethers.parseEther('1000000').toString() },
        { address: '0x2345678901234567890123456789012345678901', amount: ethers.parseEther('2000000').toString() },
      ];
      const result = buildMerkleTree(largeRecords);
      expect(result.totalAllocated).toBe(ethers.parseEther('3000000').toString());
    });

    it('should handle duplicate addresses in entries but mapping will have last proof', () => {
      const duplicateRecords = [
        { address: '0x1234567890123456789012345678901234567890', amount: '100' },
        { address: '0x1234567890123456789012345678901234567890', amount: '200' },
      ];
      const result = buildMerkleTree(duplicateRecords);
      expect(result.entries.length).toBe(2);
      expect(result.proofs['0x1234567890123456789012345678901234567890'].amount).toBe('200');
    });
  });
});
