/* ═══════════════════════════════════════════════════════════════
   ELEMENTAL SPELL CASTER — server.js
   Pure Node.js HTTP Server (Zero Dependencies Required)
   Features:
     - Serves HTML, CSS, JavaScript, Images, Audio, and Binary Shards
     - Comprehensive MIME Type Registry
     - CORS & Security Headers for Teachable Machine / Web Audio / MediaDevices
     - Auto-opens the default web browser on launch
═══════════════════════════════════════════════════════════════ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;

// Resolve serving root directory (supports running from project root or workspace parent)
let STATIC_ROOT = __dirname;
if (!fs.existsSync(path.join(STATIC_ROOT, 'index.html')) && fs.existsSync(path.join(STATIC_ROOT, 'elemental-spell-caster', 'index.html'))) {
  STATIC_ROOT = path.join(STATIC_ROOT, 'elemental-spell-caster');
}

const MIME_TYPES = {
  '.html':   'text/html; charset=utf-8',
  '.css':    'text/css; charset=utf-8',
  '.js':     'application/javascript; charset=utf-8',
  '.mjs':    'application/javascript; charset=utf-8',
  '.json':   'application/json; charset=utf-8',
  '.png':    'image/png',
  '.jpg':    'image/jpeg',
  '.jpeg':   'image/jpeg',
  '.webp':   'image/webp',
  '.gif':    'image/gif',
  '.svg':    'image/svg+xml',
  '.ico':    'image/x-icon',
  '.mp3':    'audio/mpeg',
  '.wav':    'audio/wav',
  '.ogg':    'audio/ogg',
  '.bin':    'application/octet-stream',
  '.woff':   'font/woff',
  '.woff2':  'font/woff2',
  '.ttf':    'font/ttf',
  '.md':     'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // CORS & Security Headers (Ensure Teachable Machine & Audio work smoothly)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse path & strip query parameters
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Normalize path to prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(STATIC_ROOT, safePath);

  // If path is a directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family:sans-serif; background:#0d1117; color:#c9d1d9; padding:40px; text-align:center;">
          <h1 style="color:#f85149;">404 — File Not Found</h1>
          <p>The requested path <code>${reqPath}</code> was not found on this server.</p>
          <a href="/" style="color:#58a6ff;">← Back to Elemental Spell Caster</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Headers with development cache-busting
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\n\x1b[35m╔════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║\x1b[0m   \x1b[1;33m🔮 ELEMENTAL SPELL CASTER — WEB SERVER (Node.js)\x1b[0m            \x1b[35m║\x1b[0m');
  console.log('\x1b[35m╠════════════════════════════════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[35m║\x1b[0m   🌐 Local Address:   \x1b[1;36m${url}\x1b[0m                            \x1b[35m║\x1b[0m`);
  console.log(`\x1b[35m║\x1b[0m   📁 Serving Folder:  \x1b[32m${STATIC_ROOT}\x1b[0m       \x1b[35m║\x1b[0m`);
  console.log('\x1b[35m║\x1b[0m   🚀 Auto-opening default web browser...                       \x1b[35m║\x1b[0m');
  console.log('\x1b[35m║\x1b[0m   🛑 Press \x1b[1;31mCtrl + C\x1b[0m to stop server                             \x1b[35m║\x1b[0m');
  console.log('\x1b[35m╚════════════════════════════════════════════════════════════════╝\x1b[0m\n');

  // Auto-launch web browser on Windows, Mac, or Linux
  const openCmd = process.platform === 'win32' ? `start "" "${url}"` :
                  process.platform === 'darwin' ? `open "${url}"` :
                  `xdg-open "${url}"`;
  exec(openCmd, (err) => {
    if (err) {
      console.log(`\x1b[90m(Tip: Open ${url} manually in your browser)\x1b[0m`);
    }
  });
});
