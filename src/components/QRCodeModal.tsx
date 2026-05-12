import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, QrCode, Loader2 } from 'lucide-react';
import { Asset, Resource } from '../types';
import { generateQrDataUrl, loanUrl, bookUrl } from '../lib/qr';

/**
 * The modal can show a QR for either an ICT asset (encodes ?loan=ast-X)
 * or a Bilik Khas room (encodes ?book=room-X). The two flows share the
 * same UI shell — only the labels, default file name, and sticker copy
 * differ — so we discriminate via the `target` prop.
 */
export type QRTarget =
  | { kind: 'asset'; asset: Asset; category: Resource | null }
  | { kind: 'room'; room: Resource };

interface Props {
  open: boolean;
  target: QRTarget | null;
  onClose: () => void;
}

export function QRCodeModal({ open, target, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Derive the encoded URL + display labels from the target kind. Memoized
  // so dependent useEffects don't refire on unrelated re-renders.
  const view = useMemo(() => {
    if (!target) return null;
    if (target.kind === 'asset') {
      const a = target.asset;
      const categoryName = target.category?.name ?? a.resourceId;
      return {
        encodedUrl: loanUrl(a.id),
        title: 'QR Pinjaman',
        subtitle: 'Imbas untuk pinjam pantas',
        primaryName: a.name,
        serialOrLabel: a.serialNumber,
        secondaryLabel: categoryName,
        downloadName: `qr-${a.serialNumber || a.id}.png`,
        stickerHeading: 'Sistem Tempahan ICT',
        stickerFooter: 'Imbas QR ini untuk pinjam unit ini.<br>Aplikasi akan minta tujuan & tempoh pinjaman sahaja.',
        gradient: 'from-purple-600 to-pink-600',
        callout: 'Tampal pada peralatan. Peminjam imbas dengan kamera telefon → menu pinjam akan muncul.',
      };
    }
    const r = target.room;
    return {
      encodedUrl: bookUrl(r.id),
      title: 'QR Tempahan Bilik',
      subtitle: 'Imbas untuk tempah pantas',
      primaryName: r.name,
      serialOrLabel: r.capacity ? `Muatan ${r.capacity} pax` : 'Bilik Khas',
      secondaryLabel: 'Bilik Khas',
      downloadName: `qr-bilik-${r.id}.png`,
      stickerHeading: 'Sistem Tempahan Bilik Khas',
      stickerFooter: 'Imbas QR ini untuk tempah bilik ini.<br>Aplikasi akan minta tarikh, masa & tujuan sahaja.',
      gradient: 'from-blue-600 to-indigo-600',
      callout: 'Tampal di pintu bilik. Guru imbas dengan kamera telefon → borang tempahan akan muncul.',
    };
  }, [target]);

  useEffect(() => {
    if (!open || !view) return;
    let cancelled = false;
    setLoading(true);
    generateQrDataUrl(view.encodedUrl)
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, view]);

  if (!view) return null;

  const printSticker = () => {
    if (!dataUrl || !view) return;
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) {
      alert('Pop-up disekat. Sila benarkan pop-up untuk laman ini.');
      return;
    }
    w.document.write(`<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><title>QR ${view.primaryName}</title>
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
  <h1>${escapeHtml(view.stickerHeading)}</h1>
  <div class="qr"><img src="${dataUrl}" alt="QR" /></div>
  <p class="name">${escapeHtml(view.primaryName)}</p>
  <p class="sn">${escapeHtml(view.serialOrLabel)}</p>
  <p class="cat">${escapeHtml(view.secondaryLabel)}</p>
  <p class="footer">${view.stickerFooter}</p>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
    w.document.close();
  };

  const downloadPng = () => {
    if (!dataUrl || !view) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = view.downloadName;
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
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${view.gradient} flex items-center justify-center text-white shrink-0`}>
                  <QrCode size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">{view.title}</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    {view.subtitle}
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
                  <img src={dataUrl} alt={`QR ${view.primaryName}`} className="w-full h-full" />
                )}
              </div>
              <p className="mt-4 text-base font-bold text-slate-800">{view.primaryName}</p>
              <p className="text-[10px] font-mono text-blue-600 uppercase mt-0.5">{view.serialOrLabel}</p>
              <p className="text-[10px] text-slate-500 mt-1">{view.secondaryLabel}</p>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded-lg">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">URL</p>
              <code className="text-[10px] text-slate-700 break-all">{view.encodedUrl}</code>
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
              {view.callout}
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
