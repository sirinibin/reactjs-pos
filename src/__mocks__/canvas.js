// No-op canvas stub for Jest on ARM64 (native binary won't load under Rosetta).
const createCanvas = () => ({
    getContext: () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x, y, w, h) => ({ data: new Array(w * h * 4).fill(0) }),
        putImageData: () => {},
        createImageData: () => ({ data: [] }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        transform: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        arc: () => {},
        fillText: () => {},
        strokeText: () => {},
        clip: () => {},
        rect: () => {},
    }),
    toBuffer: () => Buffer.alloc(0),
    toDataURL: () => "",
    width: 0,
    height: 0,
});
const Image = class {
    constructor() { this.src = ""; this.width = 0; this.height = 0; }
    set src(v) {}
    get src() { return ""; }
};
const ImageData = class {
    constructor(data, width, height) {
        this.data = data || new Uint8ClampedArray(width * height * 4);
        this.width = width || 0;
        this.height = height || 0;
    }
};
const loadImage = () => Promise.resolve(new Image());

module.exports = { createCanvas, Image, ImageData, loadImage };
