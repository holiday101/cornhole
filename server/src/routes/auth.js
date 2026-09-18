const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth, hashToken } = require('../middleware/auth');
const { sendEmail, escapeHtml } = require('../email');

const router = express.Router();

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const VERIFICATION_TTL_HOURS = 48;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE_URL = process.env.API_BASE_URL || 'https://membergolfonline.com/cornhole/api';

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

// Resend: keyed by IP + email, same reasoning as login.
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.email) || ''}`.toLowerCase(),
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
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

// Any earlier unused token for this user is invalidated by the DELETE, so
// only the most recently sent link ever works.
async function sendVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(user.id);
  db.prepare(
    'INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, user.id, expiresAt);

  const verifyUrl = `${API_BASE_URL}/auth/verify-email?token=${token}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your Cornhole Golf email',
      html: `<p>Hi ${escapeHtml(user.name)}, confirm this is your email to finish setting up your Cornhole Golf account.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
      text: `Hi ${user.name}, confirm this is your email to finish setting up your Cornhole Golf account: ${verifyUrl}`,
    });
  } catch (e) {
    console.error('[auth] failed to send verification email', e);
  }
}

function verifyPage(message, ok) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cornhole Golf</title></head>
  <body style="font-family: -apple-system, sans-serif; background: #111; color: #eee; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center;">
  <div><h1 style="color: ${ok ? '#4caf50' : '#e05252'}">${ok ? 'Verified' : 'Verification failed'}</h1><p>${escapeHtml(message)}</p></div>
  </body></html>`;
}

router.post('/auth/signup', signupLimiter, async (req, res) => {
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
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (existing && existing.claimed_at) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  if (existing) {
    // Claiming a placeholder someone added by name+email: keep the same id
    // so their game history and favorites carry over, but require proving
    // ownership of the email before the account can log in.
    db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?').run(
      passwordHash,
      name.trim(),
      existing.id
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
    await sendVerificationEmail(user);
    return res.status(202).json({ pendingVerification: true, email: user.email });
  }

  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, name, claimed_at) VALUES (?, ?, ?, datetime('now'))"
    )
    .run(normalizedEmail, passwordHash, name.trim());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createSession(user.id);
  res.status(201).json({ token, user: toPublicUser(user) });
});

router.post('/auth/resend-verification', resendLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  // Same response whether or not this email is actually mid-verification,
  // so the endpoint can't be used to probe who has an account.
  if (user && user.password_hash && !user.claimed_at) {
    await sendVerificationEmail(user);
  }
  res.status(202).json({ ok: true });
});

router.get('/auth/verify-email', (req, res) => {
  const { token } = req.query;
  const row =
    typeof token === 'string'
      ? db.prepare('SELECT * FROM email_verifications WHERE token = ?').get(token)
      : null;

  if (!row) {
    return res.status(400).send(verifyPage('This verification link is invalid or has expired.', false));
  }
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
    return res
      .status(400)
      .send(verifyPage('This verification link has expired. Request a new one from the app.', false));
  }

  db.prepare("UPDATE users SET claimed_at = datetime('now') WHERE id = ?").run(row.user_id);
  db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(row.user_id);
  res.send(verifyPage('Your email is verified — you can log in to Cornhole Golf now.', true));
});

router.post('/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.claimed_at) {
    return res
      .status(403)
      .json({ error: 'Please verify your email before logging in — check your inbox for a link.' });
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
