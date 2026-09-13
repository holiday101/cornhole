const crypto = require('crypto');
const db = require('../db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Missing bearer token' });

  const tokenHash = hashToken(match[1]);
  const session = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(tokenHash);

  if (!session) return res.status(401).json({ error: 'Invalid session' });
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return res.status(401).json({ error: 'Session expired' });
  }

  const user = db
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .get(session.user_id);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  req.user = user;
  req.tokenHash = tokenHash;
  next();
}

module.exports = { requireAuth, hashToken };
