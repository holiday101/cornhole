// Minimal, single-purpose deploy listener. Runs directly on the EC2 host
// (NOT inside Docker - the API deploy needs to drive Docker itself), as
// its own systemd service, behind nginx at /cornhole/deploy*.
//
// Two authenticated POST routes, both gated by the same shared-secret
// X-Deploy-Token header (constant-time compared):
//   /deploy      - gzipped tar of server/ sources -> extract, docker
//                  build a fresh cornhole-api image, restart the
//                  container. Mirrors deploy-api.sh minus the scp step.
//   /deploy-web  - gzipped tar of the Expo web export (`dist/`) ->
//                  extract into WEB_DIR, which nginx serves statically.
//                  No Docker involved.
// Nothing else about this service is generic - it always does exactly one
// of these two fixed sequences, never arbitrary commands, to keep the
// blast radius of a leaked token small.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = Number(process.env.DEPLOY_LISTENER_PORT || 4099);
const TOKEN = process.env.DEPLOY_TOKEN;
const HOME = process.env.HOME;
const DEPLOY_DIR = process.env.DEPLOY_DIR || path.join(HOME, 'cornhole-api-deploy');
const DATA_DIR = process.env.DATA_DIR || path.join(HOME, 'cornhole-api-data');
// Kept OUTSIDE DEPLOY_DIR on purpose: DEPLOY_DIR gets wiped on every
// deploy, this must not be.
const ENV_FILE = process.env.SERVER_ENV_FILE || path.join(HOME, 'cornhole-api.env');
const CONTAINER_NAME = 'cornhole-api';
// Owned by this service's own user (ubuntu), not www-data, so it can be
// wiped and rewritten on every deploy with no permission dance. nginx just
// needs read access, which world-readable files (the default umask) give
// it regardless of directory ownership.
const WEB_DIR = process.env.WEB_DIR || path.join(HOME, 'cornhole-web');
const MAX_BODY_BYTES = 50 * 1024 * 1024; // generous headroom for a JS bundle + assets

if (!TOKEN) {
  console.error('DEPLOY_TOKEN env var is not set - refusing to start.');
  process.exit(1);
}
if (!fs.existsSync(ENV_FILE)) {
  console.error(`Expected an env file at ${ENV_FILE} (PORT/DB_PATH/RESEND_API_KEY/etc for the API container) - refusing to start.`);
  process.exit(1);
}

function safeTokenMatch(provided) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function run(cmd, args, log, cwd) {
  log.push(`$ ${cmd} ${args.join(' ')}`);
  const out = execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  log.push(out.toString());
}

function runIgnoringFailure(cmd, args, log, cwd) {
  try {
    run(cmd, args, log, cwd);
  } catch (err) {
    log.push(`(ignored) ${cmd} ${args.join(' ')} failed: ${err.message}`);
  }
}

function extractTarball(buf, targetDir, log) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  const tarPath = path.join(targetDir, '_upload.tar.gz');
  fs.writeFileSync(tarPath, buf);
  execFileSync('tar', ['xzf', tarPath, '-C', targetDir]);
  fs.unlinkSync(tarPath);
  log.push(`Extracted upload into ${targetDir}`);
}

function deployApi(buf, log) {
  extractTarball(buf, DEPLOY_DIR, log);
  run('docker', ['build', '-t', 'cornhole-api', '.'], log, DEPLOY_DIR);
  runIgnoringFailure('docker', ['stop', CONTAINER_NAME], log, DEPLOY_DIR);
  runIgnoringFailure('docker', ['rm', CONTAINER_NAME], log, DEPLOY_DIR);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  run(
    'docker',
    [
      'run', '-d',
      '--name', CONTAINER_NAME,
      '--restart', 'unless-stopped',
      '-p', '4001:4001',
      '-v', `${DATA_DIR}:/data`,
      '--env-file', ENV_FILE,
      'cornhole-api',
    ],
    log,
    DEPLOY_DIR
  );
}

function deployWeb(buf, log) {
  extractTarball(buf, WEB_DIR, log);
  // Belt-and-suspenders: make sure nginx (running as its own user, not
  // this service's) can read everything regardless of umask.
  run('chmod', ['-R', 'a+rX', WEB_DIR], log, WEB_DIR);
}

const ROUTES = {
  '/deploy': deployApi,
  '/deploy-web': deployWeb,
};

const server = http.createServer((req, res) => {
  const handler = req.method === 'POST' ? ROUTES[req.url] : null;
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }

  if (!safeTokenMatch(req.headers['x-deploy-token'] || '')) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('unauthorized');
    return;
  }

  const chunks = [];
  let size = 0;
  let tooBig = false;

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      tooBig = true;
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (tooBig) {
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      res.end('payload too large');
      return;
    }

    const log = [];
    try {
      handler(Buffer.concat(chunks), log);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(log.join('\n'));
      console.log(`${req.url} succeeded at ${new Date().toISOString()}`);
    } catch (err) {
      log.push('DEPLOY FAILED: ' + (err.stderr ? err.stderr.toString() : err.message));
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(log.join('\n'));
      console.error(`${req.url} failed at ${new Date().toISOString()}:`, err.message);
    }
  });
});

// Bind to localhost only - nginx is the only thing that should reach this,
// terminating TLS and proxying /cornhole/deploy* to it.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`cornhole deploy listener on 127.0.0.1:${PORT}`);
});
