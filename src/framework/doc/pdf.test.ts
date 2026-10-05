import { describe, expect, it } from 'vitest';
import { waNumber, whatsappLink } from './pdf';

describe('WhatsApp helpers', () => {
  it.each([
    ['0554128890', '966554128890'], ['554128890', '966554128890'], ['+966 55 412 8890', '966554128890'], ['00966554128890', '966554128890'], ['', ''], [undefined, ''],
  ])('waNumber(%s) = %s', (i, o) => expect(waNumber(i as any)).toBe(o));
  it('encodes the message', () => {
    expect(whatsappLink('0554128890', 'Hello, here is your Invoice:\nhttps://x/y.pdf')).toBe('https://wa.me/966554128890?text=Hello%2C%20here%20is%20your%20Invoice%3A%0Ahttps%3A%2F%2Fx%2Fy.pdf');
  });
});
