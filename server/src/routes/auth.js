const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth, hashToken } = require('../middleware/auth');
const { resolvePendingInvites } = require('./contacts');

const router = express.Router();

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Login: keyed by IP + the email being attempted, so one person mistyping
// their own password repeatedly doesn't get everyone else on the same IP
// (e.g. a shared wifi at the course) rate-limited too, while still stopping
// a single attacker from hammering one account or spraying many.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.email) || ''}`.toLowerCase(),
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// Signup: keyed by IP only, since there's no existing account to key against.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
});

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(tokenHash, userId, expiresAt);
  return token;
}

router.post('/auth/signup', signupLimiter, (req, res) => {
  const { email, password, name } = req.body || {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(normalizedEmail, passwordHash, name.trim());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  resolvePendingInvites(user);
  const token = createSession(user.id);
  res.status(201).json({ token, user: toPublicUser(user) });
});

router.post('/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createSession(user.id);
  res.json({ token, user: toPublicUser(user) });
});

router.post('/auth/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

module.exports = router;
