import QRCode from 'qrcode';
import { Asset, Resource } from '../types';

/** Build the deep-link URL that a QR code points to. Scanning it on a phone
 *  will open the app and auto-trigger the LoanModal for the given asset. */
export function loanUrl(assetId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?loan=${encodeURIComponent(assetId)}`;
}

/** Deep-link URL for a Bilik Khas QR code. Scanning it opens the booking
 *  modal pre-filled with that room. */
export function bookUrl(roomId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?book=${encodeURIComponent(roomId)}`;
}

/** Encode any payload as a QR code, returned as a PNG data URL. */
export async function generateQrDataUrl(
  text: string,
  opts: { size?: number; margin?: number } = {},
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts.size ?? 480,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Open a print-ready popup window with a sticker grid for all given assets.
 *  Layout: A4, 3 columns × 6 rows = 18 stickers per page. */
export async function openBulkQrSticker(
  assets: Asset[],
  equipment: Resource[],
): Promise<{ ok: boolean; error?: string }> {
  if (assets.length === 0) {
    return { ok: false, error: 'Tiada unit untuk dicetak.' };
  }

  // Open the window FIRST so the popup is tied directly to the click
  // (some browsers block popups opened after async work).
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    return { ok: false, error: 'Pop-up disekat. Sila benarkan pop-up untuk laman ini.' };
  }

  // Show a loading screen while QRs render
  w.document.write(`<!doctype html><html><head><title>Menjana QR...</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#475569;}</style>
    </head><body>Sedang menjana ${assets.length} kod QR...</body></html>`);

  // Generate all QRs in parallel
  const qrs = await Promise.all(
    assets.map((a) => generateQrDataUrl(loanUrl(a.id), { size: 360, margin: 1 })),
  );

  const stickers = assets.map((a, i) => {
    const cat = equipment.find((e) => e.id === a.resourceId)?.name ?? '';
    return `
      <div class="sticker">
        <p class="school">SK Bandar Tawau</p>
        <div class="qr"><img src="${qrs[i]}" alt="QR" /></div>
        <p class="name">${escapeHtml(a.name)}</p>
        <p class="sn">${escapeHtml(a.serialNumber)}</p>
        <p class="cat">${escapeHtml(cat)}</p>
      </div>`;
  }).join('');

  const html = `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<title>Sticker QR — ${assets.length} unit</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; background: #f1f5f9; padding: 16px; }
  header { max-width: 1100px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: space-between; padding: 16px; background: white; border-radius: 12px; }
  header h1 { font-size: 16px; margin: 0; }
  header p { font-size: 11px; color: #64748b; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; }
  header button { padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; }
  header button:hover { background: #334155; }

  .sheet {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    max-width: 1100px;
    margin: 0 auto;
    background: white;
    padding: 12px;
    border-radius: 12px;
  }
  .sticker {
    border: 2px solid #0f172a;
    border-radius: 10px;
    padding: 10px 8px;
    text-align: center;
    background: white;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .school { font-size: 7px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #475569; margin: 0; }
  .qr { padding: 4px; }
  .qr img { width: 100%; max-width: 160px; height: auto; display: block; margin: 4px auto; }
  .name { font-size: 13px; font-weight: 800; margin: 4px 0 1px; line-height: 1.1; }
  .sn { font-size: 8.5px; font-family: monospace; color: #2563eb; letter-spacing: 0.05em; margin: 0; }
  .cat { font-size: 8px; color: #64748b; margin: 2px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

  @media print {
    body { background: white; padding: 0; }
    header { display: none; }
    .sheet { padding: 0; border-radius: 0; gap: 4px; max-width: none; }
    .sticker { border-width: 1.5px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
  <header>
    <div>
      <p>SK Bandar Tawau</p>
      <h1>Sticker QR Peralatan ICT (${assets.length} unit)</h1>
    </div>
    <button onclick="window.print()">Cetak Sekarang</button>
  </header>
  <div class="sheet">${stickers}</div>
</body>
</html>`;

  // Replace the loading screen
  w.document.open();
  w.document.write(html);
  w.document.close();

  return { ok: true };
}
