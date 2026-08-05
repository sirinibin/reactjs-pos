// Manual mock for html2pdf.js — the real package bundles its own copy of jsPDF
// and touches browser canvas/PDF internals that don't work under Jest/jsdom.
function makeChain() {
    const chain = {
        from: jest.fn(() => chain),
        set: jest.fn(() => chain),
        toPdf: jest.fn(() => chain),
        toCanvas: jest.fn(() => chain),
        toImg: jest.fn(() => chain),
        toContainer: jest.fn(() => chain),
        save: jest.fn(() => Promise.resolve()),
        then: (resolve) => Promise.resolve(chain).then(resolve),
        output: jest.fn(() => Promise.resolve('')),
        outputPdf: jest.fn((type) => {
            if (type === 'blob') return Promise.resolve(new Blob());
            if (type === 'arraybuffer') return Promise.resolve(new ArrayBuffer(0));
            return Promise.resolve('blob:mock-url');
        }),
    };
    return chain;
}

function html2pdf() {
    return makeChain();
}

module.exports = html2pdf;
module.exports.default = html2pdf;
