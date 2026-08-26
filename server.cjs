const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.jsx': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  let filePath = path.join(ROOT, reqUrl);

  // If path doesn't exist directly, check dist/
  if (!fs.existsSync(filePath)) {
    const distPath = path.join(ROOT, 'dist', reqUrl);
    if (fs.existsSync(distPath)) {
      filePath = distPath;
    }
  }

  // SPA fallback for HTML routes (e.g. /g/men, /checkout, /admin)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(reqUrl);
    if (!ext || ext === '.html') {
      filePath = path.join(ROOT, 'index.html');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(ROOT, 'dist', 'index.html');
      }
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 IraqStore Server is running!`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: http://127.0.0.1:${PORT}\n`);
});
