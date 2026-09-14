// Minimal, single-purpose deploy listener. Runs directly on the EC2 host
// (NOT inside Docker - it needs to drive Docker itself), as its own
// systemd service, behind nginx at /cornhole/deploy.
//
// On an authenticated POST to /deploy with a gzipped tar of the server/
// sources in the body, it:
//   1. extracts the tarball into DEPLOY_DIR (wiping any previous checkout)
//   2. docker build's a fresh cornhole-api image from it
//   3. stops/removes the old cornhole-api container and starts a new one
// This mirrors deploy-api.sh, minus the scp step - the code arrives in the
// request body instead.
//
// Auth is a single shared secret compared with a constant-time check, sent
// as the X-Deploy-Token header. Nothing else about this service is
// generic - it always does exactly this one build+restart sequence, never
// arbitrary commands, to keep the blast radius of a leaked token small.
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
const MAX_BODY_BYTES = 20 * 1024 * 1024; // server/ sources are tiny; 20MB is generous headroom

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

function run(cmd, args, log) {
  log.push(`$ ${cmd} ${args.join(' ')}`);
  const out = execFileSync(cmd, args, { cwd: DEPLOY_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
  log.push(out.toString());
}

function runIgnoringFailure(cmd, args, log) {
  try {
    run(cmd, args, log);
  } catch (err) {
    log.push(`(ignored) ${cmd} ${args.join(' ')} failed: ${err.message}`);
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
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
      fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
      fs.mkdirSync(DEPLOY_DIR, { recursive: true });

      const tarPath = path.join(DEPLOY_DIR, '_upload.tar.gz');
      fs.writeFileSync(tarPath, Buffer.concat(chunks));
      execFileSync('tar', ['xzf', tarPath, '-C', DEPLOY_DIR]);
      fs.unlinkSync(tarPath);
      log.push(`Extracted upload into ${DEPLOY_DIR}`);

      run('docker', ['build', '-t', 'cornhole-api', '.'], log);
      runIgnoringFailure('docker', ['stop', CONTAINER_NAME], log);
      runIgnoringFailure('docker', ['rm', CONTAINER_NAME], log);
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
        log
      );

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(log.join('\n'));
      console.log(`Deploy succeeded at ${new Date().toISOString()}`);
    } catch (err) {
      log.push('DEPLOY FAILED: ' + (err.stderr ? err.stderr.toString() : err.message));
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(log.join('\n'));
      console.error(`Deploy failed at ${new Date().toISOString()}:`, err.message);
    }
  });
});

// Bind to localhost only - nginx is the only thing that should reach this,
// terminating TLS and proxying /cornhole/deploy to it.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`cornhole deploy listener on 127.0.0.1:${PORT}`);
});
