import { describe, expect, it } from 'vitest';
import { decodeTlv, qrSvg, zatcaTlv } from './zatcaQr';

describe('ZATCA TLV', () => {
  it('encodes and decodes all five tags, including Arabic seller names', () => {
    const b64 = zatcaTlv('شركة اتحاد الخليج', '300455120900003', '2026-10-05T09:07:00Z', 12172.21, 1587.68);
    expect(decodeTlv(b64)).toEqual(['شركة اتحاد الخليج', '300455120900003', '2026-10-05T09:07:00Z', '12172.21', '1587.68']);
  });
  it('produces an SVG QR', async () => {
    const svg = await qrSvg('hello');
    expect(svg.startsWith('<svg')).toBe(true);
  });
});
