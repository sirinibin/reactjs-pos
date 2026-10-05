import QRCode from 'qrcode';

/** ZATCA phase-1 TLV payload: 1 seller, 2 VAT no., 3 timestamp, 4 total incl. VAT, 5 VAT amount (base64). */
export function zatcaTlv(seller: string, vatNo: string, timestamp: string, total: number, vat: number): string {
  const enc = new TextEncoder();
  const parts = [seller, vatNo, timestamp, total.toFixed(2), vat.toFixed(2)].map((v, i) => {
    const b = enc.encode(v);
    return Uint8Array.from([i + 1, b.length, ...b]);
  });
  const all = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  parts.forEach((p) => { all.set(p, o); o += p.length; });
  let bin = '';
  all.forEach((c) => (bin += String.fromCharCode(c)));
  return btoa(bin);
}

/** Decode a TLV payload (used by tests and the view page). */
export function decodeTlv(b64: string): string[] {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const out: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i + 1];
    out.push(new TextDecoder().decode(bytes.slice(i + 2, i + 2 + len)));
    i += 2 + len;
  }
  return out;
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}
