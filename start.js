#!/usr/bin/env node

// cPanel startup — no build, no rebuild
// Modules built locally, uploaded as-is
// Just: prisma generate + start server

const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

console.log('[CPANEL] Node:', process.version, '| PORT:', PORT);

// Prisma generate only (binary engine, needs regenerate per OS/Node)
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname, timeout: 60000 });
  console.log('[CPANEL] Prisma OK');
} catch (err) {
  console.error('[CPANEL] Prisma FAILED:', err.message);
  process.exit(1);
}

process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const app = next({ dev: false, hostname: '0.0.0.0', port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error('Error:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(PORT, '0.0.0.0', () => {
      console.log('> Ready on http://0.0.0.0:' + PORT);
    });
});
