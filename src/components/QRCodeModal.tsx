import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, QrCode, Loader2 } from 'lucide-react';
import { Asset, Resource } from '../types';
import { generateQrDataUrl, loanUrl } from '../lib/qr';

interface Props {
  open: boolean;
  asset: Asset | null;
  category: Resource | null; // the equipment category (e.g., 'Laptop Murid')
  onClose: () => void;
}

export function QRCodeModal({ open, asset, category, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !asset) return;
    let cancelled = false;
    setLoading(true);
    generateQrDataUrl(loanUrl(asset.id))
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, asset]);

  if (!asset) return null;

  const url = loanUrl(asset.id);
  const categoryName = category?.name ?? asset.resourceId;

  const printSticker = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) {
      alert('Pop-up disekat. Sila benarkan pop-up untuk laman ini.');
      return;
    }
    w.document.write(`<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><title>QR ${asset.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
  .sticker {
    border: 2px solid #0f172a;
    border-radius: 12px;
    padding: 20px;
    width: 300px;
    margin: 0 auto;
    text-align: center;
    background: white;
  }
  .school { font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #475569; }
  h1 { font-size: 14px; margin: 4px 0 8px; line-height: 1.2; }
  .qr { padding: 12px; background: white; }
  .qr img { width: 220px; height: 220px; display: block; margin: 0 auto; }
  .name { font-size: 16px; font-weight: 800; margin: 8px 0 2px; }
  .sn { font-size: 10px; font-family: monospace; color: #2563eb; letter-spacing: 0.05em; }
  .cat { font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
  .footer { font-size: 9px; color: #94a3b8; margin-top: 12px; line-height: 1.4; }
  @media print { body { padding: 0; } @page { margin: 1cm; } }
</style></head>
<body>
<div class="sticker">
  <p class="school">SK Bandar Tawau</p>
  <h1>Sistem Tempahan ICT</h1>
  <div class="qr"><img src="${dataUrl}" alt="QR" /></div>
  <p class="name">${escapeHtml(asset.name)}</p>
  <p class="sn">${escapeHtml(asset.serialNumber)}</p>
  <p class="cat">${escapeHtml(categoryName)}</p>
  <p class="footer">Imbas QR ini untuk pinjam unit ini.<br>Aplikasi akan minta tujuan & tempoh pinjaman sahaja.</p>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
    w.document.close();
  };

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${asset.serialNumber || asset.id}.png`;
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white shrink-0">
                  <QrCode size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">QR Pinjaman</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Imbas untuk pinjam pantas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
              <div className="w-60 h-60 mx-auto bg-white rounded-lg flex items-center justify-center border border-slate-200">
                {loading || !dataUrl ? (
                  <Loader2 size={32} className="text-slate-300 animate-spin" />
                ) : (
                  <img src={dataUrl} alt={`QR ${asset.name}`} className="w-full h-full" />
                )}
              </div>
              <p className="mt-4 text-base font-bold text-slate-800">{asset.name}</p>
              <p className="text-[10px] font-mono text-blue-600 uppercase mt-0.5">{asset.serialNumber}</p>
              <p className="text-[10px] text-slate-500 mt-1">{categoryName}</p>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded-lg">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">URL</p>
              <code className="text-[10px] text-slate-700 break-all">{url}</code>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={printSticker}
                disabled={loading || !dataUrl}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all disabled:opacity-40"
              >
                <Printer size={13} /> Cetak Sticker
              </button>
              <button
                onClick={downloadPng}
                disabled={loading || !dataUrl}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-40"
              >
                <Download size={13} /> Muat Turun
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
              Tampal pada peralatan. Peminjam imbas dengan kamera telefon → menu pinjam akan muncul.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
