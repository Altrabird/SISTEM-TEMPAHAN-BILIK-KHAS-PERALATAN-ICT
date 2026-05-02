import QRCode from 'qrcode';

/** Build the deep-link URL that a QR code points to. Scanning it on a phone
 *  will open the app and auto-trigger the LoanModal for the given asset. */
export function loanUrl(assetId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?loan=${encodeURIComponent(assetId)}`;
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
