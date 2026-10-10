// Device matrix: the phone, tablet and desktop sizes the fullstack suite uses
// (playwright.fullstack.config.js) plus the narrow and wide ends, portrait and
// landscape, 320 px to 1920 px.
const DEVICES = [
  { id: 'phone-se', label: 'Phone small 320×568', kind: 'phone', viewport: { width: 320, height: 568 }, mobile: true },
  { id: 'phone-360', label: 'Phone 360×640', kind: 'phone', viewport: { width: 360, height: 640 }, mobile: true },
  { id: 'iphone-14', label: 'iPhone 14 390×844', kind: 'phone', viewport: { width: 390, height: 844 }, mobile: true },
  { id: 'pixel-7', label: 'Pixel 7 412×915', kind: 'phone', viewport: { width: 412, height: 915 }, mobile: true },
  { id: 'phone-land', label: 'Phone landscape 844×390', kind: 'phone', viewport: { width: 844, height: 390 }, mobile: true },
  { id: 'tablet', label: 'Tablet portrait 820×1180', kind: 'tablet', viewport: { width: 820, height: 1180 }, mobile: true },
  { id: 'tablet-land', label: 'Tablet landscape 1180×820', kind: 'tablet', viewport: { width: 1180, height: 820 }, mobile: true },
  { id: 'tablet-768', label: 'Tablet small 768×1024', kind: 'tablet', viewport: { width: 768, height: 1024 }, mobile: true },
  { id: 'laptop', label: 'Laptop 1366×800', kind: 'desktop', viewport: { width: 1366, height: 800 }, mobile: false },
  { id: 'desktop', label: 'Desktop 1440×900', kind: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { id: 'desktop-fhd', label: 'Desktop FHD 1920×1080', kind: 'desktop', viewport: { width: 1920, height: 1080 }, mobile: false },
];

const deviceById = (id) => DEVICES.find((d) => d.id === id);

function contextOptions(device, lang) {
  return {
    viewport: device.viewport,
    isMobile: device.mobile,
    hasTouch: device.mobile,
    deviceScaleFactor: device.mobile ? 2 : 1,
    locale: lang === 'ar' ? 'ar-SA' : 'en-US',
    timezoneId: 'Asia/Riyadh',
  };
}

/**
 * Which (scenario, device, language) cells a run covers.
 *  smoke    – each scenario once, on a rotating device, first language
 *  standard – each scenario on one phone, one tablet and one desktop, languages
 *             alternating, so every size class and both languages are hit
 *  full     – every scenario on every device in every language
 * A scenario may restrict its device kinds (sc.devices) or cap its standard cells (sc.standardCells).
 */
function planCells(scenarios, { matrix = 'standard', langs = ['en', 'ar'], devices = DEVICES } = {}) {
  const cells = [];
  scenarios.forEach((sc, i) => {
    const pool = sc.devices ? devices.filter((d) => sc.devices.includes(d.kind)) : devices;
    if (!pool.length || !langs.length) return;
    if (matrix === 'full') {
      for (const d of pool) for (const lang of langs) cells.push({ scenario: sc.id, device: d.id, lang });
      return;
    }
    if (matrix === 'smoke') {
      cells.push({ scenario: sc.id, device: pool[i % pool.length].id, lang: langs[0] });
      return;
    }
    const kinds = ['phone', 'tablet', 'desktop'].filter((k) => pool.some((d) => d.kind === k));
    kinds.slice(0, sc.standardCells || 3).forEach((kind, k) => {
      const of = pool.filter((d) => d.kind === kind);
      cells.push({ scenario: sc.id, device: of[(i + k) % of.length].id, lang: langs[(i + k) % langs.length] });
    });
  });
  return cells;
}

module.exports = { DEVICES, deviceById, contextOptions, planCells };
