// Minimal static server for ../build with SPA fallback, used by playwright.config.js.
// API calls (/v1/...) are not served here; each spec mocks them with page.route().
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, process.env.E2E_BUILD_DIR || "../build");
const port = Number(process.env.E2E_PORT || 4310);
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json" };

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`No build found at ${root}. Run "npm run build" in the app first.`);
  process.exit(1);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, "index.html");
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
