/**
 * Upload a PDF Blob to filebin.net and return the public URL.
 *
 * @param {Blob}   pdfBlob  - PDF blob from jsPDF doc.output('blob')
 * @param {string} filename - e.g. "Sales_Summary.pdf"
 * @returns {Promise<string>} public URL of the uploaded file
 */
export async function uploadPdfForShare(pdfBlob, filename) {
    const binId          = `startpos-${Date.now()}`;
    const encodedName    = encodeURIComponent(filename);
    const uploadUrl      = `https://filebin.net/${binId}/${encodedName}`;
    const publicUrl      = `https://filebin.net/${binId}/${encodedName}`;

    // jsPDF blobs have type 'application/pdf' which triggers a CORS preflight that
    // filebin.net does not support. Rewrapping in 'text/plain' makes the POST a
    // CORS "simple request" (no preflight). filebin.net stores the raw bytes and
    // serves the file as application/pdf based on the .pdf filename extension.
    const bytes     = await pdfBlob.arrayBuffer();
    const plainBlob = new Blob([bytes], { type: 'text/plain' });

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 20000);
    let res;
    try {
        res = await fetch(uploadUrl, { method: 'POST', body: plainBlob, signal: ctrl.signal });
    } finally {
        clearTimeout(tid);
    }

    if (!res.ok && res.status !== 201) {
        throw new Error(`Upload failed: HTTP ${res.status}`);
    }

    return publicUrl;
}
