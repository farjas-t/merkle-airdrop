'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Toast System ─────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return { 
    toasts, 
    toast: { 
      success: (m: string) => add('success', m), 
      error: (m: string) => add('error', m), 
      info: (m: string) => add('info', m) 
    } 
  };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Proof Row ────────────────────────────────────────────────────────────────
function ProofRow({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <tr>
      <td className="td-address">{entry.address}</td>
      <td className="td-amount">{formatAmount(entry.amount)}</td>
      <td>
        <button className="proof-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲ Hide' : `▼ ${entry.proof.length} hashes`}
        </button>
        {expanded && (
          <ul className="proof-list">
            {entry.proof.map((h: string, i: number) => <li key={i}>{h}</li>)}
          </ul>
        )}
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(weiStr: string) {
  try {
    const n = BigInt(weiStr);
    const eth = Number(n) / 10**18;
    return eth.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return weiStr;
  }
}

function copyToClipboard(text: string, cb?: () => void) {
  navigator.clipboard.writeText(text).then(() => cb && cb()).catch(() => { });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function MerkleDropperPage() {
  const { toasts, toast } = useToasts();

  // State
  const [merkleInfo, setMerkleInfo] = useState<any>(null);   // { root, count, totalAllocated, timestamp }
  const [entries, setEntries] = useState<any[]>([]);     // full proof table
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Stateless: data is only available after upload
  useEffect(() => {
    // We no longer attempt to load a persistent root on mount to avoid EROFS issues
  }, []);

  // ── Download Template ───────────────────────────────────────────────────────
  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = `/api/template`;
    a.download = 'merkledropper_template.csv';
    a.click();
    toast.info('Template CSV downloaded');
  }

  // ── File Selection ──────────────────────────────────────────────────────────
  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFileSelect(f);
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }

  // ── Upload & Generate ───────────────────────────────────────────────────────
  async function uploadCsv() {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post(`/api/upload`, fd);
      setMerkleInfo(r.data);
      setEntries(r.data.entries || []); // Set entries directly from upload response
      toast.success(`Merkle tree generated for ${r.data.count} addresses`);
      setFile(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── Copy Root ───────────────────────────────────────────────────────────────
  function handleCopy() {
    copyToClipboard(merkleInfo?.root || '', () => {
      setCopied(true);
      toast.success('Merkle root copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Download Results (Client-Side) ──────────────────────────────────────────
  function downloadResults() {
    if (!merkleInfo || entries.length === 0) return;

    const lines = ['merkle_root,address,amount,proof'];
    for (const entry of entries) {
      const proofStr = entry.proof.join('|');
      const row = [
        merkleInfo.root,
        entry.address,
        entry.amount,
        `"${proofStr}"`,
      ].join(',');
      lines.push(row);
    }

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'merkledropper_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Results CSV generated and downloaded');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  const step1Done = true;
  const step2Done = !!merkleInfo;

  return (
    <>
      <ToastContainer toasts={toasts} />

      <div className="app-wrapper">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="header">
          <div className="logo-mark">
            <span className="logo-icon">🌲</span>
          </div>
          <h1 className="app-name">MerkleDropper</h1>
          <p className="app-tagline">
            EVM Airdrop Merkle Tree Generator - upload a wallet list, generate proofs instantly
          </p>
        </header>

        {/* ── Step 1: Download Template ────────────────────────────────── */}
        <section className="section">
          <div className="card">
            <div className="card-header">
              <span className={`step-badge ${step1Done ? 'done' : ''}`}>1</span>
              <div>
                <div className="card-title">Download CSV Template</div>
                <div className="card-subtitle">Get the fillable template with sample wallet addresses & amounts</div>
              </div>
            </div>
            <button id="btn-download-template" className="btn btn-secondary" onClick={downloadTemplate}>
              <span className="btn-icon">⬇</span>
              Download Template CSV
            </button>
            <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
              Format: <code style={{ color: 'var(--text-code)', fontFamily: "'JetBrains Mono', monospace" }}>address,amount</code> - amounts are in token units (e.g. <code style={{ color: 'var(--text-code)', fontFamily: "'JetBrains Mono', monospace" }}>100.5</code>), auto-converted to 18-decimal wei.
            </p>
          </div>
        </section>

        {/* ── Step 2: Upload CSV ───────────────────────────────────────── */}
        <section className="section">
          <div className="card">
            <div className="card-header">
              <span className={`step-badge ${step2Done ? 'done' : ''}`}>2</span>
              <div>
                <div className="card-title">Upload Allocation CSV</div>
                <div className="card-subtitle">Upload your filled CSV to generate the Merkle tree</div>
              </div>
            </div>

            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              ref={dropRef}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={e => handleFileSelect(e.target.files ? e.target.files[0] : null)}
              />
              <div className="drop-icon">📂</div>
              <div className="drop-title">Drag & drop your CSV here</div>
              <div className="drop-hint">or <span>click to browse</span> - .csv files only</div>
            </div>

            {file && (
              <div className="file-selected">
                <span>✓</span>
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button
                id="btn-generate"
                className="btn btn-primary"
                disabled={!file || uploading}
                onClick={uploadCsv}
              >
                {uploading ? <><span className="spinner" /> Generating…</> : <><span className="btn-icon">⚡</span> Generate Merkle Tree</>}
              </button>
            </div>
          </div>
        </section>

        {/* ── Step 3: Merkle Root ──────────────────────────────────────── */}
        {merkleInfo && (
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="step-badge done">3</span>
                <div>
                  <div className="card-title">Merkle Root</div>
                  <div className="card-subtitle">Place this root in your airdrop smart contract</div>
                </div>
              </div>

              <div className="root-display">
                <div className="root-label">Merkle Root</div>
                <div className="root-value">
                  <span className="root-value-text">{merkleInfo.root}</span>
                  <button className="copy-btn" onClick={handleCopy} title="Copy root">
                    {copied ? '✓' : '⧉'}
                  </button>
                </div>
                <div className="root-stats">
                  <div className="stat">
                    <span className="stat-label">Total Wallets</span>
                    <span className="stat-value">{merkleInfo.count}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Total Allocation (wei)</span>
                    <span className="stat-value">{merkleInfo.totalAllocated ? Number(BigInt(merkleInfo.totalAllocated) / BigInt(1000000000000000)) / 1000 + 'M' : '-'}</span>
                  </div>
                  {merkleInfo.timestamp && (
                    <div className="stat">
                      <span className="stat-label">Generated</span>
                      <span className="stat-value">{new Date(merkleInfo.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Step 4: Results Table ────────────────────────────────────── */}
        {entries.length > 0 && (
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="step-badge done">4</span>
                <div>
                  <div className="card-title">Allocation Proofs</div>
                  <div className="card-subtitle">{entries.length} addresses · click a row to reveal its proof hashes</div>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Wallet Address</th>
                      <th>Amount (tokens)</th>
                      <th>Merkle Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => <ProofRow key={i} entry={entry} />)}
                  </tbody>
                </table>
              </div>

              {/* ── Step 5: Download Results ─────────────────────────── */}
              <div className="row-actions" style={{ marginTop: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  CSV includes: <code style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-code)' }}>merkle_root, address, amount, proof</code>
                </p>
                <button id="btn-download-results" className="btn btn-success" onClick={downloadResults}>
                  <span className="btn-icon">⬇</span>
                  Download Results CSV
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer style={{ textAlign: 'center', marginTop: 60, color: 'var(--text-muted)', fontSize: 13 }}>
          MerkleDropper · EVM Airdrop Merkle Tree Generator
        </footer>
      </div>
    </>
  );
}
