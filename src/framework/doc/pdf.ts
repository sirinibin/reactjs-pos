import { session } from '@/api/session';
import { ApiError } from '@/api/client';
import type { Store } from '@/auth/types';

/**
 * Server-side PDF (sales.md §0.4): POST /v1/invoice/pdf {model, modelName, fontSizes, filename}.
 * The server renders our /invoice-print page in headless Chrome, so the model must be
 * fully loaded — including `store` (header, VAT no., logo) — exactly as printed in the app.
 */
export async function requestDocumentPdf(opts: { doc: any; modelName: string; store: Store | null; filename?: string; endpoint?: string }): Promise<Blob> {
  const storeId = opts.store?.id || session.storeId() || '';
  const res = await fetch(`${opts.endpoint || '/v1/invoice/pdf'}?search[store_id]=${encodeURIComponent(storeId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: session.token() || '' },
    body: JSON.stringify({ model: { ...opts.doc, store: opts.doc.store || opts.store }, modelName: opts.modelName, fontSizes: {}, filename: opts.filename || opts.doc.code }),
  });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('pdf')) {
    const j = await res.json().catch(() => null);
    throw new ApiError(res.status, j?.errors || { pdf: j?.error || 'Could not generate the PDF. Please try again.' });
  }
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Upload a PDF (POST /v1/upload-pdf multipart `file`) and return its public URL. */
export async function uploadPdf(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  const res = await fetch('/v1/upload-pdf', { method: 'POST', headers: { Authorization: session.token() || '' }, body: fd });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.errors || { upload: j?.error || 'Upload failed' });
  const name = j?.result?.fileName || j?.fileName || j?.result || filename;
  const file = String(name).replace(/\.pdf$/, '');
  return j?.result?.url || j?.url || `${window.location.origin}/pdfs/${file}.pdf?v=${Date.now()}`;
}

/** Normalise a Saudi/international phone to wa.me digits (05XXXXXXXX → 9665XXXXXXXX). */
export function waNumber(phone: string | undefined): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('05') && d.length === 10) d = `966${d.slice(1)}`;
  else if (d.startsWith('5') && d.length === 9) d = `966${d}`;
  return d;
}

export function whatsappLink(phone: string | undefined, text: string): string {
  const n = waNumber(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
