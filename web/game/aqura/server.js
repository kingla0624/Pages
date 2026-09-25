const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  const safePath = path.resolve(__dirname, '.' + (reqPath === '/' ? '/index.html' : reqPath));

  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = safePath;
  if (!fs.existsSync(filePath)) {
    if (path.extname(reqPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    filePath = path.join(__dirname, 'index.html');
  } else if (fs.statSync(filePath).isDirectory()) {
    const dirIndex = path.join(filePath, 'index.html');
    filePath = fs.existsSync(dirIndex) ? dirIndex : path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end(err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Aqura Server running at http://127.0.0.1:${PORT}/`);
});
