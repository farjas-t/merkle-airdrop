import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './styles.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ─── Toast System ─────────────────────────────────────────────────────────────
let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((type, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, toast: { success: m => add('success', m), error: m => add('error', m), info: m => add('info', m) } };
}

function ToastContainer({ toasts }) {
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
function ProofRow({ entry }) {
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
            {entry.proof.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        )}
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(weiStr) {
  try {
    const n = BigInt(weiStr);
    const eth = Number(n) / 1e18;
    return eth.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return weiStr;
  }
}

function formatAddress(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function copyToClipboard(text, cb) {
  navigator.clipboard.writeText(text).then(() => cb && cb()).catch(() => { });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { toasts, toast } = useToasts();

  // State
  const [merkleInfo, setMerkleInfo] = useState(null);   // { root, count, totalAllocated, timestamp }
  const [entries, setEntries] = useState([]);     // full proof table
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef();

  // Load existing root on mount
  useEffect(() => {
    axios.get(`${BACKEND}/root`)
      .then(r => {
        setMerkleInfo(r.data);
        return axios.get(`${BACKEND}/results`);
      })
      .then(r => setEntries(r.data.entries || []))
      .catch(() => { }); // no tree yet - that's fine
  }, []);

  // ── Download Template ───────────────────────────────────────────────────────
  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = `${BACKEND}/template`;
    a.download = 'merkledropper_template.csv';
    a.click();
    toast.info('Template CSV downloaded');
  }

  // ── File Selection ──────────────────────────────────────────────────────────
  function handleFileSelect(f) {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFileSelect(f);
  }

  function onDragOver(e) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }

  // ── Upload & Generate ───────────────────────────────────────────────────────
  async function uploadCsv() {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post(`${BACKEND}/upload`, fd);
      setMerkleInfo(r.data);
      toast.success(`Merkle tree generated for ${r.data.count} addresses`);
      // Fetch full results
      const res = await axios.get(`${BACKEND}/results`);
      setEntries(res.data.entries || []);
      setFile(null);
    } catch (e) {
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

  // ── Download Results ────────────────────────────────────────────────────────
  function downloadResults() {
    if (!merkleInfo) return;
    const a = document.createElement('a');
    a.href = `${BACKEND}/results/csv`;
    a.download = 'merkledropper_results.csv';
    a.click();
    toast.success('Results CSV downloaded');
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
                onChange={e => handleFileSelect(e.target.files[0])}
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
                    <span className="stat-value">{merkleInfo.totalAllocated ? Number(BigInt(merkleInfo.totalAllocated) / BigInt('1000000000000000')).toLocaleString() + 'K' : '-'}</span>
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
