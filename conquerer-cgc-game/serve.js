// Dependency-free static server for the Launch preview panel.
// Serves an ABSOLUTE root and never calls process.cwd(), so it works even
// inside the preview sandbox where getcwd() is blocked (which breaks
// `python3 -m http.server`).
const http = require("http");
const fs = require("fs");
const path = require("path");

// __dirname, not a hardcoded path: this file's own folder IS the web root, so
// the server follows the checkout it ships with (main repo or a git worktree)
// instead of silently serving a different one.
const ROOT = __dirname;
// Port: argv > env > default. Lets two checkouts preview side by side.
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8850;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

http
  .createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split("?")[0]);
    if (pathname.endsWith("/")) pathname += "index.html";
    // Resolve under ROOT and block path traversal.
    const safe = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("403");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("404 Not Found");
      }
      res.writeHead(200, {
        "content-type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-cache",
      });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
