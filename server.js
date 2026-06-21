import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('.');
const dist = join(root, 'dist');
const dataDir = join(root, 'data');
const dbPath = join(dataDir, 'leads-db.json');
const port = Number(process.env.PORT) || 4173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    await stat(dbPath);
  } catch {
    await writeFile(dbPath, JSON.stringify({ months: {} }, null, 2), 'utf8');
  }
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveFile(res, path) {
  const type = mime[extname(path).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(path).pipe(res);
}

await ensureDb();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/db' && req.method === 'GET') {
      const data = await readFile(dbPath, 'utf8');
      send(res, 200, data);
      return;
    }

    if (url.pathname === '/api/db' && req.method === 'POST') {
      const body = await readBody(req);
      const parsed = JSON.parse(body || '{}');
      const safeDb = { months: parsed.months && typeof parsed.months === 'object' ? parsed.months : {} };
      await writeFile(dbPath, JSON.stringify(safeDb, null, 2), 'utf8');
      send(res, 200, JSON.stringify({ ok: true }));
      return;
    }

    if (req.method !== 'GET') {
      send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
      return;
    }

    const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = resolve(join(dist, requestPath));
    const safePath = filePath.startsWith(dist) ? filePath : join(dist, 'index.html');

    try {
      const fileStat = await stat(safePath);
      if (fileStat.isFile()) {
        serveFile(res, safePath);
        return;
      }
    } catch {}

    serveFile(res, join(dist, 'index.html'));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Leads rodando em http://127.0.0.1:${port}`);
  console.log(`Banco local: ${dbPath}`);
});
